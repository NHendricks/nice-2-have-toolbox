/**
 * Restic Command
 * Provides backup management using the restic CLI
 */

import { exec, spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { existsSync, readdirSync } from 'fs';
import { CommandParameter, ICommand } from './command-interface.js';

const execPromise = promisify(exec);

export class ResticCommand implements ICommand {
  private progressCallback?: (progress: any) => void;
  private cancelled: boolean = false;
  private currentProcess: ChildProcess | null = null;

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
    const remoteProtocols = ['s3:', 'sftp:', 'rest:', 'b2:', 'azure:', 'gs:', 'rclone:'];
    const isRemote = remoteProtocols.some(protocol => repoPath.toLowerCase().startsWith(protocol));
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
      const { stdout } = await execPromise('restic version');
      const version = stdout.trim();
      return { success: true, installed: true, version };
    } catch (error) {
      return {
        success: true,
        installed: false,
        error: 'restic is not installed. Please install it from https://restic.net',
      };
    }
  }

  private async initRepo(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const { stdout, stderr } = await execPromise('restic init', { env });
      return { success: true, message: stdout || stderr };
    } catch (error: any) {
      // Check if already initialized
      if (error.message?.includes('already initialized')) {
        return { success: true, message: 'Repository already initialized' };
      }
      throw error;
    }
  }

  private async backup(params: any, env: NodeJS.ProcessEnv): Promise<any> {
    const { paths, excludePatterns, tags } = params;

    if (!paths || paths.length === 0) {
      return { success: false, error: 'No paths specified for backup' };
    }

    return new Promise((resolve, reject) => {
      const args = ['backup', '--json'];

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

      this.currentProcess = spawn('restic', args, { env });

      let summary: any = null;
      let errorOutput = '';

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              if (progress.message_type === 'status' && this.progressCallback) {
                this.progressCallback({
                  type: 'progress',
                  percentDone: progress.percent_done || 0,
                  totalFiles: progress.total_files || 0,
                  filesDone: progress.files_done || 0,
                  totalBytes: progress.total_bytes || 0,
                  bytesDone: progress.bytes_done || 0,
                  currentFile: progress.current_files?.[0] || '',
                });
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
          resolve({ success: false, cancelled: true });
        } else if (code === 0) {
          resolve({ success: true, summary });
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
      const { stdout } = await execPromise('restic snapshots --json', { env });
      const snapshots = JSON.parse(stdout || '[]');
      return { success: true, snapshots };
    } catch (error: any) {
      // Handle empty repository
      if (error.message?.includes('no snapshots found')) {
        return { success: true, snapshots: [] };
      }
      throw error;
    }
  }

  private async listFiles(
    snapshotId: string,
    path: string,
    env: NodeJS.ProcessEnv,
  ): Promise<any> {
    if (!snapshotId) {
      return { success: false, error: 'No snapshot ID specified' };
    }

    const targetPath = path || '/';
    const cmd = `restic ls --json "${snapshotId}" "${targetPath}"`;

    try {
      const { stdout } = await execPromise(cmd, { env, maxBuffer: 50 * 1024 * 1024 });

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
        .filter((entry: any) => entry !== null);

      return { success: true, entries };
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

    const { stdout } = await execPromise(cmd, { env });
    return { success: true, message: stdout };
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

    const { stdout } = await execPromise(cmd, { env });
    return { success: true, message: stdout };
  }

  private async prune(env: NodeJS.ProcessEnv): Promise<any> {
    const { stdout } = await execPromise('restic prune', { env });
    return { success: true, message: stdout };
  }

  private async check(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const { stdout } = await execPromise('restic check', { env });
      return { success: true, message: stdout, errors: [], warnings: [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        errors: [error.message],
        warnings: [],
      };
    }
  }

  private async stats(env: NodeJS.ProcessEnv): Promise<any> {
    try {
      const { stdout } = await execPromise('restic stats --json', { env });
      const stats = JSON.parse(stdout);
      return { success: true, stats };
    } catch (error: any) {
      throw error;
    }
  }

  private async unlock(env: NodeJS.ProcessEnv): Promise<any> {
    const { stdout } = await execPromise('restic unlock', { env });
    return { success: true, message: stdout };
  }

  private async diff(
    snapshotId1: string,
    snapshotId2: string,
    env: NodeJS.ProcessEnv,
  ): Promise<any> {
    if (!snapshotId1 || !snapshotId2) {
      return { success: false, error: 'Two snapshot IDs are required for comparison' };
    }

    try {
      const cmd = `restic diff "${snapshotId1}" "${snapshotId2}"`;
      const { stdout } = await execPromise(cmd, { env, maxBuffer: 50 * 1024 * 1024 });

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
      };
    } catch (error: any) {
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
}
