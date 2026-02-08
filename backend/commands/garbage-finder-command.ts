/**
 * Garbage Finder Command
 * Scans directories and builds a tree structure with folder sizes
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

interface FolderNode {
  name: string;
  path: string;
  size: number;
  children: FolderNode[];
  depth: number;
  fileCount: number;
  folderCount: number;
}

export class GarbageFinderCommand implements ICommand {
  private progressCallback?: (
    foldersScanned: number,
    currentSize: number,
    currentPath: string,
    percentage: number,
    tree: FolderNode[],
  ) => void;
  private cancelled: boolean = false;
  private foldersScanned: number = 0;
  private totalSize: number = 0;
  private rootNode: FolderNode | null = null;
  private lastProgressUpdate: number = 0;
  private progressThrottleMs: number = 100; // Update UI every 100ms max

  setProgressCallback(
    callback: (
      foldersScanned: number,
      currentSize: number,
      currentPath: string,
      percentage: number,
      tree: FolderNode[],
    ) => void,
  ) {
    this.progressCallback = callback;
  }

  cancel() {
    this.cancelled = true;
    console.log('[GarbageFinder] Operation cancelled');
  }

  resetCancellation() {
    this.cancelled = false;
  }

  async execute(params: any): Promise<any> {
    const { operation, rootPath } = params;

    // Reset state
    this.resetCancellation();
    this.foldersScanned = 0;
    this.totalSize = 0;

    try {
      switch (operation) {
        case 'scan':
          return await this.scanFolderTree(rootPath);
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error: any) {
      if (error.message === 'Operation cancelled by user') {
        return { success: false, error: 'Operation cancelled', cancelled: true };
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * Scan folder tree and return hierarchical structure with sizes
   */
  private async scanFolderTree(rootPath: string): Promise<any> {
    if (!rootPath) {
      return { success: false, error: 'Root path is required' };
    }

    const absolutePath = path.resolve(rootPath);

    // Check if path exists
    try {
      const stats = await stat(absolutePath);
      if (!stats.isDirectory()) {
        return { success: false, error: 'Path is not a directory' };
      }
    } catch (error) {
      return { success: false, error: `Cannot access path: ${absolutePath}` };
    }

    // Initialize root node
    this.rootNode = null;

    // Build tree
    const tree = await this.buildFolderNode(absolutePath, 0);
    this.rootNode = tree;

    // Send final update
    if (this.progressCallback && tree) {
      this.progressCallback(
        this.foldersScanned,
        this.totalSize,
        absolutePath,
        100,
        [tree],
      );
    }

    return {
      success: true,
      operation: 'scan',
      tree: tree ? [tree] : [],
      totalSize: this.totalSize,
      foldersScanned: this.foldersScanned,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send throttled progress update with current tree state
   */
  private sendProgressUpdate(currentPath: string): void {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= this.progressThrottleMs) {
      this.lastProgressUpdate = now;
      if (this.progressCallback && this.rootNode) {
        const estimatedPercentage = Math.min(
          Math.round((this.foldersScanned / 1000) * 100),
          99,
        );
        this.progressCallback(
          this.foldersScanned,
          this.totalSize,
          currentPath,
          estimatedPercentage,
          [this.rootNode],
        );
      }
    }
  }

  /**
   * Recursively build folder node with size calculations
   */
  private async buildFolderNode(
    folderPath: string,
    depth: number,
  ): Promise<FolderNode | null> {
    if (this.cancelled) {
      throw new Error('Operation cancelled by user');
    }

    this.foldersScanned++;

    const node: FolderNode = {
      name: path.basename(folderPath) || folderPath,
      path: folderPath,
      size: 0,
      children: [],
      depth: depth,
      fileCount: 0,
      folderCount: 0,
    };

    // Set as root if this is the first node
    if (depth === 0) {
      this.rootNode = node;
    }

    // Send throttled progress update
    this.sendProgressUpdate(folderPath);

    try {
      const entries = await readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (this.cancelled) {
          throw new Error('Operation cancelled by user');
        }

        const fullPath = path.join(folderPath, entry.name);

        try {
          if (entry.isDirectory()) {
            // Skip system/hidden directories that often cause issues
            if (this.shouldSkipDirectory(entry.name)) {
              continue;
            }

            node.folderCount++;
            const childNode = await this.buildFolderNode(fullPath, depth + 1);
            if (childNode) {
              node.children.push(childNode);
              node.size += childNode.size;
              node.fileCount += childNode.fileCount;
              node.folderCount += childNode.folderCount;
            }
          } else if (entry.isFile()) {
            try {
              const fileStats = await stat(fullPath);
              node.size += fileStats.size;
              node.fileCount++;
              this.totalSize += fileStats.size;
            } catch (e) {
              // Skip files we can't stat
            }
          }
        } catch (e) {
          // Skip entries we can't access
        }
      }

      // Sort children by size (largest first)
      node.children.sort((a, b) => b.size - a.size);

      return node;
    } catch (error) {
      // Return node with whatever we have (might be empty for inaccessible folders)
      return node;
    }
  }

  /**
   * Check if directory should be skipped (system/protected directories)
   */
  private shouldSkipDirectory(name: string): boolean {
    const skipDirs = [
      '$Recycle.Bin',
      '$RECYCLE.BIN',
      'System Volume Information',
      '$WinREAgent',
      '$SysReset',
    ];
    return skipDirs.includes(name);
  }

  getDescription(): string {
    return 'Scan directories and analyze folder sizes';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        description: 'Operation to perform: scan',
        required: true,
        type: 'string',
      },
      {
        name: 'rootPath',
        description: 'Root path to scan',
        required: true,
        type: 'string',
      },
    ];
  }
}
