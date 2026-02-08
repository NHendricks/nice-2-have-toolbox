import { IpcMainInvokeEvent } from 'electron';
const { app, clipboard } = require('electron');

// Shared CommandHandler instance to maintain state across IPC calls
let sharedHandler: any = null;

function getCommandHandler() {
  if (!sharedHandler) {
    const path = require('path');
    const commandHandlerPath = path.join(
      __dirname,
      '../../backend/dist/command-handler.js',
    );
    const { CommandHandler } = require(commandHandlerPath);
    sharedHandler = new CommandHandler();
  }
  return sharedHandler;
}

export function registerCommands(ipcMain: any, version: string) {
  ipcMain.handle('ping', () => 'Pong');
  ipcMain.handle('getVersion', () => version);

  // Backend CLI Commands - dynamically load available commands
  ipcMain.handle('cli-getCommands', async () => {
    try {
      const handler = getCommandHandler();

      // Execute help command to get available commands
      const result = await handler.execute('help', null);

      if (result && result.availableCommands) {
        return {
          success: true,
          data: result.availableCommands,
        };
      } else {
        return { success: false, error: 'Invalid response from help command' };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'cli-execute',
    async (event: IpcMainInvokeEvent, toolname: string, params: any) => {
      try {
        // Use shared handler to maintain state
        const handler = getCommandHandler();

        // Get command instance for progress callback setup
        const command = handler.getCommand(toolname);

        // If it's a file-operations command with zip, copy, compare, directory-size, or search operation, set up progress callback
        if (
          toolname === 'file-operations' &&
          (params.operation === 'zip' ||
            params.operation === 'copy' ||
            params.operation === 'compare' ||
            params.operation === 'directory-size' ||
            params.operation === 'search') &&
          command
        ) {
          const eventName =
            params.operation === 'zip'
              ? 'zip-progress'
              : params.operation === 'compare'
                ? 'compare-progress'
                : params.operation === 'directory-size'
                  ? 'directory-size-progress'
                  : params.operation === 'search'
                    ? 'search-progress'
                    : 'copy-progress';

          // Reset cancellation flag before starting
          (command as any).resetCancellation?.();

          // Set up progress callback to send events to renderer
          (command as any).setProgressCallback?.(
            (current: number, total: number, fileName: string) => {
              // For directory-size, 'total' is the accumulated size, not a count
              if (params.operation === 'directory-size') {
                event.sender?.send(eventName, {
                  current,
                  totalSize: total,
                  fileName,
                });
              } else if (params.operation === 'search') {
                // For search, 'current' is files scanned, 'total' is 0 (unknown)
                event.sender?.send(eventName, {
                  filesScanned: current,
                  currentFile: fileName,
                });
              } else {
                event.sender?.send(eventName, {
                  current,
                  total,
                  fileName,
                  percentage: Math.round((current / total) * 100),
                });
              }
            },
          );
        }

        // If it's a garbage-finder command with scan operation, set up progress callback
        if (
          toolname === 'garbage-finder' &&
          params.operation === 'scan' &&
          command
        ) {
          // Reset cancellation flag before starting
          (command as any).resetCancellation?.();

          // Set up progress callback to send events to renderer
          (command as any).setProgressCallback?.(
            (
              foldersScanned: number,
              currentSize: number,
              currentPath: string,
              percentage: number,
            ) => {
              event.sender?.send('garbage-scan-progress', {
                foldersScanned,
                currentSize,
                currentPath,
                percentage,
              });
            },
          );
        }

        // Execute command directly
        const result = await handler.execute(toolname, params);

        // Clear progress callback after operation completes
        if (
          toolname === 'file-operations' &&
          (params.operation === 'zip' ||
            params.operation === 'copy' ||
            params.operation === 'compare' ||
            params.operation === 'directory-size' ||
            params.operation === 'search') &&
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
          (params.operation === 'zip' ||
            params.operation === 'copy' ||
            params.operation === 'compare' ||
            params.operation === 'directory-size' ||
            params.operation === 'search')
        ) {
          const handler = getCommandHandler();
          const command = handler.getCommand(toolname);
          if (command) {
            (command as any).setProgressCallback?.(undefined);
          }
        }

        // Clear garbage-finder progress callback on error
        if (toolname === 'garbage-finder' && params.operation === 'scan') {
          const handler = getCommandHandler();
          const command = handler.getCommand(toolname);
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
  ipcMain.handle(
    'copy2Clipboard',
    (event: IpcMainInvokeEvent, aString: string) => {
      clipboard.writeText(aString);
    },
  );

  // Cancel file operations
  ipcMain.handle('cancel-file-operation', async () => {
    try {
      // Use shared handler to cancel operations on the same instance
      const handler = getCommandHandler();
      const command = handler.getCommand('file-operations');

      if (command) {
        (command as any).cancel?.();
        return { success: true };
      }

      return { success: false, error: 'Command not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Cancel garbage-finder scan
  ipcMain.handle('cancel-garbage-scan', async () => {
    try {
      // Use shared handler to cancel operations on the same instance
      const handler = getCommandHandler();
      const command = handler.getCommand('garbage-finder');

      if (command) {
        (command as any).cancel?.();
        return { success: true };
      }

      return { success: false, error: 'Command not found' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
