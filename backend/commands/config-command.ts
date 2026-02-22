/**
 * Config Command
 * Manages configuration files in user home directory ~/n2htoolbox/
 * Does NOT automatically save preferences containing passwords
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { promisify } from 'util';
import { CommandParameter, ICommand } from './command-interface.js';

const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const access = promisify(fs.access);
const readdir = promisify(fs.readdir);

const CONFIG_DIR_NAME = 'n2htoolbox';

export class ConfigCommand implements ICommand {
  /**
   * Get the config directory path
   */
  private getConfigDir(): string {
    return path.join(os.homedir(), CONFIG_DIR_NAME);
  }

  /**
   * Ensure config directory exists
   */
  private async ensureConfigDir(): Promise<string> {
    const configDir = this.getConfigDir();

    try {
      await access(configDir);
    } catch {
      // Directory doesn't exist, create it
      await mkdir(configDir, { recursive: true });
      console.log(`[Config] Created config directory: ${configDir}`);
    }

    return configDir;
  }

  /**
   * Get full path for a config file
   */
  private async getConfigFilePath(filename: string): Promise<string> {
    const configDir = await this.ensureConfigDir();
    return path.join(configDir, filename);
  }

  async execute(params: any): Promise<any> {
    const { operation, filename, content, data } = params;

    try {
      switch (operation) {
        case 'get-dir':
          return await this.getConfigDirectory();

        case 'read':
          return await this.readConfig(filename);

        case 'write':
          return await this.writeConfig(filename, content || data);

        case 'list':
          return await this.listConfigs();

        case 'delete':
          return await this.deleteConfig(filename);

        case 'exists':
          return await this.configExists(filename);

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
        operation,
      };
    }
  }

  /**
   * Get config directory path
   */
  private async getConfigDirectory(): Promise<any> {
    const configDir = await this.ensureConfigDir();

    return {
      success: true,
      operation: 'get-dir',
      path: configDir,
    };
  }

  /**
   * Read a config file
   */
  private async readConfig(filename: string): Promise<any> {
    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    const filePath = await this.getConfigFilePath(filename);
    console.log(`[ConfigCommand] Reading config file: ${filePath}`);

    try {
      const content = await readFile(filePath, 'utf-8');
      console.log(
        `[ConfigCommand] Successfully read ${content.length} bytes from ${filename}`,
      );

      // Try to parse as JSON if it looks like JSON
      let data = content;
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        try {
          data = JSON.parse(content);
        } catch {
          // Not valid JSON, return as string
        }
      }

      return {
        success: true,
        operation: 'read',
        filename,
        path: filePath,
        data,
        content,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log(`[ConfigCommand] Config file not found: ${filePath}`);
        return {
          success: false,
          error: 'Config file not found',
          filename,
          path: filePath,
          notFound: true,
        };
      }
      console.error(`[ConfigCommand] Error reading config file:`, error);
      throw error;
    }
  }

  /**
   * Write a config file
   */
  private async writeConfig(filename: string, data: any): Promise<any> {
    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    const filePath = await this.getConfigFilePath(filename);

    // Convert data to string if it's an object
    let content: string;
    if (typeof data === 'string') {
      content = data;
    } else {
      content = JSON.stringify(data, null, 2);
    }

    await writeFile(filePath, content, 'utf-8');

    return {
      success: true,
      operation: 'write',
      filename,
      path: filePath,
      size: content.length,
    };
  }

  /**
   * List all config files
   */
  private async listConfigs(): Promise<any> {
    const configDir = await this.ensureConfigDir();

    const files = await readdir(configDir);
    const configFiles: Array<{ name: string; path: string }> = [];

    for (const file of files) {
      const filePath = path.join(configDir, file);
      try {
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile()) {
          configFiles.push({
            name: file,
            path: filePath,
          });
        }
      } catch {
        // Skip files we can't stat
      }
    }

    return {
      success: true,
      operation: 'list',
      configDir,
      files: configFiles,
    };
  }

  /**
   * Delete a config file
   */
  private async deleteConfig(filename: string): Promise<any> {
    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    const filePath = await this.getConfigFilePath(filename);

    try {
      await fs.promises.unlink(filePath);

      return {
        success: true,
        operation: 'delete',
        filename,
        path: filePath,
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          success: false,
          error: 'Config file not found',
          filename,
          notFound: true,
        };
      }
      throw error;
    }
  }

  /**
   * Check if a config file exists
   */
  private async configExists(filename: string): Promise<any> {
    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    const filePath = await this.getConfigFilePath(filename);

    try {
      await access(filePath);
      return {
        success: true,
        operation: 'exists',
        filename,
        exists: true,
        path: filePath,
      };
    } catch {
      return {
        success: true,
        operation: 'exists',
        filename,
        exists: false,
        path: filePath,
      };
    }
  }

  getDescription(): string {
    return 'Manage configuration files in ~/n2htoolbox/';
  }

  getParameters(): CommandParameter[] {
    return [
      {
        name: 'operation',
        type: 'string',
        description: 'Operation: get-dir, read, write, list, delete, exists',
        required: true,
      },
      {
        name: 'filename',
        type: 'string',
        description: 'Config filename (for read/write/delete/exists)',
        required: false,
      },
      {
        name: 'data',
        type: 'string',
        description: 'Data to write (object or string)',
        required: false,
      },
    ];
  }
}
