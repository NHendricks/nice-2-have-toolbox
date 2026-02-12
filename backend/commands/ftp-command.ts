/**
 * FTP Command
 * Provides FTP operations: connect, list, download, upload, rename, delete
 */

import * as ftp from 'basic-ftp';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const unlink = promisify(fs.unlink);

interface FTPConnectionInfo {
  host: string;
  port: number;
  user: string;
  password: string;
  secure?: boolean;
}

// Store active FTP connections (session management)
const activeSessions = new Map<
  string,
  { client: ftp.Client; lastUsed: number }
>();

// Cleanup old sessions after 5 minutes of inactivity
const SESSION_TIMEOUT = 5 * 60 * 1000;

export class FTPCommand implements ICommand {
  private progressCallback?: (current: number, total: number, fileName: string) => void;

  /**
   * Set progress callback for upload/download operations
   */
  setProgressCallback(callback?: (current: number, total: number, fileName: string) => void) {
    this.progressCallback = callback;
  }

  /**
   * Parse FTP URL: ftp://user:pass@host:port/path
   * Returns connection info and path
   */
  private parseFTPUrl(ftpUrl: string): {
    connection: FTPConnectionInfo;
    remotePath: string;
  } {
    // Don't log the full URL as it contains passwords
    // console.log('[FTP] Parsing URL:', ftpUrl);
    // Remove ftp:// prefix
    const url = ftpUrl.replace(/^ftp:\/\//, '');

    // Extract credentials and host
    let credentials = '';
    let hostPort = '';
    let remotePath = '/';

    if (url.includes('@')) {
      [credentials, hostPort] = url.split('@', 2);
    } else {
      hostPort = url;
    }

    // Extract path
    if (hostPort.includes('/')) {
      const slashIndex = hostPort.indexOf('/');
      remotePath = hostPort.substring(slashIndex);
      hostPort = hostPort.substring(0, slashIndex);
    }

    // Parse credentials (decode URL-encoded values)
    let user = 'anonymous';
    let password = 'anonymous@';
    if (credentials) {
      if (credentials.includes(':')) {
        const [encodedUser, encodedPassword] = credentials.split(':', 2);
        user = decodeURIComponent(encodedUser);
        password = decodeURIComponent(encodedPassword);
      } else {
        user = decodeURIComponent(credentials);
      }
    }

    // Parse host and port
    let host = hostPort;
    let port = 21;
    if (hostPort.includes(':')) {
      const parts = hostPort.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10) || 21;
    }

    console.log('[FTP] Parsed:', { host, port, user, password: '***', remotePath });
    return {
      connection: { host, port, user, password },
      remotePath: remotePath || '/',
    };
  }

  /**
   * Get session key for connection pooling
   */
  private getSessionKey(conn: FTPConnectionInfo): string {
    return `${conn.user}@${conn.host}:${conn.port}`;
  }

  /**
   * Get or create FTP client session
   */
  private async getClient(conn: FTPConnectionInfo): Promise<ftp.Client> {
    const key = this.getSessionKey(conn);
    const session = activeSessions.get(key);

    // Reuse existing session if available
    if (session) {
      console.log('[FTP] Reusing existing session for:', key);
      session.lastUsed = Date.now();
      return session.client;
    }

    // Create new session
    console.log('[FTP] Creating new session for:', key);
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      console.log('[FTP] Connecting to:', conn.host, conn.port, 'as', conn.user);
      await client.access({
        host: conn.host,
        port: conn.port,
        user: conn.user,
        password: conn.password,
        secure: conn.secure || false,
      });
      console.log('[FTP] Connected successfully!');

      activeSessions.set(key, { client, lastUsed: Date.now() });

      // Cleanup old sessions
      this.cleanupSessions();

      return client;
    } catch (error: any) {
      console.log('[FTP] Connection failed:', error.message);
      client.close();
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }

  /**
   * Cleanup inactive sessions
   */
  private cleanupSessions() {
    const now = Date.now();
    for (const [key, session] of activeSessions.entries()) {
      if (now - session.lastUsed > SESSION_TIMEOUT) {
        session.client.close();
        activeSessions.delete(key);
      }
    }
  }

