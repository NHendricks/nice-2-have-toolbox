/**
 * Restic Command
 * Provides backup management using the restic CLI
 */

import { ChildProcess, exec, spawn } from 'child_process';
import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const execPromise = promisify(exec);

export class ResticCommand implements ICommand {
  private progressCallback?: (progress: any) => void;
  private cancelled: boolean = false;
  private currentProcess: ChildProcess | null = null;
  private lastCommandLine: string = ''; // Store the last executed command line

  /**
   * Get extended PATH for macOS to find restic in common locations
   * GUI apps on macOS have a minimal PATH, so we need to add common installation locations
   */
  private getExtendedPath(): string {
    const originalPath = process.env.PATH || '';

    // Add common installation locations for restic on macOS
    const additionalPaths = [
      '/usr/local/bin', // Homebrew Intel
      '/opt/homebrew/bin', // Homebrew Apple Silicon
      '/opt/local/bin', // MacPorts
      '/usr/bin', // System binaries
      '/bin', // Basic binaries
      process.env.HOME + '/bin', // User binaries
    ].filter((p) => p); // Filter out any undefined values

    // Combine with original PATH, removing duplicates
    const allPaths = [...additionalPaths, ...originalPath.split(':')];
    const uniquePaths = [...new Set(allPaths)];

    return uniquePaths.join(':');
  }

  /**
   * Get environment with extended PATH
   */
  private getExtendedEnv(baseEnv?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
    return {
      ...process.env,
      ...baseEnv,
      PATH: this.getExtendedPath(),
    };
  }

  /**
   * Build a command line string for display purposes (with password masked)
   */
  private buildCommandLine(cmd: string, env?: NodeJS.ProcessEnv): string {
    const parts: string[] = [];

    // Add environment variables
    if (env?.RESTIC_REPOSITORY) {
      parts.push(`RESTIC_REPOSITORY="${env.RESTIC_REPOSITORY}"`);
    }
    if (env?.RESTIC_PASSWORD) {
      parts.push(`RESTIC_PASSWORD="***"`);
    }
    if (env?.RESTIC_PASSWORD_FILE) {
      parts.push(`RESTIC_PASSWORD_FILE="${env.RESTIC_PASSWORD_FILE}"`);
    }

    // Add the command
    parts.push(cmd);

    return parts.join(' ');
  }

  setProgressCallback(callback: (progress: any) => void) {
    this.progressCallback = callback;
  }

