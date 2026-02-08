/**
 * File Operations Command
 * Provides file system operations: list files, copy, and move files
 */

import { exec } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
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
  private cancelled: boolean = false;

  setProgressCallback(
    callback: (current: number, total: number, fileName: string) => void,
  ) {
    this.progressCallback = callback;
  }

  cancel() {
    this.cancelled = true;
    console.log('[FileOps] Operation cancelled');
  }

  resetCancellation() {
    this.cancelled = false;
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

    // Reset cancellation flag at the start of each operation
    this.resetCancellation();

    try {
      switch (operation) {
        case 'list':
          return await this.listFiles(folderPath);
        case 'drives':
          return await this.listDrives();
        case 'drive-info':
          return await this.getDriveInfo(params.drivePath);
        case 'read':
          return await this.readFile(filePath);
        case 'copy':
          return await this.copyFile(sourcePath, destinationPath);
        case 'move':
          return await this.moveFile(sourcePath, destinationPath);
        case 'rename':
          return await this.renameFile(sourcePath, destinationPath);
        case 'mkdir':
          return await this.createDirectory(params.dirPath);
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
            this.progressCallback,
          );
        case 'zip':
          return await this.zipFiles(
            params.files,
            params.zipFilePath,
            this.progressCallback,
          );
        case 'get-file-associations':
          return await this.getFileAssociations(filePath);
        case 'open-with-app':
          return await this.openWithApp(filePath, params.applicationCommand);
        case 'write-settings':
          return await this.writeSettings(params.content, params.filePath);
        case 'network-shares':
          return await this.listNetworkShares();
        case 'network-computers':
          return await this.listNetworkComputers();
        case 'browse-computer-shares':
          return await this.browseComputerShares(params.computerName);
        case 'directory-size':
          return await this.getDirectorySize(params.dirPath);
        case 'write-file':
          return await this.writeFile(params.filePath, params.content);
        case 'search':
          return await this.searchFiles(
            params.searchPath,
            params.filenamePattern || params.searchText, // backwards compatibility
            params.contentText || (params.searchByContent ? params.searchText : ''),
            params.recursive,
            params.caseSensitive,
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
   * Optimized: Skip A:/B: (floppy drives), use async checks, and check drives in parallel
   */
  private async listDrives(): Promise<any> {
    const drives: any[] = [];

    // Start from C (67) to skip A: and B: floppy drives which are slow to check
    const driveCheckPromises: Promise<{
      letter: string;
      path: string;
    } | null>[] = [];

    for (let i = 67; i <= 90; i++) {
      const letter = String.fromCharCode(i);
      const drivePath = `${letter}:\\`;

      // Check all drives in parallel using async access check
      driveCheckPromises.push(
        fs.promises
          .access(drivePath)
          .then(() => ({ letter, path: drivePath }))
          .catch(() => null),
      );
    }

    // Wait for all drive checks to complete in parallel
    const results = await Promise.all(driveCheckPromises);

    // Filter out null results (non-existent drives) and build the drives array
    for (const result of results) {
      if (result) {
        drives.push({
          letter: result.letter,
          path: result.path,
          label: `${result.letter}:`,
        });
      }
    }

    return {
      success: true,
      operation: 'drives',
      drives: drives,
    };
  }

  /**
   * Get drive info including free space for a given path
   * Cross-platform: Windows (PowerShell), Linux/Mac (df command)
   */
  private async getDriveInfo(drivePath: string): Promise<any> {
    if (!drivePath) {
      return { success: false, error: 'No drive path provided' };
    }

    try {
      if (process.platform === 'win32') {
        // Windows: Extract drive letter and use PowerShell
        const driveMatch = drivePath.match(/^([A-Za-z]:)/);
        if (!driveMatch) {
          // UNC path - no drive info available
          return {
            success: true,
            operation: 'drive-info',
            drivePath,
            freeSpace: null,
            totalSpace: null,
          };
        }

        const driveLetter = driveMatch[1].toUpperCase();
        const psCommand = `(Get-PSDrive -Name '${driveLetter.charAt(0)}' -ErrorAction SilentlyContinue | Select-Object @{N='Free';E={$_.Free}},@{N='Used';E={$_.Used}} | ConvertTo-Json)`;
        const { stdout } = await execPromise(
          `powershell -NoProfile -Command "${psCommand}"`,
          { encoding: 'utf8', timeout: 5000 },
        );

        const trimmed = stdout.trim();
        if (trimmed) {
          const data = JSON.parse(trimmed);
          const freeSpace = data.Free || 0;
          const usedSpace = data.Used || 0;
          const totalSpace = freeSpace + usedSpace;

          return {
            success: true,
            operation: 'drive-info',
            drivePath,
            driveLetter,
            freeSpace,
            totalSpace,
          };
        }
      } else {
        // Linux/Mac: Use df command
        // Escape single quotes in path for shell
        const escapedPath = drivePath.replace(/'/g, "'\\''");
        const { stdout } = await execPromise(
          `df -B1 '${escapedPath}' 2>/dev/null | tail -1`,
          { encoding: 'utf8', timeout: 5000 },
        );

        const trimmed = stdout.trim();
        if (trimmed) {
          // df output: Filesystem 1B-blocks Used Available Use% Mounted
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 4) {
            const totalSpace = parseInt(parts[1], 10) || 0;
            const freeSpace = parseInt(parts[3], 10) || 0;

            return {
              success: true,
              operation: 'drive-info',
              drivePath,
              freeSpace,
              totalSpace,
            };
          }
        }
      }

      return {
        success: true,
        operation: 'drive-info',
        drivePath,
        freeSpace: null,
        totalSpace: null,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get drive info',
      };
    }
  }

  /**
   * List connected network shares (Windows only)
   * Uses 'net use' command to get mapped network drives
   */
  private async listNetworkShares(): Promise<any> {
    if (process.platform !== 'win32') {
      return { success: true, operation: 'network-shares', shares: [] };
    }

    try {
      const { stdout } = await execPromise('net use', {
        encoding: 'utf8',
        timeout: 10000,
      });

      const shares: {
        name: string;
        remotePath: string;
        status: string;
      }[] = [];

      // Parse net use output
      // Format: Status       Local     Remote                    Network
      //         OK           Z:        \\server\share            Microsoft Windows Network
      const lines = stdout.split('\n');
      for (const line of lines) {
        // Match lines with network shares (starts with OK, Disconnected, etc.)
        const match = line.match(
          /^(OK|Disconnected|Unavailable)\s+([A-Z]:)?\s+(\\\\[^\s]+)/i,
        );
        if (match) {
          shares.push({
            status: match[1],
            name: match[2] || '', // Drive letter if mapped
            remotePath: match[3], // UNC path
          });
        }
      }

      return {
        success: true,
        operation: 'network-shares',
        shares,
      };
    } catch (error: any) {
      // net use might fail if no shares are connected
      return {
        success: true,
        operation: 'network-shares',
        shares: [],
      };
    }
  }

  /**
   * List computers visible on the network (Windows only)
   * Uses 'net view' command - can be slow on large networks
   */
  private async listNetworkComputers(): Promise<any> {
    if (process.platform !== 'win32') {
      return { success: true, operation: 'network-computers', computers: [] };
    }

    try {
      const { stdout } = await execPromise('net view', {
        encoding: 'utf8',
        timeout: 30000, // Network discovery can be slow
      });

      const computers: string[] = [];

      // Parse net view output
      // Format: \\COMPUTERNAME  Remark
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/^\\\\([^\s]+)/);
        if (match) {
          computers.push(match[1]);
        }
      }

      return {
        success: true,
        operation: 'network-computers',
        computers,
      };
    } catch (error: any) {
      // net view might fail if no network is available
      return {
        success: true,
        operation: 'network-computers',
        computers: [],
        error: error.message,
      };
    }
  }

  /**
   * Browse shares on a specific computer (Windows only)
   * Uses 'net view \\computername' command
   */
  private async browseComputerShares(computerName: string): Promise<any> {
    if (process.platform !== 'win32') {
      return { success: true, operation: 'browse-computer-shares', shares: [] };
    }

    if (!computerName) {
      return {
        success: false,
        error: 'computerName is required',
      };
    }

    try {
      // Ensure computer name has proper format
      const computer = computerName.replace(/^\\\\/, '');
      const { stdout } = await execPromise(`net view \\\\${computer}`, {
        encoding: 'utf8',
        timeout: 15000,
      });

      const shares: { name: string; type: string; remark: string }[] = [];

      // Parse net view \\computer output
      // Format: Share name      Type         Used as  Comment
      //         Documents       Disk
      //         Printers        Print
      const lines = stdout.split('\n');
      let inShareList = false;

      for (const line of lines) {
        // Start parsing after the header line (contains dashes)
        if (line.match(/^-+/)) {
          inShareList = true;
          continue;
        }
        if (inShareList && line.trim()) {
          // Parse share line: name, type, optional remark
          const match = line.match(/^([^\s]+)\s+(Disk|Print|IPC)\s*(.*)?$/i);
          if (match) {
            shares.push({
              name: match[1],
              type: match[2],
              remark: (match[3] || '').trim(),
            });
          }
        }
      }

      return {
        success: true,
        operation: 'browse-computer-shares',
        computerName: computer,
        shares,
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'browse-computer-shares',
        shares: [],
        error: error.message,
      };
    }
  }

  /**
   * Mount a network share on macOS and return the mount point
   * Converts \\computer\share to smb://computer/share and mounts it
   */
  private async mountNetworkShareOnMac(uncPath: string): Promise<{
    success: boolean;
    mountPoint?: string;
    error?: string;
  }> {
    try {
      // Convert UNC path to SMB URL
      // \\computer\share\subfolder -> smb://computer/share/subfolder
      const cleanPath = uncPath.replace(/^\\\\/, '').replace(/\\/g, '/');
      const pathParts = cleanPath.split('/');

      if (pathParts.length < 2) {
        return {
          success: false,
          error: 'Invalid UNC path format. Expected: \\\\computer\\share',
        };
      }

      const computer = pathParts[0];
      const share = pathParts[1];
      const subPath = pathParts.slice(2).join('/');

      // SMB URL for mounting
      const smbUrl = `smb://${computer}/${share}`;

      // Mount point will be at /Volumes/share
      const mountPoint = `/Volumes/${share}`;
      const fullPath = subPath ? `${mountPoint}/${subPath}` : mountPoint;

      // Check if already mounted
      if (fs.existsSync(mountPoint)) {
        console.log(`[Mac] Share already mounted at: ${mountPoint}`);
        return {
          success: true,
          mountPoint: fullPath,
        };
      }

      console.log(`[Mac] Mounting ${smbUrl} to ${mountPoint}`);

      // Use 'open' command to mount the share (prompts for credentials if needed)
      // This is user-friendly as it uses Finder's mount dialog
      try {
        await execPromise(`open "${smbUrl}"`, {
          timeout: 10000,
        });

        // Wait a bit for the mount to complete
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if mount succeeded
        if (fs.existsSync(mountPoint)) {
          console.log(`[Mac] Successfully mounted at: ${mountPoint}`);
          return {
            success: true,
            mountPoint: fullPath,
          };
        } else {
          return {
            success: false,
            error: 'Mount point not found after mounting attempt',
          };
        }
      } catch (error: any) {
        console.error(`[Mac] Mount error:`, error);
        return {
          success: false,
          error: `Failed to mount: ${error.message}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get total size of a directory including all files recursively
   */
  private async getDirectorySize(dirPath: string): Promise<any> {
    if (!dirPath) {
      throw new Error('dirPath is required for directory-size operation');
    }

    const absolutePath = path.resolve(dirPath);

    // Check if directory exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`Directory does not exist: ${absolutePath}`);
    }

    const stats = await stat(absolutePath);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    // Track progress state
    const progressState = { processedFiles: 0, totalSize: 0 };

    // Calculate size recursively with progress reporting
    const result = await this.calculateDirectorySizeRecursive(
      absolutePath,
      progressState,
    );

    return {
      success: true,
      operation: 'directory-size',
      path: absolutePath,
      totalSize: result.totalSize,
      fileCount: result.fileCount,
      directoryCount: result.directoryCount,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Recursively calculate directory size with progress reporting
   */
  private async calculateDirectorySizeRecursive(
    dirPath: string,
    progressState: { processedFiles: number; totalSize: number },
  ): Promise<{ totalSize: number; fileCount: number; directoryCount: number }> {
    let totalSize = 0;
    let fileCount = 0;
    let directoryCount = 0;

    try {
      const entries = await readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        // Check for cancellation before processing each entry
        if (this.cancelled) {
          throw new Error('Operation cancelled by user');
        }

        const fullPath = path.join(dirPath, entry.name);

        try {
          // Use stat to get file size and follow symlinks
          const fileStats = await stat(fullPath);

          // Check if directory - use both stat and Dirent for robustness
          const isDir =
            fileStats.isDirectory() ||
            entry.isDirectory() ||
            entry.name.startsWith('OneDrive '); // Windows OneDrive hack

          if (isDir) {
            directoryCount++;
            const subResult = await this.calculateDirectorySizeRecursive(
              fullPath,
              progressState,
            );
            totalSize += subResult.totalSize;
            fileCount += subResult.fileCount;
            directoryCount += subResult.directoryCount;
          } else {
            // If not a directory, count as file and add its size
            totalSize += fileStats.size;
            fileCount++;
            progressState.processedFiles++;
            progressState.totalSize += fileStats.size;

            // Report progress every file
            if (this.progressCallback) {
              this.progressCallback(
                progressState.processedFiles,
                progressState.totalSize,
                entry.name,
              );
            }
          }
        } catch (error: any) {
          // Skip files that are locked or inaccessible
          continue;
        }
      }
    } catch (error: any) {
      // Skip directories that can't be read
    }

    return { totalSize, fileCount, directoryCount };
  }

  /**
   * List files in a folder (or ZIP contents)
   */
  private async listFiles(folderPath: string): Promise<any> {
    if (!folderPath) {
      throw new Error('folderPath is required for list operation');
    }

    // On macOS, handle UNC paths (\\computer\share) by mounting them
    if (process.platform === 'darwin' && folderPath.startsWith('\\\\')) {
      const mountResult = await this.mountNetworkShareOnMac(folderPath);
      if (mountResult.success && mountResult.mountPoint) {
        // Use the mount point instead of the UNC path
        folderPath = mountResult.mountPoint;
      } else {
        throw new Error(
          `Failed to mount network share: ${mountResult.error || 'Unknown error'}`,
        );
      }
    }

    // Import ZipHelper dynamically to avoid circular dependencies
    const { ZipHelper } = await import('./zip-helper.js');

    // Check if this is a ZIP path (with internal path)
    const zipPath = ZipHelper.parsePath(folderPath);
    if (zipPath.isZipPath) {
      // Handle nested ZIP if needed
      if (zipPath.isNestedZip) {
        console.log('[ListFiles] Nested ZIP detected:', {
          folderPath,
          zipFile: zipPath.zipFile,
          internalPath: zipPath.internalPath,
          nestedZips: zipPath.nestedZips,
        });

        const resolved = (ZipHelper as any).resolveNestedZipPath(zipPath);
        console.log('[ListFiles] Resolved nested ZIP:', {
          finalZipPath: resolved.finalZipPath,
          finalInternalPath: resolved.finalInternalPath,
          tempPaths: resolved.tempPaths,
        });

        try {
          const result = ZipHelper.listZipContents(
            resolved.finalZipPath,
            resolved.finalInternalPath,
          );

          console.log('[ListFiles] Raw result from listZipContents:', {
            path: result.path,
            filesCount: result.files.length,
            dirsCount: result.directories.length,
            sampleFilePath: result.files[0]?.path,
            sampleDirPath: result.directories[0]?.path,
          });

          // Replace temp paths with original user paths
          result.path = folderPath;

          // Fix file and directory paths to use original path
          // Normalize to forward slashes for consistency
          const normalizedFolder = folderPath.replace(/\\/g, '/');
          const pathPrefix = normalizedFolder.endsWith('/')
            ? normalizedFolder
            : normalizedFolder + '/';

          console.log('[ListFiles] Path prefix:', pathPrefix);

          for (const file of result.files) {
            // Extract just the filename from the temp path
            // The temp path is like: tempDir/inner.zip/file.txt
            // We want to get just file.txt
            const parts = file.path.split('/');
            const fileName = parts[parts.length - 1];
            file.path = pathPrefix + fileName;
          }
          for (const dir of result.directories) {
            // Extract just the directory name from the temp path
            const parts = dir.path.split('/');
            const dirName = parts[parts.length - 1];
            dir.path = pathPrefix + dirName;
          }

          console.log('[ListFiles] Fixed paths:', {
            sampleFilePath: result.files[0]?.path,
            sampleDirPath: result.directories[0]?.path,
          });

          // Clean up temp files after listing
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
          return result;
        } catch (error) {
          console.error('[ListFiles] Error in nested ZIP handling:', error);
          // Clean up on error
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
          throw error;
        }
      }
      // Regular ZIP (not nested)
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
            : entry.isDirectory() || entry.name.startsWith('OneDrive '), // hack because stats doesnt recognize strange OneDrive links on Windows
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
      // Handle nested ZIP if needed
      let actualZipFile = zipPath.zipFile;
      let actualInternalPath = zipPath.internalPath;
      let tempPaths: string[] = [];

      if (zipPath.isNestedZip) {
        const resolved = (ZipHelper as any).resolveNestedZipPath(zipPath);
        actualZipFile = resolved.finalZipPath;
        actualInternalPath = resolved.finalInternalPath;
        tempPaths = resolved.tempPaths;
      }

      try {
        // Read from ZIP
        const isImage = this.isImageFile(actualInternalPath);

        if (isImage) {
          const buffer = ZipHelper.readFromZip(
            actualZipFile,
            actualInternalPath,
            true,
          ) as Buffer;
          const base64 = buffer.toString('base64');
          const ext = path.extname(actualInternalPath).toLowerCase();

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
            actualZipFile,
            actualInternalPath,
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
      } finally {
        // Clean up temp files
        if (tempPaths.length > 0) {
          (ZipHelper as any).cleanupTempPaths(tempPaths);
        }
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

      // Handle nested source ZIP
      if (sourceZip.isNestedZip) {
        const resolved = (ZipHelper as any).resolveNestedZipPath(sourceZip);
        try {
          ZipHelper.extractFromZip(
            resolved.finalZipPath,
            resolved.finalInternalPath,
            destPath,
          );
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
        } catch (error) {
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
          throw error;
        }
      } else {
        ZipHelper.extractFromZip(
          sourceZip.zipFile,
          sourceZip.internalPath,
          destPath,
        );
      }

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

      // Handle nested dest ZIP
      if (destZip.isNestedZip) {
        const resolved = (ZipHelper as any).resolveNestedZipPath(destZip);
        try {
          // Add to the innermost ZIP
          ZipHelper.addToZip(
            resolved.finalZipPath,
            sourceFilePath,
            resolved.finalInternalPath,
          );

          // Now we need to update all the parent ZIPs with the modified inner ZIP
          // Work backwards through the nested ZIPs
          for (let i = destZip.nestedZips.length - 1; i >= 0; i--) {
            const nestedZipName = destZip.nestedZips[i];

            // Determine parent ZIP path
            let parentZip: string;
            if (i === 0) {
              // First level: parent is the original outer ZIP
              parentZip = destZip.zipFile;
            } else {
              // Deeper levels: parent is in temp directory
              parentZip = path.join(
                resolved.tempPaths[i - 1],
                destZip.nestedZips[i - 1],
              );
            }

            // Determine current ZIP path (the one to add to parent)
            let currentZip: string;
            if (i === destZip.nestedZips.length - 1) {
              // This is the innermost (last) ZIP - use the final modified one
              currentZip = resolved.finalZipPath;
            } else {
              // This is an intermediate ZIP - it's in temp directory
              currentZip = path.join(
                resolved.tempPaths[i],
                destZip.nestedZips[i],
              );
            }

            console.log(
              `[Copy] Updating nested ZIP ${i}: parent=${parentZip}, current=${currentZip}, name=${nestedZipName}`,
            );

            // Update the nested ZIP in its parent
            ZipHelper.addToZip(parentZip, currentZip, nestedZipName);
          }
          // Now we need to update all the parent ZIPs with the modified inner ZIP
          // Work backwards through the nested ZIPs
          for (let i = destZip.nestedZips.length - 1; i >= 0; i--) {
            const nestedZipName = destZip.nestedZips[i];

            // Determine parent ZIP path
            let parentZip: string;
            if (i === 0) {
              // First level: parent is the original outer ZIP
              parentZip = destZip.zipFile;
            } else {
              // Deeper levels: parent is in temp directory
              parentZip = path.join(
                resolved.tempPaths[i - 1],
                destZip.nestedZips[i - 1],
              );
            }

            // Determine current ZIP path (the one to add to parent)
            let currentZip: string;
            if (i === destZip.nestedZips.length - 1) {
              // This is the innermost (last) ZIP - use the final modified one
              currentZip = resolved.finalZipPath;
            } else {
              // This is an intermediate ZIP - it's in temp directory
              currentZip = path.join(
                resolved.tempPaths[i],
                destZip.nestedZips[i],
              );
            }

            console.log(
              `[Copy] Updating nested ZIP ${i}: parent=${parentZip}, current=${currentZip}, name=${nestedZipName}`,
            );

            // Update the nested ZIP in its parent
            ZipHelper.addToZip(parentZip, currentZip, nestedZipName);
          }

          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
        } catch (error) {
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
          throw error;
        }
      } else {
        ZipHelper.addToZip(
          destZip.zipFile,
          sourceFilePath,
          destZip.internalPath,
        );
      }

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
        os.tmpdir(),
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
      // Count total files for progress tracking
      const totalFiles = await this.countFilesRecursive(absoluteSource);
      let currentFile = 0;

      console.log(
        `[Copy] Starting directory copy: ${totalFiles} files, callback set: ${!!this.progressCallback}`,
      );

      // Copy directory recursively with progress tracking
      await this.copyDirectoryRecursive(
        absoluteSource,
        absoluteDestination,
        (fileName: string) => {
          currentFile++;
          if (this.progressCallback) {
            this.progressCallback(currentFile, totalFiles, fileName);
          }
        },
      );
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

      console.log(
        `[Copy] Starting file copy, callback set: ${!!this.progressCallback}`,
      );

      // Report progress for single file copy
      if (this.progressCallback) {
        this.progressCallback(0, 1, path.basename(absoluteSource));
      }

      // Copy the file
      await copyFile(absoluteSource, absoluteDestination);

      // Report completion
      if (this.progressCallback) {
        this.progressCallback(1, 1, path.basename(absoluteSource));
      }

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
   * Count total files in a directory recursively
   */
  private async countFilesRecursive(source: string): Promise<number> {
    let count = 0;

    try {
      const entries = await readdir(source, { withFileTypes: true });

      for (const entry of entries) {
        const sourcePath = path.join(source, entry.name);

        try {
          if (entry.isDirectory()) {
            count += await this.countFilesRecursive(sourcePath);
          } else if (entry.isFile()) {
            count++;
          }
        } catch (error: any) {
          // Skip files that are locked or inaccessible
          console.warn(
            `Warning: Unable to access ${sourcePath}: ${error.message}`,
          );
          continue;
        }
      }
    } catch (error: any) {
      console.warn(
        `Warning: Unable to read directory ${source}: ${error.message}`,
      );
    }

    return count;
  }

  /**
   * Recursively copy a directory
   */
  private async copyDirectoryRecursive(
    source: string,
    destination: string,
    onFileCopied?: (fileName: string) => void,
  ): Promise<void> {
    // Check for cancellation
    if (this.cancelled) {
      throw new Error('Operation cancelled by user');
    }

    // Create destination directory
    if (!fs.existsSync(destination)) {
      await mkdir(destination, { recursive: true });
    }

    // Read directory contents
    const entries = await readdir(source, { withFileTypes: true });

    for (const entry of entries) {
      // Check for cancellation before processing each file
      if (this.cancelled) {
        throw new Error('Operation cancelled by user');
      }

      const sourcePath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      try {
        if (entry.isDirectory()) {
          // Recursively copy subdirectory
          await this.copyDirectoryRecursive(sourcePath, destPath, onFileCopied);
        } else if (entry.isFile()) {
          // Copy file
          await copyFile(sourcePath, destPath);

          // Report progress
          if (onFileCopied) {
            onFileCopied(entry.name);
          }

          // Small delay to allow UI to update
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      } catch (error: any) {
        // Re-throw cancellation errors
        if (error.message === 'Operation cancelled by user') {
          throw error;
        }
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
   * Create a new directory
   */
  private async createDirectory(dirPath: string): Promise<any> {
    if (!dirPath) {
      throw new Error('dirPath is required for mkdir operation');
    }

    const absolutePath = path.resolve(dirPath);

    // Check if directory already exists
    if (fs.existsSync(absolutePath)) {
      throw new Error(`Directory already exists: ${absolutePath}`);
    }

    // Create the directory
    await mkdir(absolutePath, { recursive: true });

    return {
      success: true,
      operation: 'mkdir',
      path: absolutePath,
      timestamp: new Date().toISOString(),
    };
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
      // Handle nested ZIP deletion
      if (zipPath.isNestedZip) {
        const resolved = (ZipHelper as any).resolveNestedZipPath(zipPath);
        try {
          // Delete from the innermost ZIP
          ZipHelper.deleteFromZip(
            resolved.finalZipPath,
            resolved.finalInternalPath,
          );

          // Update all parent ZIPs with the modified inner ZIP
          for (let i = zipPath.nestedZips.length - 1; i >= 0; i--) {
            const nestedZipName = zipPath.nestedZips[i];

            // The parent is either the original outer ZIP or a temp extracted ZIP
            const parentZip =
              i === 0
                ? zipPath.zipFile
                : resolved.tempPaths[i - 1] +
                  path.sep +
                  path.basename(zipPath.nestedZips[i - 1]);

            // The current ZIP to add back is either the final modified one or an intermediate temp one
            const currentZip =
              i === zipPath.nestedZips.length - 1
                ? resolved.finalZipPath
                : resolved.tempPaths[i] +
                  path.sep +
                  path.basename(zipPath.nestedZips[i]);

            // Update the nested ZIP in its parent
            ZipHelper.addToZip(parentZip, currentZip, nestedZipName);
          }

          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
        } catch (error) {
          (ZipHelper as any).cleanupTempPaths(resolved.tempPaths);
          throw error;
        }
      } else {
        // Regular ZIP deletion
        ZipHelper.deleteFromZip(zipPath.zipFile, zipPath.internalPath);
      }

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
   * Supports comparing regular directory (left) with ZIP directory (right)
   */
  private async compareDirectories(
    leftPath: string,
    rightPath: string,
    recursive: boolean,
    progressCallback?: (
      current: number,
      total: number,
      fileName: string,
    ) => void,
  ): Promise<any> {
    if (!leftPath) {
      throw new Error('leftPath is required for compare operation');
    }
    if (!rightPath) {
      throw new Error('rightPath is required for compare operation');
    }

    const { ZipHelper } = await import('./zip-helper.js');

    // Check if right path is a ZIP path
    const rightZipPath = ZipHelper.parsePath(rightPath);
    const isRightZip =
      rightZipPath.isZipPath ||
      (rightPath.toLowerCase().endsWith('.zip') && fs.existsSync(rightPath));

    const absoluteLeft = path.resolve(leftPath);

    // Check if left directory exists
    if (!fs.existsSync(absoluteLeft)) {
      throw new Error(`Left directory does not exist: ${absoluteLeft}`);
    }

    const leftStats = await stat(absoluteLeft);
    if (!leftStats.isDirectory()) {
      throw new Error(`Left path is not a directory: ${absoluteLeft}`);
    }

    // Get file lists from both directories
    const leftFiles = recursive
      ? await this.getFilesRecursive(absoluteLeft, absoluteLeft)
      : await this.getFilesInDirectory(absoluteLeft);

    let rightFiles: Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }>;
    let absoluteRight: string;

    if (isRightZip) {
      // Get files from ZIP
      const zipFile = rightZipPath.isZipPath ? rightZipPath.zipFile : rightPath;
      const internalPath = rightZipPath.isZipPath
        ? rightZipPath.internalPath
        : '';
      absoluteRight = rightZipPath.isZipPath ? rightPath : zipFile;

      rightFiles = recursive
        ? await this.getFilesFromZipRecursive(zipFile, internalPath)
        : await this.getFilesFromZipDirectory(zipFile, internalPath);
    } else {
      // Regular directory
      absoluteRight = path.resolve(rightPath);

      if (!fs.existsSync(absoluteRight)) {
        throw new Error(`Right directory does not exist: ${absoluteRight}`);
      }

      const rightStats = await stat(absoluteRight);
      if (!rightStats.isDirectory()) {
        throw new Error(`Right path is not a directory: ${absoluteRight}`);
      }

      rightFiles = recursive
        ? await this.getFilesRecursive(absoluteRight, absoluteRight)
        : await this.getFilesInDirectory(absoluteRight);
    }

    // Normalize all relative paths to use forward slashes for consistent comparison
    const normalizePath = (p: string) => p.replace(/\\/g, '/');

    // Create maps for easy comparison (using normalized paths as keys)
    const leftMap = new Map(
      leftFiles.map((f) => [normalizePath(f.relativePath), f]),
    );
    const rightMap = new Map(
      rightFiles.map((f) => [normalizePath(f.relativePath), f]),
    );

    // Find differences
    const onlyInLeft: any[] = [];
    const onlyInRight: any[] = [];
    const different: any[] = [];
    const identical: any[] = [];

    // Check files in left with progress reporting
    const totalFiles = leftMap.size + rightMap.size;
    let currentFile = 0;

    for (const [relPath, leftFile] of leftMap) {
      currentFile++;
      if (progressCallback) {
        progressCallback(currentFile, totalFiles, relPath);
      }

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
        } else {
          // Same size - always do binary compare (don't trust timestamps alone)
          // This handles size=0 files correctly and catches cases where
          // timestamps are preserved during copies but content differs
          try {
            const leftContent = fs.readFileSync(leftFile.fullPath);

            // Read right content - either from ZIP or filesystem
            let rightContent: Buffer;
            if (isRightZip) {
              const rightZip = ZipHelper.parsePath(rightFile.fullPath);
              rightContent = ZipHelper.readFromZip(
                rightZip.zipFile,
                rightZip.internalPath,
                true,
              ) as Buffer;
            } else {
              rightContent = fs.readFileSync(rightFile.fullPath);
            }

            if (leftContent.equals(rightContent)) {
              // Content is identical
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
          } catch (readError: any) {
            // Could not read file for binary comparison (e.g., ASAR, locked, permission denied)
            // Mark as different since we can't verify content
            different.push({
              path: relPath,
              leftPath: leftFile.fullPath,
              rightPath: rightFile.fullPath,
              leftSize: leftFile.size,
              rightSize: rightFile.size,
              leftModified: leftFile.modified,
              rightModified: rightFile.modified,
              reason: 'unreadable',
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
   * Get files from a ZIP directory (non-recursive)
   */
  private async getFilesFromZipDirectory(
    zipFilePath: string,
    internalPath: string,
  ): Promise<
    Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }>
  > {
    const { ZipHelper } = await import('./zip-helper.js');
    const result = ZipHelper.listZipContents(zipFilePath, internalPath);

    const files: Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }> = [];

    // Add directories
    for (const dir of result.directories) {
      files.push({
        relativePath: dir.name,
        fullPath: dir.path,
        size: 0,
        modified: dir.modified,
        isDirectory: true,
      });
    }

    // Add files
    for (const file of result.files) {
      files.push({
        relativePath: file.name,
        fullPath: file.path,
        size: file.size,
        modified: file.modified,
        isDirectory: false,
      });
    }

    return files;
  }

  /**
   * Get files from a ZIP directory recursively
   */
  private async getFilesFromZipRecursive(
    zipFilePath: string,
    internalPath: string,
  ): Promise<
    Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }>
  > {
    const { ZipHelper } = await import('./zip-helper.js');
    const AdmZip = (await import('adm-zip')).default;

    if (!fs.existsSync(zipFilePath)) {
      throw new Error(`ZIP file does not exist: ${zipFilePath}`);
    }

    const zip = new AdmZip(zipFilePath);
    const entries = zip.getEntries();

    const files: Array<{
      relativePath: string;
      fullPath: string;
      size: number;
      modified: string;
      isDirectory: boolean;
    }> = [];

    // Normalize internal path
    const normalizedInternal = internalPath
      ? internalPath.replace(/\\/g, '/').replace(/\/$/, '')
      : '';
    const prefix = normalizedInternal ? normalizedInternal + '/' : '';

    for (const entry of entries) {
      const entryPath = entry.entryName.replace(/\\/g, '/');

      // Skip if not in current folder
      if (normalizedInternal && !entryPath.startsWith(prefix)) {
        continue;
      }

      // Get relative path from current folder
      const relativePath = normalizedInternal
        ? entryPath.substring(prefix.length)
        : entryPath;

      // Skip if empty (we're at the current folder itself)
      if (!relativePath) {
        continue;
      }

      // Remove trailing slash for directories
      const cleanRelativePath = relativePath.replace(/\/$/, '');
      if (!cleanRelativePath) continue;

      const fullInternalPath = normalizedInternal
        ? `${normalizedInternal}/${cleanRelativePath}`
        : cleanRelativePath;

      files.push({
        relativePath: cleanRelativePath,
        fullPath: `${zipFilePath}/${fullInternalPath}`,
        size: entry.header.size,
        modified: entry.header.time.toISOString(),
        isDirectory: entry.isDirectory,
      });
    }

    return files;
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
   * Recursively collect all files in a directory
   */
  private async collectFilesRecursively(
    dirPath: string,
    basePath: string,
  ): Promise<Array<{ fullPath: string; relativePath: string }>> {
    const results: Array<{ fullPath: string; relativePath: string }> = [];
    const entries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(basePath, fullPath);

      try {
        if (entry.isDirectory()) {
          // Recurse into subdirectory
          const subFiles = await this.collectFilesRecursively(
            fullPath,
            basePath,
          );
          results.push(...subFiles);
        } else if (entry.isFile()) {
          // Add file to results
          results.push({ fullPath, relativePath });
        }
      } catch (error: any) {
        console.warn(`Warning: Unable to access ${fullPath}: ${error.message}`);
        continue;
      }
    }

    return results;
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
      // First, collect all files recursively to know the total count
      const allFiles: Array<{
        fullPath: string;
        zipPath: string;
        displayName: string;
      }> = [];

      for (const filePath of files) {
        const absolutePath = path.resolve(filePath);

        if (!fs.existsSync(absolutePath)) {
          console.warn(`Skipping non-existent path: ${absolutePath}`);
          continue;
        }

        const stats = await stat(absolutePath);
        const baseName = path.basename(absolutePath);

        if (stats.isDirectory()) {
          // Collect all files in directory recursively
          const collectedFiles = await this.collectFilesRecursively(
            absolutePath,
            absolutePath,
          );
          for (const file of collectedFiles) {
            allFiles.push({
              fullPath: file.fullPath,
              zipPath: path.join(baseName, file.relativePath),
              displayName: file.relativePath,
            });
          }
        } else if (stats.isFile()) {
          // Single file
          allFiles.push({
            fullPath: absolutePath,
            zipPath: baseName,
            displayName: baseName,
          });
        }
      }

      if (allFiles.length === 0) {
        throw new Error('No valid files or directories to add to ZIP');
      }

      // Create or open the ZIP file
      const zip = fs.existsSync(zipFilePath)
        ? new AdmZip(zipFilePath)
        : new AdmZip();

      // Now add each file individually with progress reporting
      const totalFiles = allFiles.length;
      let addedCount = 0;

      for (let i = 0; i < allFiles.length; i++) {
        // Check for cancellation before processing each file
        if (this.cancelled) {
          throw new Error('Operation cancelled by user');
        }

        const file = allFiles[i];

        // Report progress
        if (progressCallback) {
          progressCallback(i + 1, totalFiles, file.displayName);
        }

        try {
          // Read file content and add to zip
          const fileContent = fs.readFileSync(file.fullPath);
          zip.addFile(file.zipPath.replace(/\\/g, '/'), fileContent);
          addedCount++;
        } catch (error: any) {
          // Re-throw cancellation errors
          if (error.message === 'Operation cancelled by user') {
            throw error;
          }
          console.warn(
            `Warning: Unable to add ${file.fullPath}: ${error.message}`,
          );
          continue;
        }

        // Small delay to allow UI updates
        await new Promise((resolve) => setTimeout(resolve, 5));
      }

      if (addedCount === 0) {
        throw new Error('No files could be added to ZIP');
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
        totalFiles: allFiles.length,
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

  /**
   * Get file associations for a given file (Windows registry query)
   */
  private async getFileAssociations(filePath: string): Promise<any> {
    if (!filePath) {
      throw new Error(
        'filePath is required for get-file-associations operation',
      );
    }

    const absolutePath = path.resolve(filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }

    const ext = path.extname(absolutePath).toLowerCase();

    if (!ext) {
      return {
        success: true,
        operation: 'get-file-associations',
        filePath: absolutePath,
        extension: '',
        applications: [],
      };
    }

    const applications: Array<{
      name: string;
      command: string;
      isDefault: boolean;
    }> = [];

    try {
      // On Windows, query registry for file associations
      if (process.platform === 'win32') {
        // Query file type from extension
        try {
          const { stdout: fileTypeOutput } = await execPromise(
            `reg query HKCR\\${ext} /ve`,
            { encoding: 'utf8' },
          );

          const fileTypeMatch = fileTypeOutput.match(/REG_SZ\s+(.+)/);
          const fileType = fileTypeMatch ? fileTypeMatch[1].trim() : null;

          if (fileType) {
            // Query shell commands for this file type
            try {
              const { stdout: shellOutput } = await execPromise(
                `reg query HKCR\\${fileType}\\shell`,
                { encoding: 'utf8' },
              );

              // Parse shell verbs (Open, Edit, etc.)
              const verbMatches = shellOutput.matchAll(
                /HKEY_CLASSES_ROOT\\[^\\]+\\shell\\(.+)/g,
              );

              for (const match of verbMatches) {
                const verb = match[1];

                try {
                  // Get the command for this verb
                  const { stdout: commandOutput } = await execPromise(
                    `reg query "HKCR\\${fileType}\\shell\\${verb}\\command" /ve`,
                    { encoding: 'utf8' },
                  );

                  const commandMatch = commandOutput.match(/REG_SZ\s+(.+)/);
                  if (commandMatch) {
                    const command = commandMatch[1].trim();
                    applications.push({
                      name: verb.charAt(0).toUpperCase() + verb.slice(1),
                      command: command,
                      isDefault: verb.toLowerCase() === 'open',
                    });
                  }
                } catch (error) {
                  // Skip if command query fails
                  continue;
                }
              }
            } catch (error) {
              // No shell commands found
            }
          }
        } catch (error) {
          // Extension not registered
        }

        // Add common fallback applications based on file type
        const fallbacks = this.getCommonApplications(ext);
        for (const fallback of fallbacks) {
          // Check if application exists
          try {
            await execPromise(`where "${fallback.exe}"`, { encoding: 'utf8' });

            // Don't add if already in list
            if (
              !applications.some((app) =>
                app.command.toLowerCase().includes(fallback.exe.toLowerCase()),
              )
            ) {
              applications.push({
                name: fallback.name,
                command: `"${fallback.exe}" "%1"`,
                isDefault: false,
              });
            }
          } catch (error) {
            // Application not found in PATH
          }
        }
      }

      return {
        success: true,
        operation: 'get-file-associations',
        filePath: absolutePath,
        extension: ext,
        applications: applications,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'get-file-associations',
        filePath: absolutePath,
        extension: ext,
        error: error.message,
        applications: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get common applications for specific file extensions
   */
  private getCommonApplications(
    ext: string,
  ): Array<{ name: string; exe: string }> {
    const commonApps: { [key: string]: Array<{ name: string; exe: string }> } =
      {
        '.txt': [
          { name: 'Notepad', exe: 'notepad.exe' },
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
        ],
        '.log': [
          { name: 'Notepad', exe: 'notepad.exe' },
          { name: 'Visual Studio Code', exe: 'code' },
        ],
        '.json': [
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
        ],
        '.xml': [
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
        ],
        '.js': [
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
        ],
        '.ts': [{ name: 'Visual Studio Code', exe: 'code' }],
        '.html': [
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
          { name: 'Microsoft Edge', exe: 'msedge.exe' },
        ],
        '.css': [
          { name: 'Visual Studio Code', exe: 'code' },
          { name: 'Notepad++', exe: 'notepad++.exe' },
        ],
        '.jpg': [
          { name: 'Paint', exe: 'mspaint.exe' },
          { name: 'Microsoft Photos', exe: 'ms-photos:' },
        ],
        '.jpeg': [
          { name: 'Paint', exe: 'mspaint.exe' },
          { name: 'Microsoft Photos', exe: 'ms-photos:' },
        ],
        '.png': [
          { name: 'Paint', exe: 'mspaint.exe' },
          { name: 'Microsoft Photos', exe: 'ms-photos:' },
        ],
        '.gif': [{ name: 'Microsoft Photos', exe: 'ms-photos:' }],
        '.pdf': [{ name: 'Microsoft Edge', exe: 'msedge.exe' }],
        '.zip': [{ name: '7-Zip', exe: '7z.exe' }],
        '.rar': [{ name: '7-Zip', exe: '7z.exe' }],
      };

    return commonApps[ext] || [];
  }

  /**
   * Write settings - content and filePath will be provided by frontend after save dialog
   */
  private async writeSettings(
    content: string,
    filePath?: string,
  ): Promise<any> {
    if (!content) {
      throw new Error('content is required for write-settings operation');
    }

    if (!filePath) {
      throw new Error('filePath is required for write-settings operation');
    }

    try {
      const absolutePath = path.resolve(filePath);
      const dir = path.dirname(absolutePath);

      // Create directory if it doesn't exist
      if (!fs.existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // Write settings file
      fs.writeFileSync(absolutePath, content, 'utf-8');

      return {
        success: true,
        operation: 'write-settings',
        data: {
          path: absolutePath,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'write-settings',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Write content to a text file
   */
  private async writeFile(filePath: string, content: string): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required for write-file operation');
    }
    if (content === undefined || content === null) {
      throw new Error('content is required for write-file operation');
    }

    const absolutePath = path.resolve(filePath);

    try {
      // Write the file
      fs.writeFileSync(absolutePath, content, 'utf-8');

      const stats = await stat(absolutePath);

      return {
        success: true,
        operation: 'write-file',
        data: {
          path: absolutePath,
          size: stats.size,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'write-file',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Open a file with a specific application
   */
  private async openWithApp(
    filePath: string,
    applicationCommand: string,
  ): Promise<any> {
    if (!filePath) {
      throw new Error('filePath is required for open-with-app operation');
    }
    if (!applicationCommand) {
      throw new Error(
        'applicationCommand is required for open-with-app operation',
      );
    }

    const absolutePath = path.resolve(filePath);

    // Check if file exists
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File does not exist: ${absolutePath}`);
    }

    try {
      let command: string;

      // macOS: Use 'open -a' command for .app bundles
      if (process.platform === 'darwin') {
        // Extract the app path from the command
        // Command format from frontend: "/Applications/TextEdit.app" "%1"
        const appPathMatch = applicationCommand.match(/^"?([^"]+\.app)"?/);

        if (appPathMatch) {
          const appPath = appPathMatch[1];
          // Use 'open -a' to launch the app with the file
          command = `open -a "${appPath}" "${absolutePath}"`;
        } else {
          // Fallback: try to execute directly (might not work for .app)
          command = applicationCommand
            .replace(/"%1"/g, `"${absolutePath}"`)
            .replace(/%1/g, `"${absolutePath}"`);

          if (!applicationCommand.includes('%1')) {
            command = `${command} "${absolutePath}"`;
          }
        }
      } else {
        // Windows/Linux: Replace %1 or "%1" with the actual file path (quoted)
        command = applicationCommand
          .replace(/"%1"/g, `"${absolutePath}"`)
          .replace(/%1/g, `"${absolutePath}"`);

        // If no %1 placeholder, append the file path
        if (!applicationCommand.includes('%1')) {
          command = `${command} "${absolutePath}"`;
        }
      }

      console.log(`[OpenWithApp] Executing: ${command}`);

      // Execute the command
      await execPromise(command, {
        timeout: 5000,
        windowsHide: process.platform === 'win32',
      });

      return {
        success: true,
        operation: 'open-with-app',
        path: absolutePath,
        application: applicationCommand,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        operation: 'open-with-app',
        path: absolutePath,
        application: applicationCommand,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Search for files by name pattern and optionally search within file content
   */
  private async searchFiles(
    searchPath: string,
    filenamePattern: string,
    contentText: string,
    recursive: boolean,
    caseSensitive: boolean,
    progressCallback?: (current: number, total: number, fileName: string) => void,
  ): Promise<any> {
    const results: Array<{
      path: string;
      name: string;
      isDirectory: boolean;
      matchLine?: number;
      matchContext?: string;
    }> = [];

    let filesScanned = 0;
    const maxResults = 500; // Limit results to prevent overwhelming UI

    // Prepare filename pattern for matching
    const filenamePatternLower = caseSensitive
      ? filenamePattern
      : filenamePattern.toLowerCase();

    // Prepare content search pattern
    const contentPattern = contentText
      ? (caseSensitive ? contentText : contentText.toLowerCase())
      : '';

    const searchDir = async (dirPath: string): Promise<void> => {
      if (this.cancelled || results.length >= maxResults) return;

      try {
        const entries = await readdir(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          if (this.cancelled || results.length >= maxResults) break;

          const fullPath = path.join(dirPath, entry.name);
          const entryName = caseSensitive ? entry.name : entry.name.toLowerCase();

          filesScanned++;
          if (progressCallback && filesScanned % 100 === 0) {
            progressCallback(filesScanned, 0, entry.name);
          }

          // Check if filename matches the pattern
          let filenameMatches = false;
          if (filenamePatternLower.includes('*') || filenamePatternLower.includes('?')) {
            const regexPattern = filenamePatternLower
              .replace(/\./g, '\\.')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.');
            const regex = new RegExp(`^${regexPattern}$`, caseSensitive ? '' : 'i');
            filenameMatches = regex.test(entry.name);
          } else {
            filenameMatches = entryName.includes(filenamePatternLower);
          }

          if (filenameMatches) {
            // If content search is requested, search within matching files
            if (contentPattern && entry.isFile()) {
              try {
                // Only search in text files (skip binary)
                const ext = path.extname(entry.name).toLowerCase();
                const textExtensions = [
                  '.txt', '.md', '.json', '.js', '.ts', '.tsx', '.jsx',
                  '.html', '.htm', '.css', '.scss', '.less', '.xml', '.yaml', '.yml',
                  '.py', '.rb', '.php', '.java', '.c', '.cpp', '.h', '.hpp',
                  '.cs', '.go', '.rs', '.swift', '.kt', '.sh', '.bash', '.zsh',
                  '.sql', '.log', '.csv', '.ini', '.cfg', '.conf', '.env',
                  '.gitignore', '.editorconfig', '.prettierrc', '.eslintrc',
                ];

                if (textExtensions.includes(ext) || !ext) {
                  const stats = await stat(fullPath);
                  // Skip files larger than 1MB for performance
                  if (stats.size < 1024 * 1024) {
                    const content = await readFile(fullPath, 'utf-8');
                    const lines = content.split('\n');

                    for (let i = 0; i < lines.length; i++) {
                      const line = caseSensitive ? lines[i] : lines[i].toLowerCase();
                      if (line.includes(contentPattern)) {
                        results.push({
                          path: fullPath,
                          name: entry.name,
                          isDirectory: false,
                          matchLine: i + 1,
                          matchContext: lines[i].trim().substring(0, 200),
                        });
                        break; // Only report first match per file
                      }
                    }
                  }
                }
              } catch {
                // Skip files that can't be read
              }
            } else if (!contentPattern) {
              // No content search - just add matching files/directories
              results.push({
                path: fullPath,
                name: entry.name,
                isDirectory: entry.isDirectory(),
              });
            }
          }

          // Recurse into directories
          if (entry.isDirectory() && recursive) {
            await searchDir(fullPath);
          }
        }
      } catch {
        // Skip directories that can't be read
      }
    };

    await searchDir(searchPath);

    return {
      success: true,
      operation: 'search',
      data: {
        searchPath,
        filenamePattern,
        contentText,
        recursive,
        caseSensitive,
        results,
        filesScanned,
        truncated: results.length >= maxResults,
      },
    };
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