  /**
   * Close all FTP sessions
   */
  private closeAllSessions() {
    for (const [key, session] of activeSessions.entries()) {
      session.client.close();
      activeSessions.delete(key);
    }
  }

  /**
   * Invalidate session for a given FTP URL (on connection errors)
   */
  private invalidateSession(ftpUrl: string) {
    try {
      const { connection } = this.parseFTPUrl(ftpUrl);
      const key = this.getSessionKey(connection);
      const session = activeSessions.get(key);
      if (session) {
        try {
          session.client.close();
        } catch {
          // Ignore close errors
        }
        activeSessions.delete(key);
      }
    } catch {
      // Ignore parse errors
    }
  }

  async execute(params: any): Promise<any> {
    const { operation, ftpUrl, localPath, newName, content } = params;

    try {
      switch (operation) {
        case 'test-connection':
          return await this.testConnection(params);
        case 'list':
          return await this.listFiles(ftpUrl);
        case 'download':
          return await this.downloadFile(ftpUrl, localPath);
        case 'upload':
          return await this.uploadFile(localPath, ftpUrl);
        case 'rename':
          return await this.renameFile(ftpUrl, newName);
        case 'mkdir':
          return await this.createDirectory(ftpUrl);
        case 'delete':
          return await this.deleteFile(ftpUrl);
        case 'close-all':
          this.closeAllSessions();
          return { success: true, operation: 'close-all' };
        default:
          return {
            success: false,
            error: `Unknown operation: ${operation}`,
          };
      }
    } catch (error: any) {
      // Invalidate session on error - connection may be broken
      if (ftpUrl) {
        this.invalidateSession(ftpUrl);
      }
      return {
        success: false,
        error: error.message,
        stack: error.stack,
      };
    }
  }