  cancel() {
    this.cancelled = true;
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
    }
  }

  resetCancellation() {
    this.cancelled = false;
  }

  async execute(params: any): Promise<any> {
    const { operation, repoPath, password, passwordFile } = params;
    this.resetCancellation();

    // Build environment with password
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (password) {
      env.RESTIC_PASSWORD = password;
    }
    if (passwordFile) {
      env.RESTIC_PASSWORD_FILE = passwordFile;
    }
    if (repoPath) {
      env.RESTIC_REPOSITORY = repoPath;
    }

    try {
      switch (operation) {
        case 'check-installed':
          return await this.checkInstalled();
        case 'check-init-safe':
          return this.checkInitSafe(repoPath);
        case 'init':
          return await this.initRepo(env);
        case 'backup':
          return await this.backup(params, env);
        case 'snapshots':
          return await this.listSnapshots(env);
        case 'ls':
          return await this.listFiles(params.snapshotId, params.path, env);
        case 'restore':
          return await this.restore(params, env);
        case 'forget':
          return await this.forget(params, env);
        case 'prune':
          return await this.prune(env);
        case 'check':
          return await this.check(env);
        case 'stats':
          return await this.stats(env);
        case 'unlock':
          return await this.unlock(env);
        case 'diff':
          return await this.diff(params.snapshotId1, params.snapshotId2, env);
        case 'list-current-fs':
          return await this.listCurrentFilesystem(params.paths);
        case 'dump':
          return await this.dumpToTempFile(
            params.snapshotId,
            params.filePath,
            env,
          );
        case 'sftp-ls':
          return await this.sftpListDir(repoPath);
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private checkInitSafe(repoPath: string): any {
    if (!repoPath) {
      return { success: true, safe: true, reason: 'no_path' };
    }

    // Check for remote repositories (s3:, sftp:, rest:, b2:, azure:, gs:, rclone:)
    // Windows paths like D:\folder have colon at position 1, remote URLs have it elsewhere
    const remoteProtocols = [
      's3:',
      'sftp:',
      'rest:',
      'b2:',
      'azure:',
      'gs:',
      'rclone:',
    ];
    const isRemote = remoteProtocols.some((protocol) =>
      repoPath.toLowerCase().startsWith(protocol),
    );
    if (isRemote) {
      return { success: true, safe: true, reason: 'remote' };
    }

    // For local paths, check if folder doesn't exist or is empty
    if (!existsSync(repoPath)) {
      return { success: true, safe: true, reason: 'not_exists' };
    }

    try {
      const contents = readdirSync(repoPath);
      if (contents.length === 0) {
        return { success: true, safe: true, reason: 'empty' };
      }
      return {
        success: true,
        safe: false,
        reason: 'not_empty',
        fileCount: contents.length,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async checkInstalled(): Promise<any> {
    try {
      const cmd = 'restic version';
      this.lastCommandLine = cmd;
      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(),
      });
      const version = stdout.trim();
      return { success: true, installed: true, version, commandLine: cmd };
    } catch (error) {
      return {
        success: true,
        installed: false,
        error:
          'restic is not installed. Please install it from https://restic.net',
        commandLine: 'restic version',
      };
    }
  }

  private isRemoteRepository(repoPath: string): boolean {
    if (!repoPath) return false;

    // Check for remote protocol prefixes
    const remoteProtocols = [
      's3:',
      'sftp:',
      'rest:',
      'b2:',
      'azure:',
      'gs:',
      'rclone:',
    ];
    return remoteProtocols.some((protocol) =>
      repoPath.toLowerCase().startsWith(protocol),
    );
  }

  private async initRepo(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const repoPath = env.RESTIC_REPOSITORY;
      console.log('[Restic] Initializing repository:', repoPath);

      // For local paths, ensure the directory exists
      if (
        repoPath &&
        !this.isRemoteRepository(repoPath) &&
        !existsSync(repoPath)
      ) {
        console.log('[Restic] Creating repository directory:', repoPath);
        const fs = await import('fs');
        await fs.promises.mkdir(repoPath, { recursive: true });
        console.log('[Restic] Directory created successfully');
      }

      const cmd = 'restic init';
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout, stderr } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
      });

      console.log('[Restic] Init stdout:', stdout);
      console.log('[Restic] Init stderr:', stderr);

      // Verify the repository was actually created (only for local repos)
      if (repoPath && !this.isRemoteRepository(repoPath)) {
        const configPath = repoPath + '/config';
        console.log('[Restic] Checking for config file at:', configPath);
        if (!existsSync(configPath)) {
          return {
            success: false,
            error:
              'Repository initialization failed: config file not created at ' +
              configPath,
            commandLine: this.lastCommandLine,
          };
        }
        console.log('[Restic] Config file verified');
      }

      return {
        success: true,
        message: stdout || stderr,
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      console.error('[Restic] Init error:', error.message);
      // Check if already initialized
      if (error.message?.includes('already initialized')) {
        return {
          success: true,
          message: 'Repository already initialized',
          commandLine: this.lastCommandLine,
        };
      }
      return {
        success: false,
        error: error.message,
        commandLine: this.lastCommandLine,
      };
    }
  }

  private async backup(params: any, env: NodeJS.ProcessEnv): Promise<any> {
    const { paths, excludePatterns, tags } = params;

    if (!paths || paths.length === 0) {
      return { success: false, error: 'No paths specified for backup' };
    }

    return new Promise((resolve, reject) => {
      const args = ['backup', '--json'];

      // Send initial progress event to confirm the callback chain works
      if (this.progressCallback) {
        this.progressCallback({
          type: 'progress',
          percentDone: 0,
          totalFiles: 0,
          filesDone: 0,
          totalBytes: 0,
          bytesDone: 0,
          currentFile: 'Starting backup...',
        });
      }

      // Add exclude patterns
      if (excludePatterns?.length) {
        excludePatterns.forEach((pattern: string) => {
          args.push('--exclude', pattern);
        });
      }

      // Add tags
      if (tags?.length) {
        tags.forEach((tag: string) => {
          args.push('--tag', tag);
        });
      }

      // Add paths to backup
      args.push(...paths);

      console.log('[Restic] Running backup with args:', args);

      // Build command line for display
      const cmdParts = ['restic', ...args];
      const cmd = cmdParts
        .map((part) => (part.includes(' ') ? `"${part}"` : part))
        .join(' ');
      this.lastCommandLine = this.buildCommandLine(cmd, env);

      this.currentProcess = spawn('restic', args, {
        env: this.getExtendedEnv(env),
      });

      let summary: any = null;
      let errorOutput = '';

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              if (progress.message_type === 'status') {
                if (this.progressCallback) {
                  const progressData = {
                    type: 'progress',
                    percentDone: progress.percent_done || 0,
                    totalFiles: progress.total_files || 0,
                    filesDone: progress.files_done || 0,
                    totalBytes: progress.total_bytes || 0,
                    bytesDone: progress.bytes_done || 0,
                    currentFile: progress.current_files?.[0] || '',
                  };
                  this.progressCallback(progressData);
                }
              }
              if (progress.message_type === 'summary') {
                summary = progress;
              }
            } catch (e) {
              // Not JSON, ignore
            }
          }
        });
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      this.currentProcess.on('close', (code: number) => {
        this.currentProcess = null;
        if (this.cancelled) {
          resolve({
            success: false,
            cancelled: true,
            commandLine: this.lastCommandLine,
          });
        } else if (code === 0) {
          resolve({
            success: true,
            summary,
            commandLine: this.lastCommandLine,
          });
        } else {
          reject(new Error(`Backup failed with code ${code}: ${errorOutput}`));
        }
      });

      this.currentProcess.on('error', (err) => {
        this.currentProcess = null;
        reject(err);
      });
    });
  }

  private async listSnapshots(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      console.log('[Restic] Listing snapshots...');
      const cmd = 'restic snapshots --json';
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout, stderr } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
      });
      // console.log('[Restic] Snapshots stdout:', stdout);
      // console.log('[Restic] Snapshots stderr:', stderr);

      // Handle empty output
      if (!stdout || stdout.trim() === '') {
        console.log('[Restic] Empty stdout, returning empty array');
        return {
          success: true,
          snapshots: [],
          commandLine: this.lastCommandLine,
        };
      }

      const snapshots = JSON.parse(stdout);
      console.log('[Restic] Parsed snapshots:', snapshots?.length || 0);
      return {
        success: true,
        snapshots: snapshots || [],
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      console.error('[Restic] Error listing snapshots:', error.message);

      // Check if repository does not exist - this is an ERROR, not success!
      if (
        error.message?.includes('repository does not exist') ||
        error.message?.includes('Is there a repository') ||
        error.message?.includes('unable to open config file')
      ) {
        return {
          success: false,
          error: error.message,
          snapshots: [],
          commandLine: this.lastCommandLine,
        };
      }

      // Handle empty repository (exists but no snapshots) - this is OK
      if (error.message?.includes('no snapshots found')) {
        return {
          success: true,
          snapshots: [],
          commandLine: this.lastCommandLine,
        };
      }

      // All other errors
      return {
        success: false,
        error: error.message,
        snapshots: [],
        commandLine: this.lastCommandLine,
      };
    }
  }

  private async listFiles(
    snapshotId: string,
    path: string | undefined,
    env: NodeJS.ProcessEnv,
  ): Promise<any> {
    if (!snapshotId) {
      return { success: false, error: 'No snapshot ID specified' };
    }

    // If no path specified, list all files recursively
    // If path specified, list only that directory
    const cmd = path
      ? `restic ls --json "${snapshotId}" "${path}"`
      : `restic ls --json "${snapshotId}"`;

    try {
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
        maxBuffer: 50 * 1024 * 1024,
      });

      // Parse NDJSON output
      const entries = stdout
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => {
          try {
            return JSON.parse(line);
          } catch (e) {
            return null;
          }
        })
        .filter((entry: any) => {
          // Filter out null entries and snapshot metadata (first entry)
          // Snapshot metadata has struct_type: "snapshot" or no type field for files
          if (entry === null) return false;
          if (entry.struct_type === 'snapshot') return false;
          // Keep only file system entries (file, dir, symlink)
          return (
            entry.type === 'file' ||
            entry.type === 'dir' ||
            entry.type === 'symlink'
          );
        });

      return {
        success: true,
        entries,
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      throw error;
    }
  }

  private async restore(params: any, env: NodeJS.ProcessEnv): Promise<any> {
    const { snapshotId, targetPath, includePaths } = params;

    if (!snapshotId) {
      return { success: false, error: 'No snapshot ID specified' };
    }
    if (!targetPath) {
      return { success: false, error: 'No target path specified' };
    }

    let cmd = `restic restore "${snapshotId}" --target "${targetPath}"`;

    if (includePaths?.length) {
      includePaths.forEach((p: string) => {
        cmd += ` --include "${p}"`;
      });
    }

    this.lastCommandLine = this.buildCommandLine(cmd, env);
    const { stdout } = await execPromise(cmd, {
      env: this.getExtendedEnv(env),
    });
    return {
      success: true,
      message: stdout,
      commandLine: this.lastCommandLine,
    };
  }

  private async forget(params: any, env: NodeJS.ProcessEnv): Promise<any> {
    const { snapshotIds, policy, prune } = params;

    let cmd = 'restic forget';

    // Forget specific snapshots
    if (snapshotIds?.length) {
      cmd += ' ' + snapshotIds.join(' ');
    }

    // Apply retention policy
    if (policy) {
      if (policy.keepLast) cmd += ` --keep-last ${policy.keepLast}`;
      if (policy.keepHourly) cmd += ` --keep-hourly ${policy.keepHourly}`;
      if (policy.keepDaily) cmd += ` --keep-daily ${policy.keepDaily}`;
      if (policy.keepWeekly) cmd += ` --keep-weekly ${policy.keepWeekly}`;
      if (policy.keepMonthly) cmd += ` --keep-monthly ${policy.keepMonthly}`;
      if (policy.keepYearly) cmd += ` --keep-yearly ${policy.keepYearly}`;
      if (policy.keepWithin) cmd += ` --keep-within ${policy.keepWithin}`;
    }

    // Prune after forget
    if (prune) {
      cmd += ' --prune';
    }

    this.lastCommandLine = this.buildCommandLine(cmd, env);
    const { stdout } = await execPromise(cmd, {
      env: this.getExtendedEnv(env),
    });
    return {
      success: true,
      message: stdout,
      commandLine: this.lastCommandLine,
    };
  }

  private async prune(env: NodeJS.ProcessEnv): Promise<any> {
    const cmd = 'restic prune';
    this.lastCommandLine = this.buildCommandLine(cmd, env);
    const { stdout } = await execPromise(cmd, {
      env: this.getExtendedEnv(env),
    });
    return {
      success: true,
      message: stdout,
      commandLine: this.lastCommandLine,
    };
  }

  private async check(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const cmd = 'restic check';
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
      });
      return {
        success: true,
        message: stdout,
        errors: [],
        warnings: [],
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errors: [error.message],
        warnings: [],
        commandLine: this.lastCommandLine,
      };
    }
  }

  private async stats(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const cmd = 'restic stats --json';
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
      });
      const stats = JSON.parse(stdout);
      return { success: true, stats, commandLine: this.lastCommandLine };
    } catch (error: any) {
      throw error;
    }
  }

  private async unlock(env: NodeJS.ProcessEnv): Promise<any> {
    const cmd = 'restic unlock';
    this.lastCommandLine = this.buildCommandLine(cmd, env);
    const { stdout } = await execPromise(cmd, {
      env: this.getExtendedEnv(env),
    });
    return {
      success: true,
      message: stdout,
      commandLine: this.lastCommandLine,
    };
  }

  private async diff(
    snapshotId1: string,
    snapshotId2: string,
    env: NodeJS.ProcessEnv,
  ): Promise<any> {
    if (!snapshotId1 || !snapshotId2) {
      return {
        success: false,
        error: 'Two snapshot IDs are required for comparison',
      };
    }

    try {
      const cmd = `restic diff "${snapshotId1}" "${snapshotId2}"`;
      this.lastCommandLine = this.buildCommandLine(cmd, env);
      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
        maxBuffer: 50 * 1024 * 1024,
      });

      // Parse the diff output
      // Format: +    /path/to/added/file
      //         -    /path/to/removed/file
      //         M    /path/to/modified/file
      const lines = stdout.split('\n').filter((line: string) => line.trim());

      const added: string[] = [];
      const removed: string[] = [];
      const modified: string[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('+')) {
          added.push(trimmed.substring(1).trim());
        } else if (trimmed.startsWith('-')) {
          removed.push(trimmed.substring(1).trim());
        } else if (trimmed.startsWith('M')) {
          modified.push(trimmed.substring(1).trim());
        }
      }

      return {
        success: true,
        diff: {
          added,
          removed,
          modified,
          summary: {
            addedCount: added.length,
            removedCount: removed.length,
            modifiedCount: modified.length,
          },
        },
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Dump a file from a snapshot to a temp file for comparison
   */
  private async dumpToTempFile(
    snapshotId: string,
    filePath: string,
    env: NodeJS.ProcessEnv,
  ): Promise<any> {
    if (!snapshotId || !filePath) {
      return {
        success: false,
        error: 'snapshotId and filePath are required for dump operation',
      };
    }

    try {
      const cmd = `restic dump "${snapshotId}" "${filePath}"`;
      this.lastCommandLine = this.buildCommandLine(cmd, env);

      const { stdout } = await execPromise(cmd, {
        env: this.getExtendedEnv(env),
        maxBuffer: 50 * 1024 * 1024,
      });

      // Write to temp file
      const tempPath = join(
        tmpdir(),
        `restic-dump-${snapshotId}-${Date.now()}.tmp`,
      );
      writeFileSync(tempPath, stdout, 'utf-8');

      return {
        success: true,
        tempPath,
        commandLine: this.lastCommandLine,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  /**
   * List files in the current filesystem recursively
   */
  private async listCurrentFilesystem(paths: string[]): Promise<any> {
    if (!paths || paths.length === 0) {
      return {
        success: false,
        error: 'At least one path is required for list-current-fs operation',
      };
    }

    try {
      const entries: any[] = [];

      for (const rootPath of paths) {
        const resolvedPath = resolve(rootPath);

        // Check if path exists
        if (!existsSync(resolvedPath)) {
          console.warn(
            `[Restic] Path does not exist, skipping: ${resolvedPath}`,
          );
          continue;
        }

        await this.walkDirectory(resolvedPath, entries);
      }

      return {
        success: true,
        entries,
        commandLine: `fs.readdir (recursive) ${paths.join(', ')}`,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Recursively walk a directory and collect file entries
   */
  private async walkDirectory(dirPath: string, entries: any[]): Promise<void> {
    try {
      const items = readdirSync(dirPath, { withFileTypes: true });

      for (const item of items) {
        const fullPath = join(dirPath, item.name);

        try {
          const stats = statSync(fullPath);

          // Normalize path to forward slashes for cross-platform compatibility
          const normalizedPath = fullPath.replace(/\\/g, '/');

          entries.push({
            name: item.name,
            path: normalizedPath,
            type: item.isDirectory()
              ? 'dir'
              : item.isSymbolicLink()
                ? 'symlink'
                : 'file',
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            exists: true,
          });

          // Recurse into directories
          if (item.isDirectory()) {
            await this.walkDirectory(fullPath, entries);
          }
        } catch (err) {
          // Skip files we can't access (permissions, etc.)
          console.warn(`[Restic] Cannot access ${fullPath}:`, err);
        }
      }
    } catch (error) {
      console.error(`[Restic] Error reading directory ${dirPath}:`, error);
      throw error;
    }
  }

  getDescription(): string {
    return 'Manage restic backups - create, browse, and restore';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        description:
          'Operation: check-installed, init, backup, snapshots, ls, restore, forget, prune, check, stats, unlock',
        required: true,
        type: 'string',
      },
      {
        name: 'repoPath',
        description: 'Repository path (local path or remote URL)',
        required: false,
        type: 'string',
      },
      {
        name: 'password',
        description: 'Repository password',
        required: false,
        type: 'string',
      },
    ];
  }

  /**
   * List a remote SFTP directory via SSH for debugging.
   * Parses sftp:user@host:/path and runs SSH + SFTP subsystem diagnostics.
   */
  private async sftpListDir(repoPath: string): Promise<any> {
    if (!repoPath) {
      return { success: false, error: 'repoPath is required' };
    }
    // Accept sftp:user@host:/path or sftp:user@host:path
    const match = repoPath.match(/^sftp:([^:]+):(.*)$/);
    if (!match) {
      return {
        success: false,
        error: 'Invalid SFTP path. Expected format: sftp:user@host:/path',
      };
    }
    const userHost = match[1];
    const remotePath = match[2] || '/';
    const parentPath = remotePath.replace(/\/[^/]+\/?$/, '') || '/';

    const lines: string[] = [];

    // Helper: run a command and return stdout+stderr
    const runCmd = async (cmd: string): Promise<string> => {
      try {
        const { stdout, stderr } = await execPromise(cmd, {
          env: this.getExtendedEnv(),
          timeout: 10000,
        });
        return (stdout || stderr).trim();
      } catch (err: any) {
        return (err.stdout || err.stderr || err.message || '').trim();
      }
    };

    // Helper: pipe commands as stdin to sftp -b - (avoids shell escaping issues)
    const runSftp = (cmds: string[]): Promise<string> => {
      return new Promise((resolve) => {
        const proc = spawn('sftp', ['-q', '-b', '-', userHost], {
          env: this.getExtendedEnv(),
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        let out = '';
        proc.stdout?.on('data', (d: Buffer) => {
          out += d.toString();
        });
        proc.stderr?.on('data', (d: Buffer) => {
          out += d.toString();
        });
        proc.on('close', () => resolve(out.trim() || '(no output)'));
        proc.on('error', (e) => resolve(`sftp spawn error: ${e.message}`));
        const input = cmds.join('\n') + '\n';
        proc.stdin?.write(input);
        proc.stdin?.end();
        setTimeout(() => {
          try {
            proc.kill();
          } catch {}
          resolve(out.trim() || '(timeout)');
        }, 10000);
      });
    };

    // === SSH shell listing ===
    lines.push(`=== SSH shell ===`);
    lines.push(`$ ssh ${userHost} ls -la "${remotePath}"`);
    lines.push(await runCmd(`ssh ${userHost} "ls -la '${remotePath}'"`));
    if (parentPath && parentPath !== remotePath) {
      lines.push('');
      lines.push(`$ ssh ${userHost} ls -la "${parentPath}"`);
      lines.push(await runCmd(`ssh ${userHost} "ls -la '${parentPath}'"`));
    }

    // === SFTP subsystem ===
    // This shows what the SFTP protocol sees — may differ from SSH shell if chrooted
    lines.push('');
    lines.push(`=== SFTP subsystem (pwd + ls) ===`);
    lines.push(`sftp cmds: pwd, ls ${remotePath}, ls ${parentPath}`);
    lines.push(
      await runSftp([`pwd`, `ls ${remotePath}`, `ls ${parentPath}`, `bye`]),
    );

    // Explore what the SFTP root filesystem actually contains
    lines.push('');
    lines.push(`=== SFTP root exploration ===`);
    lines.push(
      await runSftp([`ls /`, `ls /volume1`, `ls /volume1/backup`, `bye`]),
    );

    // === SFTP config file access ===
    const configPath = remotePath.endsWith('/')
      ? `${remotePath}config`
      : `${remotePath}/config`;
    lines.push('');
    lines.push(`=== SFTP get config (${configPath}) ===`);
    lines.push(await runSftp([`get ${configPath} /dev/null`, `bye`]));

    // === Find restic binary ===
    lines.push('');
    lines.push(`=== restic location ===`);
    const resticWhere = await runCmd(
      'where restic 2>&1 || which restic 2>&1 || echo not found',
    );
    lines.push(resticWhere);

    // === restic verbose snapshots ===
    const resticBin = resticWhere.split('\n')[0].trim();
    if (
      resticBin &&
      resticBin !== 'not found' &&
      !resticBin.includes('not found')
    ) {
      lines.push('');
      lines.push(`=== restic -vv snapshots ===`);
      const resticEnv = {
        ...this.getExtendedEnv(),
        RESTIC_REPOSITORY: repoPath,
        RESTIC_PASSWORD: 'dummy-for-diagnostic',
      };
      try {
        const { stdout, stderr } = await execPromise(
          `"${resticBin}" -vv snapshots --json`,
          {
            env: resticEnv,
            timeout: 15000,
          },
        );
        lines.push(
          (stdout + stderr).trim().split('\n').slice(0, 40).join('\n'),
        );
      } catch (err: any) {
        lines.push(
          (err.stdout || err.stderr || err.message || '')
            .trim()
            .split('\n')
            .slice(0, 40)
            .join('\n'),
        );
      }
    }

    return { success: true, output: lines.join('\n'), userHost, remotePath };
  }
}
