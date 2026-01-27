/**
 * File Operations Command
 * Provides file system operations: list files, copy, and move files
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const lstat = promisify(fs.lstat);
const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const execPromise = promisify(exec);

export class FileOperationsCommand implements ICommand {
  private progressCallback?: (
    current: number,
    total: number,
    fileName: string,
  ) => void;

  setProgressCallback(
    callback: (current: number, total: number, fileName: string) => void,
  ) {
    this.progressCallback = callback;
  }

  async execute(params: any): Promise<any> {
    const {
      operation,
      folderPath,
      sourcePath,
      destinationPath,
      filePath,
      command,
      workingDir,
    } = params;

    try {
      switch (operation) {
        case 'list':
          return await this.listFiles(folderPath);
        case 'drives':
          return await this.listDrives();
        case 'read':
          return await this.readFile(filePath);
        case 'copy':
          return await this.copyFile(sourcePath, destinationPath);
        case 'move':
          return await this.moveFile(sourcePath, destinationPath);
        case 'rename':
          return await this.renameFile(sourcePath, destinationPath);
        case 'delete':
          return await this.deleteFile(sourcePath);
        case 'execute-command':
          return await this.executeCommand(command, workingDir);
        case 'execute-file':
          return await this.executeFile(filePath);
        case 'compare':
          return await this.compareDirectories(
            params.leftPath,
            params.rightPath,
            params.recursive || false,
          );
        case 'zip':
          return await this.zipFiles(
            params.files,
            params.zipFilePath,
            this.progressCallback,
          );
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * List available drives (Windows)
   */
  private async listDrives(): Promise<any> {
    const drives: any[] = [];

    // Check drives A-Z
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const drivePath = `${letter}:\\`;

      try {
        if (fs.existsSync(drivePath)) {
          const stats = await stat(drivePath);
          drives.push({
            letter: letter,
            path: drivePath,
            label: `${letter}:`,
          });
        }
      } catch (error) {
        // Drive not accessible, skip
      }
    }

    return {
      success: true,
      operation: 'drives',
      drives: drives,
    };
  }

  /**
   * List files in a folder (or ZIP contents)
   */
  private async listFiles(folderPath: string): Promise<any> {
    if (!folderPath) {
      throw new Error('folderPath is required for list operation');
    }

    // Import ZipHelper dynamically to avoid circular dependencies
    const { ZipHelper } = await import('./zip-helper.js');

    // Check if this is a ZIP path (with internal path)
    const zipPath = ZipHelper.parsePath(folderPath);
    if (zipPath.isZipPath) {
      // List ZIP contents
      return ZipHelper.listZipContents(zipPath.zipFile, zipPath.internalPath);
    }

    // Check if the path itself is a ZIP file (for initial navigation)
    if (
      folderPath.toLowerCase().endsWith('.zip') &&
      fs.existsSync(folderPath)
    ) {
      const stats = await stat(folderPath);
      if (stats.isFile()) {
        // List root contents of the ZIP file
        return ZipHelper.listZipContents(folderPath, '');
      }
    }

    // Regular directory listing
    const absolutePath = path.resolve(folderPath);

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory does not exist: ${absolutePath}`);
    }

    // Check if it's actually a directory
    const stats = await stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    const entries = await readdir(absolutePath, { withFileTypes: true });

    const files: any[] = [];
    const directories: any[] = [];

    for (const entry of entries) {
      const fullPath = path.join(absolutePath, entry.name);

      try {
        const lstats = await lstat(fullPath);

        let stats = lstats;
        let isSymlink = lstats.isSymbolicLink();
        let linkTargetType: 'file' | 'directory' | null = null;

        if (isSymlink) {
          try {
            stats = await stat(fullPath); // folgt dem Link
            linkTargetType = stats.isDirectory() ? 'directory' : 'file';
          } catch {
            // broken symlink
            linkTargetType = null;
          }
        }

        const item = {
          name: entry.name,
          path: fullPath,
          size: stats.size,
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          isSymbolicLink: isSymlink,
          isDirectory: isSymlink
            ? linkTargetType === 'directory'
            : entry.isDirectory(),
          isFile: isSymlink ? linkTargetType === 'file' : entry.isFile(),
          linkTargetType, // 'file' | 'directory' | null
        };

        if (item.isDirectory) {
          directories.push(item);
        } else {
          files.push(item);
        }
      } catch (error: any) {
        console.warn(`Warning: Unable to access ${fullPath}: ${error.message}`);
      }
    }
    return {
      success: true,
      operation: 'list',
      path: absolutePath,
      totalItems: entries.length,
      directories: directories,
      files: files,
      summary: {
        totalFiles: files.length,
        totalDirectories: directories.length,
      },
    };
  }

  /**
   * Check if a file is an image based on extension
   */
  private isImageFile(filePath: string): boolean {
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
      '.ico',
    ];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }

  /**
   * Read a file's content (from disk or ZIP)
   */
  private async readFile(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required for read operation');
    }

    const { ZipHelper } = await import('./zip-helper.js');

    // Check if this is a ZIP path
    const zipPath = ZipHelper.parsePath(filePath);
    if (zipPath.isZipPath) {
      // Read from ZIP
      const isImage = this.isImageFile(zipPath.internalPath);

      if (isImage) {
        const buffer = ZipHelper.readFromZip(
          zipPath.zipFile,
          zipPath.internalPath,
          true,
        ) as Buffer;
        const base64 = buffer.toString('base64');
        const ext = path.extname(zipPath.internalPath).toLowerCase();

        let mimeType = 'image/jpeg';
        if (ext === '.png') mimeType = 'image/png';
        else if (ext === '.gif') mimeType = 'image/gif';
        else if (ext === '.bmp') mimeType = 'image/bmp';
        else if (ext === '.webp') mimeType = 'image/webp';
        else if (ext === '.svg') mimeType = 'image/svg+xml';
        else if (ext === '.ico') mimeType = 'image/x-icon';

        return {
          success: true,
          operation: 'read',
          path: filePath,
          content: `data:${mimeType};base64,${base64}`,
          size: buffer.length,
          modified: new Date().toISOString(),
          isImage: true,
        };
      } else {
        const content = ZipHelper.readFromZip(
          zipPath.zipFile,
          zipPath.internalPath,
          false,
        ) as string;
        return {
          success: true,
          operation: 'read',
          path: filePath,
          content: content,
          size: content.length,
          modified: new Date().toISOString(),
          isImage: false,
        };
      }
    }

    // Regular file reading
    const absolutePath = path.resolve(filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }

    // Check if it's a file
    const stats = await stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${absolutePath}`);
    }

    // Check if it's an image file
    const isImage = this.isImageFile(absolutePath);

    if (isImage) {
      // Read image as binary and convert to base64
      const buffer = await readFile(absolutePath);
      const base64 = buffer.toString('base64');
      const ext = path.extname(absolutePath).toLowerCase();

      // Determine MIME type
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.bmp') mimeType = 'image/bmp';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.ico') mimeType = 'image/x-icon';

      return {
        success: true,
        operation: 'read',
        path: absolutePath,
        content: `data:${mimeType};base64,${base64}`,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        isImage: true,
      };
    } else {
      // Read text file content
      const content = await readFile(absolutePath, 'utf-8');

      return {
        success: true,
        operation: 'read',
        path: absolutePath,
        content: content,
        size: stats.size,
        modified: stats.mtime.toISOString(),
        isImage: false,
      };
    }
  }

  /**
   * Copy a file or directory from source to destination (supports ZIP)
   */
  private async copyFile(
    sourcePath: string,
    destinationPath: string,
  ): Promise<any> {
    if (!sourcePath) {
      throw new Error('sourcePath is required for copy operation');
    }
    if (!destinationPath) {
      throw new Error('destinationPath is required for copy operation');
    }

    const { ZipHelper } = await import('./zip-helper.js');

    const sourceZip = ZipHelper.parsePath(sourcePath);
    const destZip = ZipHelper.parsePath(destinationPath);

    // Case 1: Copy FROM ZIP to regular file system
    if (sourceZip.isZipPath && !destZip.isZipPath) {
      const destPath = path.resolve(destinationPath);
      ZipHelper.extractFromZip(
        sourceZip.zipFile,
        sourceZip.internalPath,
        destPath,
      );

      const stats = await stat(destPath);
      return {
        success: true,
        operation: 'copy',
        source: sourcePath,
        destination: destPath,
        size: stats.size,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    }

    // Case 2: Copy TO ZIP from regular file system
    if (!sourceZip.isZipPath && destZip.isZipPath) {
      const sourceFilePath = path.resolve(sourcePath);
      ZipHelper.addToZip(destZip.zipFile, sourceFilePath, destZip.internalPath);

      return {
        success: true,
        operation: 'copy',
        source: sourceFilePath,
        destination: destinationPath,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    }

    // Case 3: ZIP to ZIP (extract then add)
    if (sourceZip.isZipPath && destZip.isZipPath) {
      // Create temp file
      const tempPath = path.join(
        require('os').tmpdir(),
        `temp_${Date.now()}_${path.basename(sourceZip.internalPath)}`,
      );
      ZipHelper.extractFromZip(
        sourceZip.zipFile,
        sourceZip.internalPath,
        tempPath,
      );
      ZipHelper.addToZip(destZip.zipFile, tempPath, destZip.internalPath);

      // Clean up temp file
      await unlink(tempPath);

      return {
        success: true,
        operation: 'copy',
        source: sourcePath,
        destination: destinationPath,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    }

    // Case 4: Regular file system copy
    const absoluteSource = path.resolve(sourcePath);
    const absoluteDestination = path.resolve(destinationPath);

    // Check if source exists
    if (!fs.existsSync(absoluteSource)) {
      throw new Error(`Source does not exist: ${absoluteSource}`);
    }

    const sourceStats = await stat(absoluteSource);

    if (sourceStats.isDirectory()) {
      // Copy directory recursively
      await this.copyDirectoryRecursive(absoluteSource, absoluteDestination);
      return {
        success: true,
        operation: 'copy',
        source: absoluteSource,
        destination: absoluteDestination,
        type: 'directory',
        timestamp: new Date().toISOString(),
      };
    } else if (sourceStats.isFile()) {
      // Create destination directory if it doesn't exist
      const destDir = path.dirname(absoluteDestination);
      if (!fs.existsSync(destDir)) {
        await mkdir(destDir, { recursive: true });
      }

      // Copy the file
      await copyFile(absoluteSource, absoluteDestination);

      const destStats = await stat(absoluteDestination);

      return {
        success: true,
        operation: 'copy',
        source: absoluteSource,
        destination: absoluteDestination,
        size: destStats.size,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    } else {
      throw new Error(
        `Source is neither a file nor a directory: ${absoluteSource}`,
      );
    }
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectoryRecursive(
    source: string,
    destination: string,
  ): Promise<void> {
    // Create destination directory
    if (!fs.existsSync(destination)) {
      await mkdir(destination, { recursive: true });
    }

    // Read directory contents
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      try {
        if (entry.isDirectory()) {
          // Recursively copy subdirectory
          await this.copyDirectoryRecursive(sourcePath, destPath);
        } else if (entry.isFile()) {
          // Copy file
          await copyFile(sourcePath, destPath);
        }
      } catch (error: any) {
        // Skip files that are locked or inaccessible
        console.warn(`Warning: Unable to copy ${sourcePath}: ${error.message}`);
        continue;
      }
    }
  }

  /**
   * Move a file or directory from source to destination
   */
  private async moveFile(
    sourcePath: string,
    destinationPath: string,
  ): Promise<any> {
    if (!sourcePath) {
      throw new Error('sourcePath is required for move operation');
    }
    if (!destinationPath) {
      throw new Error('destinationPath is required for move operation');
    }

    const absoluteSource = path.resolve(sourcePath);
    const absoluteDestination = path.resolve(destinationPath);

    // Check if source exists
    if (!fs.existsSync(absoluteSource)) {
      throw new Error(`Source does not exist: ${absoluteSource}`);
    }

    const sourceStats = await stat(absoluteSource);

    // Create destination parent directory if it doesn't exist
    const destDir = path.dirname(absoluteDestination);
    if (!fs.existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    // Use rename for both files and directories (works if on same filesystem)
    try {
      await rename(absoluteSource, absoluteDestination);

      if (sourceStats.isDirectory()) {
        return {
          success: true,
          operation: 'move',
          source: absoluteSource,
          destination: absoluteDestination,
          type: 'directory',
          timestamp: new Date().toISOString(),
        };
      } else {
        const destStats = await stat(absoluteDestination);
        return {
          success: true,
          operation: 'move',
          source: absoluteSource,
          destination: absoluteDestination,
          size: destStats.size,
          type: 'file',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      // If rename fails (cross-filesystem), fall back to copy + delete
      if (error.code === 'EXDEV') {
        if (sourceStats.isDirectory()) {
          await this.copyDirectoryRecursive(
            absoluteSource,
            absoluteDestination,
          );
          await this.deleteDirectoryRecursive(absoluteSource);
        } else {
          await copyFile(absoluteSource, absoluteDestination);
          await unlink(absoluteSource);
        }

        return {
          success: true,
          operation: 'move',
          source: absoluteSource,
          destination: absoluteDestination,
          type: sourceStats.isDirectory() ? 'directory' : 'file',
          timestamp: new Date().toISOString(),
        };
      }
      throw error;
    }
  }

  /**
   * Rename a file or directory
   */
  private async renameFile(sourcePath: string, newName: string): Promise<any> {
    if (!sourcePath) {
      throw new Error('sourcePath is required for rename operation');
    }
    if (!newName) {
      throw new Error('newName is required for rename operation');
    }

    const absoluteSource = path.resolve(sourcePath);

    // Check if source exists
    if (!fs.existsSync(absoluteSource)) {
      throw new Error(`Source does not exist: ${absoluteSource}`);
    }

    const sourceStats = await stat(absoluteSource);

    // Build destination path (same directory, new name)
    const sourceDir = path.dirname(absoluteSource);
    const absoluteDestination = path.join(sourceDir, newName);

    // Check if destination already exists
    if (fs.existsSync(absoluteDestination)) {
      throw new Error(`Destination already exists: ${absoluteDestination}`);
    }

    // Perform the rename
    await rename(absoluteSource, absoluteDestination);

    if (sourceStats.isDirectory()) {
      return {
        success: true,
        operation: 'rename',
        source: absoluteSource,
        destination: absoluteDestination,
        newName: newName,
        type: 'directory',
        timestamp: new Date().toISOString(),
      };
    } else {
      const destStats = await stat(absoluteDestination);
      return {
        success: true,
        operation: 'rename',
        source: absoluteSource,
        destination: absoluteDestination,
        newName: newName,
        size: destStats.size,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete a file or directory (supports ZIP)
   */
  private async deleteFile(sourcePath: string): Promise<any> {
    if (!sourcePath) {
      throw new Error('sourcePath is required for delete operation');
    }

    const { ZipHelper } = await import('./zip-helper.js');

    // Check if this is a ZIP path
    const zipPath = ZipHelper.parsePath(sourcePath);
    if (zipPath.isZipPath) {
      // Delete from ZIP
      ZipHelper.deleteFromZip(zipPath.zipFile, zipPath.internalPath);

      return {
        success: true,
        operation: 'delete',
        path: sourcePath,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    }

    // Regular file system delete
    const absolutePath = path.resolve(sourcePath);

    // Check if file/directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Path does not exist: ${absolutePath}`);
    }

    const stats = await stat(absolutePath);

    if (stats.isDirectory()) {
      // Delete directory recursively
      await this.deleteDirectoryRecursive(absolutePath);
      return {
        success: true,
        operation: 'delete',
        path: absolutePath,
        type: 'directory',
        timestamp: new Date().toISOString(),
      };
    } else if (stats.isFile()) {
      // Delete file
      await unlink(absolutePath);
      return {
        success: true,
        operation: 'delete',
        path: absolutePath,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    } else {
      throw new Error(
        `Path is neither a file nor a directory: ${absolutePath}`,
      );
    }
  }

  /**
   * Recursively delete a directory
   */
  private async deleteDirectoryRecursive(dirPath: string): Promise<void> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        await this.deleteDirectoryRecursive(fullPath);
      } else {
        await unlink(fullPath);
      }
    }

    await rmdir(dirPath);
  }

  /**
   * Compare two directories and return differences
   */
  private async compareDirectories(
    leftPath: string,
    rightPath: string,
    recursive: boolean,
  ): Promise<any> {
    if (!leftPath) {
      throw new Error('leftPath is required for compare operation');
    }
    if (!rightPath) {
      throw new Error('rightPath is required for compare operation');
    }

    const absoluteLeft = path.resolve(leftPath);
    const absoluteRight = path.resolve(rightPath);

    // Check if both directories exist
    if (!fs.existsSync(absoluteLeft)) {
      throw new Error(`Left directory does not exist: ${absoluteLeft}`);
    }
    if (!fs.existsSync(absoluteRight)) {
      throw new Error(`Right directory does not exist: ${absoluteRight}`);
    }

    const leftStats = await stat(absoluteLeft);
    const rightStats = await stat(absoluteRight);

    if (!leftStats.isDirectory()) {
      throw new Error(`Left path is not a directory: ${absoluteLeft}`);
    }
    if (!rightStats.isDirectory()) {
      throw new Error(`Right path is not a directory: ${absoluteRight}`);
    }

    // Get file lists from both directories
    const leftFiles = recursive
      ? await this.getFilesRecursive(absoluteLeft, absoluteLeft)
      : await this.getFilesInDirectory(absoluteLeft);

    const rightFiles = recursive
      ? await this.getFilesRecursive(absoluteRight, absoluteRight)
      : await this.getFilesInDirectory(absoluteRight);

    // Create maps for easy comparison
    const leftMap = new Map(leftFiles.map((f) => [f.relativePath, f]));
    const rightMap = new Map(rightFiles.map((f) => [f.relativePath, f]));

    // Find differences
    const onlyInLeft: any[] = [];
    const onlyInRight: any[] = [];
    const different: any[] = [];
    const identical: any[] = [];

    // Check files in left
    for (const [relPath, leftFile] of leftMap) {
      const rightFile = rightMap.get(relPath);

      if (!rightFile) {
        // File only in left
        onlyInLeft.push({
          path: relPath,
          leftPath: leftFile.fullPath,
          size: leftFile.size,
          modified: leftFile.modified,
          isDirectory: leftFile.isDirectory,
        });
      } else if (leftFile.isDirectory && rightFile.isDirectory) {
        // Both are directories - mark as identical
        identical.push({
          path: relPath,
          leftPath: leftFile.fullPath,
          rightPath: rightFile.fullPath,
          isDirectory: true,
        });
      } else if (leftFile.isDirectory || rightFile.isDirectory) {
        // One is directory, other is file
        different.push({
          path: relPath,
          leftPath: leftFile.fullPath,
          rightPath: rightFile.fullPath,
          leftSize: leftFile.size,
          rightSize: rightFile.size,
          leftModified: leftFile.modified,
          rightModified: rightFile.modified,
          leftIsDirectory: leftFile.isDirectory,
          rightIsDirectory: rightFile.isDirectory,
          reason: 'type',
        });
      } else {
        // Both are files - compare size first
        if (leftFile.size !== rightFile.size) {
          // Different sizes = definitely different
          different.push({
            path: relPath,
            leftPath: leftFile.fullPath,
            rightPath: rightFile.fullPath,
            leftSize: leftFile.size,
            rightSize: rightFile.size,
            leftModified: leftFile.modified,
            rightModified: rightFile.modified,
            reason: 'size',
          });
        } else if (leftFile.modified === rightFile.modified) {
          // Same size and time = identical
          identical.push({
            path: relPath,
            leftPath: leftFile.fullPath,
            rightPath: rightFile.fullPath,
            size: leftFile.size,
            modified: leftFile.modified,
            isDirectory: false,
          });
        } else {
          // Same size but different time - compare content
          const leftContent = fs.readFileSync(leftFile.fullPath);
          const rightContent = fs.readFileSync(rightFile.fullPath);

          if (leftContent.equals(rightContent)) {
            // Content is identical despite different timestamps
            identical.push({
              path: relPath,
              leftPath: leftFile.fullPath,
              rightPath: rightFile.fullPath,
              size: leftFile.size,
              modified: leftFile.modified,
              isDirectory: false,
            });
          } else {
            // Content is different
            different.push({
              path: relPath,
              leftPath: leftFile.fullPath,
              rightPath: rightFile.fullPath,
              leftSize: leftFile.size,
              rightSize: rightFile.size,
              leftModified: leftFile.modified,
              rightModified: rightFile.modified,
              reason: 'content',
            });
          }
        }
      }
    }

    // Check files only in right
    for (const [relPath, rightFile] of rightMap) {
      if (!leftMap.has(relPath)) {
        onlyInRight.push({
          path: relPath,
          rightPath: rightFile.fullPath,
          size: rightFile.size,
          modified: rightFile.modified,
          isDirectory: rightFile.isDirectory,
        });
      }
    }

    return {
      success: true,
      operation: 'compare',
      leftPath: absoluteLeft,
      rightPath: absoluteRight,
      recursive: recursive,
      summary: {
        totalLeft: leftFiles.length,
        totalRight: rightFiles.length,
        onlyInLeft: onlyInLeft.length,
        onlyInRight: onlyInRight.length,
        different: different.length,
        identical: identical.length,
      },
      onlyInLeft: onlyInLeft,
      onlyInRight: onlyInRight,
      different: different,
      identical: identical,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get all files in a directory (non-recursive)
   */
  private async getFilesInDirectory(dirPath: string): Promise<
    Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }>
  > {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }> = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      try {
        const stats = await stat(fullPath);
        files.push({
          relativePath: entry.name,
          fullPath: fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: entry.isDirectory(),
        });
      } catch (error: any) {
        console.warn(`Warning: Unable to access ${fullPath}: ${error.message}`);
        continue;
      }
    }

    return files;
  }

  /**
   * Get all files recursively in a directory
   */
  private async getFilesRecursive(
    dirPath: string,
    basePath: string,
  ): Promise<
    Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }>
  > {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }> = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      try {
        const stats = await stat(fullPath);
        files.push({
          relativePath: relativePath,
          fullPath: fullPath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          isDirectory: entry.isDirectory(),
        });

        // Recurse into subdirectories
        if (entry.isDirectory()) {
          const subFiles = await this.getFilesRecursive(fullPath, basePath);
          files.push(...subFiles);
        }
      } catch (error: any) {
        console.warn(`Warning: Unable to access ${fullPath}: ${error.message}`);
        continue;
      }
    }

    return files;
  }

  /**
   * Execute a command in a specific working directory
   */
  private async executeCommand(
    command: string,
    workingDir: string,
  ): Promise<any> {
    if (!command) {
      throw new Error('command is required for execute-command operation');
    }
    if (!workingDir) {
      throw new Error('workingDir is required for execute-command operation');
    }

    const absoluteWorkingDir = path.resolve(workingDir);

    // Check if working directory exists
    if (!fs.existsSync(absoluteWorkingDir)) {
      throw new Error(
        `Working directory does not exist: ${absoluteWorkingDir}`,
      );
    }

    try {
      // Execute the command with a timeout of 30 seconds
      const { stdout, stderr } = await execPromise(command, {
        cwd: absoluteWorkingDir,
        timeout: 30000,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        encoding: 'utf8',
      });

      // Combine stdout and stderr
      const output = stdout + (stderr ? '\n--- STDERR ---\n' + stderr : '');

      return {
        success: true,
        operation: 'execute-command',
        command: command,
        workingDir: absoluteWorkingDir,
        output: output || '(Kein Output)',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Command failed or timed out
      const output =
        (error.stdout || '') +
        (error.stderr ? '\n--- STDERR ---\n' + error.stderr : '');

      return {
        success: false,
        operation: 'execute-command',
        command: command,
        workingDir: absoluteWorkingDir,
        output: output || error.message,
        error: error.message,
        exitCode: error.code,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Zip files or folders into a ZIP archive
   */
  private async zipFiles(
    files: string[],
    zipFilePath: string,
    progressCallback?: (
      current: number,
      total: number,
      fileName: string,
    ) => void,
  ): Promise<any> {
    if (!files || files.length === 0) {
      throw new Error('files array is required for zip operation');
    }
    if (!zipFilePath) {
      throw new Error('zipFilePath is required for zip operation');
    }

    const { ZipHelper } = await import('./zip-helper.js');
    const AdmZip = (await import('adm-zip')).default;

    try {
      // Create or open the ZIP file
      const zip = fs.existsSync(zipFilePath)
        ? new AdmZip(zipFilePath)
        : new AdmZip();

      let addedCount = 0;
      const totalFiles = files.length;

      for (let i = 0; i < files.length; i++) {
        const filePath = files[i];
        const absolutePath = path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
          console.warn(`Skipping non-existent path: ${absolutePath}`);
          continue;
        }

        const stats = await stat(absolutePath);
        const fileName = path.basename(absolutePath);

        // Report progress
        if (progressCallback) {
          progressCallback(i + 1, totalFiles, fileName);
        }

        if (stats.isDirectory()) {
          // Add entire directory
          zip.addLocalFolder(absolutePath, fileName);
          addedCount++;
        } else if (stats.isFile()) {
          // Add single file
          zip.addLocalFile(absolutePath);
          addedCount++;
        }

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      if (addedCount === 0) {
        throw new Error('No valid files or directories to add to ZIP');
      }

      // Report final progress before writing
      if (progressCallback) {
        progressCallback(totalFiles, totalFiles, 'Writing ZIP file...');
      }

      // Write the ZIP file
      zip.writeZip(zipFilePath);

      const zipStats = await stat(zipFilePath);

      return {
        success: true,
        operation: 'zip',
        zipFile: zipFilePath,
        filesAdded: addedCount,
        totalFiles: files.length,
        size: zipStats.size,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to create ZIP: ${error.message}`);
    }
  }

  /**
   * Execute a file using the system's default application
   */
  private async executeFile(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required for execute-file operation');
    }

    const absolutePath = path.resolve(filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }

    const stats = await stat(absolutePath);
    if (!stats.isFile()) {
      throw new Error(`Path is not a file: ${absolutePath}`);
    }

    try {
      // Use 'start' on Windows to open file with default application
      // Wrap path in quotes to handle spaces
      const command =
        process.platform === 'win32'
          ? `start "" "${absolutePath}"`
          : process.platform === 'darwin'
            ? `open "${absolutePath}"`
            : `xdg-open "${absolutePath}"`;

      await execPromise(command, {
        timeout: 5000,
        windowsHide: true,
      });

      return {
        success: true,
        operation: 'execute-file',
        path: absolutePath,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'execute-file',
        path: absolutePath,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  getDescription(): string {
    return 'File operations: list, read, copy, move, rename, delete, zip, compare directories, execute commands - with ZIP archive support';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        type: 'select',
        description: 'Operation to perform',
        required: true,
        options: [
          'list',
          'drives',
          'read',
          'copy',
          'move',
          'rename',
          'delete',
          'zip',
          'compare',
          'execute-command',
          'execute-file',
        ],
      },
      {
        name: 'folderPath',
        type: 'string',
        description:
          'Path to folder or ZIP (for list operation). Supports: "C:\\folder" or "C:\\archive.zip/internal/path"',
        required: false,
      },
      {
        name: 'filePath',
        type: 'string',
        description:
          'Path to file (for read/execute-file operations). Supports ZIP paths: "C:\\archive.zip/file.txt"',
        required: false,
      },
      {
        name: 'sourcePath',
        type: 'string',
        description:
          'Source path (for copy/move/rename/delete operations). Supports ZIP paths for copy/delete',
        required: false,
      },
      {
        name: 'destinationPath',
        type: 'string',
        description:
          'Destination path (for copy/move/rename operations). Supports ZIP paths for copy',
        required: false,
      },
      {
        name: 'leftPath',
        type: 'string',
        description: 'Left directory path (for compare operation)',
        required: false,
      },
      {
        name: 'rightPath',
        type: 'string',
        description: 'Right directory path (for compare operation)',
        required: false,
      },
      {
        name: 'recursive',
        type: 'boolean',
        description:
          'Recursive comparison (for compare operation). Default: false',
        required: false,
      },
      {
        name: 'files',
        type: 'string',
        description:
          'JSON array of file/folder paths to add (for zip operation). Example: ["C:\\\\file1.txt", "C:\\\\folder"]',
        required: false,
      },
      {
        name: 'zipFilePath',
        type: 'string',
        description: 'Path to ZIP file to create (for zip operation)',
        required: false,
      },
      {
        name: 'command',
        type: 'string',
        description:
          'Command to execute (for execute-command operation). Example: "npm install"',
        required: false,
      },
      {
        name: 'workingDir',
        type: 'string',
        description:
          'Working directory for command execution (for execute-command operation)',
        required: false,
      },
    ];
  }
}
