/**
 * IPC Bridge
 * Provides IPC integration for Electron apps (or other IPC systems)
 * Registers CLI commands as IPC handlers
 */

import { CommandHandler } from './command-handler.js';

/**
 * Generic IPC event interface
 * Compatible with Electron's IpcMainInvokeEvent and other IPC systems
 */
export interface IpcEvent {
  sender?: any;
  [key: string]: any;
}

export class IpcBridge {
  private handler: CommandHandler;

  constructor() {
    this.handler = new CommandHandler();
  }

  /**
   * Register all CLI commands as IPC handlers
   * Usage: ipcBridge.registerIpcHandlers(ipcMain);
   * @param ipcMain - IPC main instance (e.g., Electron's ipcMain)
   */
  registerIpcHandlers(ipcMain: any): void {
    // Generic handler that forwards all IPC calls to CLI commands
    ipcMain.handle(
      'cli-execute',
      async (event: IpcEvent, toolname: string, params: any) => {
        try {
          // Get command instance to set up progress callback for zip operations
          const command = this.handler.getCommand(toolname);

          // If it's a file-operations command with zip operation, set up progress callback
          if (
            toolname === 'file-operations' &&
            params.operation === 'zip' &&
            command
          ) {
            // Set up progress callback to send events to renderer
            (command as any).setProgressCallback?.(
              (current: number, total: number, fileName: string) => {
                event.sender?.send('zip-progress', {
                  current,
                  total,
                  fileName,
                  percentage: Math.round((current / total) * 100),
                });
              },
            );
          }

          const result = await this.handler.execute(toolname, params);
          return {
            success: true,
            data: result,
            toolname: toolname,
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message || 'Unknown error',
            toolname: toolname,
            timestamp: new Date().toISOString(),
          };
        }
      },
    );

    // Also register individual handlers for each command
    const commands = this.handler.listCommands();
    commands.forEach((commandName) => {
      ipcMain.handle(
        `cli-${commandName}`,
        async (event: IpcEvent, params: any) => {
          try {
            const result = await this.handler.execute(commandName, params);
            return {
              success: true,
              data: result,
              toolname: commandName,
              timestamp: new Date().toISOString(),
            };
          } catch (error: any) {
            return {
              success: false,
              error: error.message || 'Unknown error',
              toolname: commandName,
              timestamp: new Date().toISOString(),
            };
          }
        },
      );
    });

    console.log(
      `[IPC Bridge] Registered ${commands.length} CLI commands as IPC handlers`,
    );
    console.log('[IPC Bridge] Available commands:', commands.join(', '));
  }
}