  /**
   * Test FTP connection
   */
  private async testConnection(params: any): Promise<any> {
    const { host, port, user, password, secure } = params;

    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host,
        port: port || 21,
        user: user || 'anonymous',
        password: password || 'anonymous@',
        secure: secure || false,
      });

      await client.pwd();
      client.close();

      return {
        success: true,
        operation: 'test-connection',
        message: 'Connection successful',
      };
    } catch (error: any) {
      client.close();
      return {
        success: false,
        operation: 'test-connection',
        error: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * List files in FTP directory
   */
  private async listFiles(ftpUrl: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Change to directory
      await client.cd(remotePath);

      // List files
      const fileList = await client.list();

      const files: any[] = [];
      const directories: any[] = [];

      // URL-encode credentials for constructing paths (password needed for reconnection)
      const encodedUser = encodeURIComponent(connection.user);
      const encodedPassword = encodeURIComponent(connection.password);

      for (const item of fileList) {
        const itemData = {
          name: item.name,
          path: `ftp://${encodedUser}:${encodedPassword}@${connection.host}:${connection.port}${remotePath}/${item.name}`
            .replace(/\/+/g, '/')
            .replace(':/', '://'),
          size: item.size,
          created: item.date,
          modified: item.date,
          isDirectory: item.type === ftp.FileType.Directory,
          isFile: item.type === ftp.FileType.File,
          permissions: item.permissions,
        };

        if (item.type === ftp.FileType.Directory) {
          directories.push(itemData);
        } else {
          files.push(itemData);
        }
      }

      return {
        success: true,
        operation: 'list',
        path: ftpUrl,
        totalItems: files.length + directories.length,
        directories,
        files,
        summary: {
          totalFiles: files.length,
          totalDirectories: directories.length,
        },
      };
    } catch (error: any) {
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * Download file or directory from FTP
   */
  private async downloadFile(ftpUrl: string, localPath: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Check if remote path is a directory or file
      let isDirectory = false;
      let fileSize = 0;

      try {
        // Try to list the path as a directory
        await client.cd(remotePath);
        isDirectory = true;
        // Go back to parent directory
        await client.cdup();
      } catch {
        // Not a directory, it's a file
        isDirectory = false;
      }

      if (isDirectory) {
        // Download directory recursively
        console.log('[FTP] Downloading directory:', remotePath, 'to', localPath);

        // Create local directory if needed
        if (!fs.existsSync(localPath)) {
          await mkdir(localPath, { recursive: true });
        }

        // Set up progress tracking if callback is available
        if (this.progressCallback) {
          console.log('[FTP] Setting up progress tracking for directory download');
          let fileCount = 0;
          client.trackProgress((info) => {
            console.log('[FTP] Download progress:', JSON.stringify(info));
            fileCount++;
            const fileName = info.name || 'file';
            // Report progress with file count as both current and total (since we don't know total upfront)
            this.progressCallback?.(fileCount, fileCount, fileName);
          });
        }

        try {
          // Download directory recursively
          await client.downloadToDir(localPath, remotePath);
        } finally {
          // Stop tracking progress
          if (this.progressCallback) {
            console.log('[FTP] Stopping progress tracking');
            client.trackProgress();
          }
        }

        return {
          success: true,
          operation: 'download',
          source: ftpUrl,
          destination: localPath,
          type: 'directory',
          timestamp: new Date().toISOString(),
        };
      } else {
        // Download single file
        console.log('[FTP] Downloading file:', remotePath, 'to', localPath);

        // Create local directory if needed
        const localDir = path.dirname(localPath);
        if (!fs.existsSync(localDir)) {
          await mkdir(localDir, { recursive: true });
        }

        // Set up progress tracking if callback is available
        if (this.progressCallback) {
          const fileName = path.basename(localPath);
          console.log('[FTP] Setting up progress tracking for file download:', fileName);
          client.trackProgress((info) => {
            console.log('[FTP] File download progress:', JSON.stringify(info));
            // Report progress: bytes transferred, total bytes, file name
            this.progressCallback?.(info.bytes, info.bytesOverall || info.bytes, fileName);
          });
        }

        try {
          // Download file
          await client.downloadTo(localPath, remotePath);
        } finally {
          // Stop tracking progress
          if (this.progressCallback) {
            console.log('[FTP] Stopping file download progress tracking');
            client.trackProgress();
          }
        }

        const stats = fs.statSync(localPath);
        fileSize = stats.size;

        return {
          success: true,
          operation: 'download',
          source: ftpUrl,
          destination: localPath,
          size: fileSize,
          type: 'file',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to download: ${error.message}`);
    }
  }

  /**
   * Upload file or directory to FTP
   */
  private async uploadFile(localPath: string, ftpUrl: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local path does not exist: ${localPath}`);
      }

      const stats = fs.statSync(localPath);
      const isDirectory = stats.isDirectory();

      if (isDirectory) {
        // Upload directory recursively
        console.log('[FTP] Uploading directory:', localPath, 'to', remotePath);

        // Ensure remote directory exists
        await client.ensureDir(remotePath);

        // Set up progress tracking if callback is available
        if (this.progressCallback) {
          console.log('[FTP] Setting up progress tracking for directory upload');
          let fileCount = 0;
          client.trackProgress((info) => {
            console.log('[FTP] Upload progress:', JSON.stringify(info));
            fileCount++;
            const fileName = info.name || 'file';
            // Report progress with file count
            this.progressCallback?.(fileCount, fileCount, fileName);
          });
        }

        try {
          // Upload directory recursively
          await client.uploadFromDir(localPath, remotePath);
        } finally {
          // Stop tracking progress
          if (this.progressCallback) {
            console.log('[FTP] Stopping upload progress tracking');
            client.trackProgress();
          }
        }

        return {
          success: true,
          operation: 'upload',
          source: localPath,
          destination: ftpUrl,
          type: 'directory',
          timestamp: new Date().toISOString(),
        };
      } else {
        // Upload single file
        console.log('[FTP] Uploading file:', localPath, 'to', remotePath);

        // Set up progress tracking if callback is available
        if (this.progressCallback) {
          const fileName = path.basename(localPath);
          console.log('[FTP] Setting up progress tracking for file upload:', fileName);
          client.trackProgress((info) => {
            console.log('[FTP] File upload progress:', JSON.stringify(info));
            // Report progress: bytes transferred, total bytes, file name
            this.progressCallback?.(info.bytes, info.bytesOverall || info.bytes, fileName);
          });
        }

        try {
          // Upload file
          await client.uploadFrom(localPath, remotePath);
        } finally {
          // Stop tracking progress
          if (this.progressCallback) {
            console.log('[FTP] Stopping file upload progress tracking');
            client.trackProgress();
          }
        }

        return {
          success: true,
          operation: 'upload',
          source: localPath,
          destination: ftpUrl,
          size: stats.size,
          type: 'file',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to upload: ${error.message}`);
    }
  }

  /**
   * Rename file on FTP
   */
  private async renameFile(ftpUrl: string, newName: string): Promise<any> {
    console.log('[FTP] Rename called:', { ftpUrl, newName });
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Get parent directory
      const parentDir =
        remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
      const newPath = `${parentDir}/${newName}`.replace(/\/+/g, '/');

      console.log('[FTP] Renaming:', remotePath, '->', newPath);
      // Rename file
      await client.rename(remotePath, newPath);
      console.log('[FTP] Rename successful');

      // URL-encode credentials for the destination path (password needed for reconnection)
      const encodedUser = encodeURIComponent(connection.user);
      const encodedPassword = encodeURIComponent(connection.password);

      return {
        success: true,
        operation: 'rename',
        source: ftpUrl,
        destination: `ftp://${encodedUser}:${encodedPassword}@${connection.host}:${connection.port}${newPath}`,
        newName,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.log('[FTP] Rename failed:', error.message);
      throw new Error(`Failed to rename file: ${error.message}`);
    }
  }

  /**
   * Create directory on FTP
   */
  private async createDirectory(ftpUrl: string): Promise<any> {
    console.log('[FTP] Mkdir called:', ftpUrl);
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Create directory
      await client.ensureDir(remotePath);
      console.log('[FTP] Mkdir successful:', remotePath);

      // URL-encode credentials for the result path
      const encodedUser = encodeURIComponent(connection.user);
      const encodedPassword = encodeURIComponent(connection.password);

      return {
        success: true,
        operation: 'mkdir',
        path: `ftp://${encodedUser}:${encodedPassword}@${connection.host}:${connection.port}${remotePath}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.log('[FTP] Mkdir failed:', error.message);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Delete file from FTP
   */
  private async deleteFile(ftpUrl: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Try to remove as file first
      try {
        await client.remove(remotePath);
      } catch {
        // If that fails, try as directory
        await client.removeDir(remotePath);
      }

      return {
        success: true,
        operation: 'delete',
        path: ftpUrl,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  getDescription(): string {
    return 'FTP operations: connect, list, download/upload files and directories, rename, delete';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        type: 'select',
        description: 'Operation to perform',
        required: true,
        options: [
          'test-connection',
          'list',
          'download',
          'upload',
          'rename',
          'delete',
          'close-all',
        ],
      },
      {
        name: 'ftpUrl',
        type: 'string',
        description: 'FTP URL (ftp://user:pass@host:port/path)',
        required: false,
      },
      {
        name: 'host',
        type: 'string',
        description: 'FTP host (for test-connection)',
        required: false,
      },
      {
        name: 'port',
        type: 'number',
        description: 'FTP port (default: 21)',
        required: false,
      },
      {
        name: 'user',
        type: 'string',
        description: 'FTP username',
        required: false,
      },
      {
        name: 'password',
        type: 'string',
        description: 'FTP password',
        required: false,
      },
      {
        name: 'localPath',
        type: 'string',
        description: 'Local file path (for download/upload)',
        required: false,
      },
      {
        name: 'newName',
        type: 'string',
        description: 'New filename (for rename)',
        required: false,
      },
    ];
  }
}
