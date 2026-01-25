/**
 * File Operations Command
 * Provides file system operations: list files, copy, and move files
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const rename = promisify(fs.rename);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);

export class FileOperationsCommand implements ICommand {
  async execute(params: any): Promise<any> {
    const { operation, folderPath, sourcePath, destinationPath, filePath } =
      params;

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
   * List files in a folder
   */
  private async listFiles(folderPath: string): Promise<any> {
    if (!folderPath) {
      throw new Error('folderPath is required for list operation');
    }

    // Resolve to absolute path
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

    // Read directory contents
    const entries = await readdir(absolutePath, { withFileTypes: true });

    const files = [];
    const directories = [];

    for (const entry of entries) {
      const fullPath = path.join(absolutePath, entry.name);

      try {
        const itemStats = await stat(fullPath);

        const item = {
          name: entry.name,
          path: fullPath,
          size: itemStats.size,
          created: itemStats.birthtime,
          modified: itemStats.mtime,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
        };

        if (entry.isDirectory()) {
          directories.push(item);
        } else {
          files.push(item);
        }
      } catch (error: any) {
        // Skip files that are locked, inaccessible, or have permission issues
        // This commonly occurs with system files like DumpStack.log.tmp on Windows
        console.warn(`Warning: Unable to access ${fullPath}: ${error.message}`);
        continue;
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
   * Read a file's content
   */
  private async readFile(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required for read operation');
    }

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
        modified: stats.mtime,
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
        modified: stats.mtime,
        isImage: false,
      };
    }
  }

  /**
   * Copy a file or directory from source to destination
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

  getDescription(): string {
    return 'File operations: list files in a folder, read, copy or move files between locations';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        type: 'select',
        description: 'Operation to perform',
        required: true,
        options: ['list', 'read', 'copy', 'move'],
      },
      {
        name: 'folderPath',
        type: 'string',
        description: 'Path to folder (for list operation)',
        required: false,
      },
      {
        name: 'filePath',
        type: 'string',
        description: 'Path to file (for read operation)',
        required: false,
      },
      {
        name: 'sourcePath',
        type: 'string',
        description: 'Source file path (for copy/move operations)',
        required: false,
      },
      {
        name: 'destinationPath',
        type: 'string',
        description: 'Destination file path (for copy/move operations)',
        required: false,
      },
    ];
  }
}
