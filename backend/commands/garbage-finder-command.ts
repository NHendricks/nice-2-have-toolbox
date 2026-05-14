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
  isComplete: boolean;
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
  private progressThrottleMs: number = 100;

  private semaphoreLimit = 64;
  private semaphoreActive = 0;
  private semaphoreQueue: (() => void)[] = [];

  private async acquire(): Promise<void> {
    if (this.semaphoreActive < this.semaphoreLimit) {
      this.semaphoreActive++;
      return;
    }
    await new Promise<void>((resolve) => this.semaphoreQueue.push(resolve));
    this.semaphoreActive++;
  }

  private release(): void {
    this.semaphoreActive--;
    const next = this.semaphoreQueue.shift();
    if (next) next();
  }

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
    this.semaphoreActive = 0;
    this.semaphoreQueue = [];
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

    if (tree) tree.isComplete = true;

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
   * Recursively build folder node with size calculations (parallel processing).
   * Accepts an optional pre-created node so callers can push it into the tree
   * before scanning begins — enabling live size updates via shared reference.
   */
  private async buildFolderNode(
    folderPath: string,
    depth: number,
    node?: FolderNode,
  ): Promise<FolderNode | null> {
    if (this.cancelled) {
      throw new Error('Operation cancelled by user');
    }

    this.foldersScanned++;

    if (!node) {
      node = {
        name: path.basename(folderPath) || folderPath,
        path: folderPath,
        size: 0,
        children: [],
        depth,
        fileCount: 0,
        folderCount: 0,
        isComplete: false,
      };
    }

    // Set as root if this is the first node
    if (depth === 0) {
      this.rootNode = node;
    }

    // Send throttled progress update
    this.sendProgressUpdate(folderPath);

    try {
      await this.acquire();
      let entries;
      try {
        entries = await readdir(folderPath, { withFileTypes: true });
      } finally {
        this.release();
      }

      if (this.cancelled) {
        throw new Error('Operation cancelled by user');
      }

      const directories: { name: string; fullPath: string }[] = [];
      const files: { name: string; fullPath: string }[] = [];

      for (const entry of entries) {
        const fullPath = path.join(folderPath, entry.name);
        if (entry.isDirectory()) {
          if (!this.shouldSkipDirectory(entry.name)) {
            directories.push({ name: entry.name, fullPath });
          }
        } else if (entry.isFile()) {
          files.push({ name: entry.name, fullPath });
        }
      }

      // Process all files in parallel, bounded by global semaphore
      const fileSizes = await Promise.all(
        files.map(async (file) => {
          if (this.cancelled) return 0;
          await this.acquire();
          try {
            const fileStats = await stat(file.fullPath);
            return fileStats.size;
          } catch {
            return 0;
          } finally {
            this.release();
          }
        }),
      );

      for (const size of fileSizes) {
        node.size += size;
        if (size > 0) {
          node.fileCount++;
          this.totalSize += size;
        }
      }

      if (this.cancelled) {
        throw new Error('Operation cancelled by user');
      }

      // Push child stubs into the tree immediately so they appear in progress updates
      // before their subtrees are scanned. Each stub is filled in-place, so the shared
      // object reference captures growing sizes as the scan progresses.
      node.folderCount = directories.length;
      const childStubs = directories.map((dir) => {
        const stub: FolderNode = {
          name: path.basename(dir.fullPath),
          path: dir.fullPath,
          size: 0,
          children: [],
          depth: depth + 1,
          fileCount: 0,
          folderCount: 0,
          isComplete: false,
        };
        node!.children.push(stub);
        return { dir, stub };
      });

      await Promise.all(
        childStubs.map(async ({ dir, stub }) => {
          await this.buildFolderNode(dir.fullPath, depth + 1, stub);
          stub.isComplete = true;
          node!.size += stub.size;
          node!.fileCount += stub.fileCount;
          node!.folderCount += stub.folderCount;
        }),
      );

      return node;
    } catch (error: any) {
      if (error.message === 'Operation cancelled by user') {
        throw error;
      }
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
