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

export class FileOperationsCommand implements ICommand {
  async execute(params: any): Promise<any> {
    const { operation, folderPath, sourcePath, destinationPath, filePath } =
      params;

    try {
      switch (operation) {
        case 'list':
          return await this.listFiles(folderPath);
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

    // Read file content
    const content = await readFile(absolutePath, 'utf-8');

    return {
      success: true,
      operation: 'read',
      path: absolutePath,
      content: content,
      size: stats.size,
      modified: stats.mtime,
    };
  }

  /**
   * Copy a file from source to destination
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
      throw new Error(`Source file does not exist: ${absoluteSource}`);
    }

    // Check if source is a file
    const sourceStats = await stat(absoluteSource);
    if (!sourceStats.isFile()) {
      throw new Error(`Source is not a file: ${absoluteSource}`);
    }

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
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Move a file from source to destination
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
      throw new Error(`Source file does not exist: ${absoluteSource}`);
    }

    // Check if source is a file
    const sourceStats = await stat(absoluteSource);
    if (!sourceStats.isFile()) {
      throw new Error(`Source is not a file: ${absoluteSource}`);
    }

    // Create destination directory if it doesn't exist
    const destDir = path.dirname(absoluteDestination);
    if (!fs.existsSync(destDir)) {
      await mkdir(destDir, { recursive: true });
    }

    // Move the file
    await rename(absoluteSource, absoluteDestination);

    const destStats = await stat(absoluteDestination);

    return {
      success: true,
      operation: 'move',
      source: absoluteSource,
      destination: absoluteDestination,
      size: destStats.size,
      timestamp: new Date().toISOString(),
    };
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
