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
          console.log('[IPC] ========================================');
          console.log('[IPC] cli-execute called:', { toolname, operation: params?.operation });
          console.log('[IPC] params.operation:', params?.operation);

          // Get command instance to set up progress callback for zip operations
          const command = this.handler.getCommand(toolname);
          console.log('[IPC] Command retrieved:', !!command, 'toolname:', toolname);

          console.log('[IPC] Command retrieved:', !!command);
          console.log('[IPC] Check backup condition:', toolname === 'restic', params?.operation === 'backup', !!command);

          // If it's a file-operations command with zip or copy operation, set up progress callback
          if (
            toolname === 'file-operations' &&
            (params.operation === 'zip' || params.operation === 'copy') &&
            command
          ) {
            const eventName =
              params.operation === 'zip' ? 'zip-progress' : 'copy-progress';

            console.log(
              `[IPC] Setting up progress callback for ${params.operation} operation, event: ${eventName}`,
            );
            console.log(
              '[IPC] setProgressCallback exists:',
              typeof (command as any).setProgressCallback,
            );

            // Set up progress callback to send events to renderer
            (command as any).setProgressCallback?.(
              (current: number, total: number, fileName: string) => {
                console.log(
                  `[IPC] Sending ${eventName}:`,
                  current,
                  total,
                  fileName,
                );
                event.sender?.send(eventName, {
                  current,
                  total,
                  fileName,
                  percentage: Math.round((current / total) * 100),
                });
              },
            );
          }

          // If it's a garbage-finder command with scan operation, set up progress callback
          if (
            toolname === 'garbage-finder' &&
            params.operation === 'scan' &&
            command
          ) {
            console.log(
              '[IPC] Setting up progress callback for garbage-finder scan',
            );

            // Set up progress callback to send events to renderer
            (command as any).setProgressCallback?.(
              (
                foldersScanned: number,
                currentSize: number,
                currentPath: string,
                percentage: number,
                tree: any[],
              ) => {
                event.sender?.send('garbage-scan-progress', {
                  foldersScanned,
                  currentSize,
                  currentPath,
                  percentage,
                  tree,
                });
              },
            );
          }

          // If it's a restic command with backup operation, set up progress callback
          if (
            toolname === 'restic' &&
            params.operation === 'backup' &&
            command
          ) {
            console.log(
              '[IPC] Setting up progress callback for restic backup',
            );
            console.log('[IPC] event.sender available:', !!event.sender);
            console.log('[IPC] command has setProgressCallback:', typeof (command as any).setProgressCallback);

            // Set up progress callback to send events to renderer
            const callbackFn = (progress: any) => {
              console.log('[IPC] Restic progress callback called:', progress);
              if (event.sender) {
                event.sender.send('restic-backup-progress', progress);
                console.log('[IPC] Sent restic-backup-progress event');
              } else {
                console.log('[IPC] WARNING: event.sender is not available!');
              }
            };
            (command as any).setProgressCallback?.(callbackFn);
            console.log('[IPC] Progress callback set, verifying:', !!(command as any).progressCallback);
          }

          // If it's an FTP command with download or upload operation, set up progress callback
          if (
            toolname === 'ftp' &&
            (params.operation === 'download' || params.operation === 'upload') &&
            command
          ) {
            const eventName = params.operation === 'download' ? 'ftp-download-progress' : 'ftp-upload-progress';

            console.log(
              `[IPC] Setting up progress callback for FTP ${params.operation} operation, event: ${eventName}`,
            );

            // Set up progress callback to send events to renderer
            (command as any).setProgressCallback?.(
              (current: number, total: number, fileName: string) => {
                console.log(
                  `[IPC] Sending ${eventName}:`,
                  current,
                  total,
                  fileName,
                );
                event.sender?.send(eventName, {
                  current,
                  total,
                  fileName,
                  percentage: total > 0 ? Math.round((current / total) * 100) : 0,
                });
              },
            );
          }

          const result = await this.handler.execute(toolname, params);

          // Clear progress callback after operation completes
          if (
            toolname === 'file-operations' &&
            (params.operation === 'zip' || params.operation === 'copy') &&
            command
          ) {
            (command as any).setProgressCallback?.(undefined);
          }

          // Clear garbage-finder progress callback after operation completes
          if (
            toolname === 'garbage-finder' &&
            params.operation === 'scan' &&
            command
          ) {
            (command as any).setProgressCallback?.(undefined);
          }

          // Clear restic progress callback after operation completes
          if (
            toolname === 'restic' &&
            params.operation === 'backup' &&
            command
          ) {
            (command as any).setProgressCallback?.(undefined);
          }

          // Clear FTP progress callback after operation completes
          if (
            toolname === 'ftp' &&
            (params.operation === 'download' || params.operation === 'upload') &&
            command
          ) {
            (command as any).setProgressCallback?.(undefined);
          }

          return {
            success: true,
            data: result,
            toolname: toolname,
            timestamp: new Date().toISOString(),
          };
        } catch (error: any) {
          // Clear progress callback on error
          if (
            toolname === 'file-operations' &&
            (params.operation === 'zip' || params.operation === 'copy')
          ) {
            const command = this.handler.getCommand(toolname);
            if (command) {
              (command as any).setProgressCallback?.(undefined);
            }
          }

          // Clear garbage-finder progress callback on error
          if (toolname === 'garbage-finder' && params.operation === 'scan') {
            const command = this.handler.getCommand(toolname);
            if (command) {
              (command as any).setProgressCallback?.(undefined);
            }
          }

          // Clear restic progress callback on error
          if (toolname === 'restic' && params.operation === 'backup') {
            const command = this.handler.getCommand(toolname);
            if (command) {
              (command as any).setProgressCallback?.(undefined);
            }
          }

          // Clear FTP progress callback on error
          if (toolname === 'ftp' && (params.operation === 'download' || params.operation === 'upload')) {
            const command = this.handler.getCommand(toolname);
            if (command) {
              (command as any).setProgressCallback?.(undefined);
            }
          }

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
