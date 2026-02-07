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
  /**
   * Parse FTP URL: ftp://user:pass@host:port/path
   * Returns connection info and path
   */
  private parseFTPUrl(ftpUrl: string): {
    connection: FTPConnectionInfo;
    remotePath: string;
  } {
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

    // Parse credentials
    let user = 'anonymous';
    let password = 'anonymous@';
    if (credentials) {
      if (credentials.includes(':')) {
        [user, password] = credentials.split(':', 2);
      } else {
        user = credentials;
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
      session.lastUsed = Date.now();
      return session.client;
    }

    // Create new session
    const client = new ftp.Client();
    client.ftp.verbose = false;

    try {
      await client.access({
        host: conn.host,
        port: conn.port,
        user: conn.user,
        password: conn.password,
        secure: conn.secure || false,
      });

      activeSessions.set(key, { client, lastUsed: Date.now() });

      // Cleanup old sessions
      this.cleanupSessions();

      return client;
    } catch (error: any) {
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

      for (const item of fileList) {
        const itemData = {
          name: item.name,
          path: `ftp://${connection.user}@${connection.host}:${connection.port}${remotePath}/${item.name}`
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
   * Download file from FTP
   */
  private async downloadFile(ftpUrl: string, localPath: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Create local directory if needed
      const localDir = path.dirname(localPath);
      if (!fs.existsSync(localDir)) {
        await mkdir(localDir, { recursive: true });
      }

      // Download file
      await client.downloadTo(localPath, remotePath);

      const stats = fs.statSync(localPath);

      return {
        success: true,
        operation: 'download',
        source: ftpUrl,
        destination: localPath,
        size: stats.size,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Upload file to FTP
   */
  private async uploadFile(localPath: string, ftpUrl: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file does not exist: ${localPath}`);
      }

      // Upload file
      await client.uploadFrom(localPath, remotePath);

      const stats = fs.statSync(localPath);

      return {
        success: true,
        operation: 'upload',
        source: localPath,
        destination: ftpUrl,
        size: stats.size,
        type: 'file',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Rename file on FTP
   */
  private async renameFile(ftpUrl: string, newName: string): Promise<any> {
    const { connection, remotePath } = this.parseFTPUrl(ftpUrl);
    const client = await this.getClient(connection);

    try {
      // Get parent directory
      const parentDir =
        remotePath.substring(0, remotePath.lastIndexOf('/')) || '/';
      const newPath = `${parentDir}/${newName}`.replace(/\/+/g, '/');

      // Rename file
      await client.rename(remotePath, newPath);

      return {
        success: true,
        operation: 'rename',
        source: ftpUrl,
        destination: `ftp://${connection.user}@${connection.host}:${connection.port}${newPath}`,
        newName,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Failed to rename file: ${error.message}`);
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
    return 'FTP operations: connect, list, download, upload, rename, delete files';
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
