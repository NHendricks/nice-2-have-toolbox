import { IpcMainInvokeEvent } from 'electron';
const { app, clipboard } = require('electron');

export function registerCommands(ipcMain: any, version: string) {
  // BEISPIELE
  ipcMain.handle('ping', () => 'Pong');
  ipcMain.handle('getVersion', () => version);

  // Backend CLI Commands - dynamically load available commands
  ipcMain.handle('cli-getCommands', async () => {
    try {
      const { spawn } = require('child_process');
      const path = require('path');

      return new Promise((resolve) => {
        const cliPath = path.join(__dirname, '../../backend/dist/cli.js');
        const child = spawn('node', [cliPath, 'help']);

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', () => {
          try {
            const result = JSON.parse(stdout);
            if (
              result.success &&
              result.data &&
              result.data.availableCommands
            ) {
              resolve({
                success: true,
                data: result.data.availableCommands,
              });
            } else {
              resolve({ success: false, error: 'Invalid response from CLI' });
            }
          } catch (error: any) {
            resolve({
              success: false,
              error: stderr || error.message || 'Failed to parse response',
            });
          }
        });
      });
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'cli-execute',
    async (event: IpcMainInvokeEvent, toolname: string, params: any) => {
      try {
        // Import dynamically to avoid TS issues
        const { spawn } = require('child_process');
        const path = require('path');

        return new Promise((resolve) => {
          const cliPath = path.join(__dirname, '../../backend/dist/cli.js');
          let args = [cliPath, toolname];

          // Add params if provided - pass as JSON string if it's an object
          if (params !== null && params !== undefined) {
            const paramString =
              typeof params === 'string' ? params : JSON.stringify(params);
            args.push(paramString);
          }

          const child = spawn('node', args);

          let stdout = '';
          let stderr = '';

          child.stdout.on('data', (data: Buffer) => {
            stdout += data.toString();
          });

          child.stderr.on('data', (data: Buffer) => {
            stderr += data.toString();
          });

          child.on('close', () => {
            try {
              const result = JSON.parse(stdout);
              resolve(result);
            } catch {
              resolve({
                success: false,
                error: stderr || 'Failed to parse response',
              });
            }
          });
        });
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
  ipcMain.handle(
    'copy2Clipboard',
    (event: IpcMainInvokeEvent, aString: string) => {
      clipboard.writeText(aString);
    },
  );
  ipcMain.handle(
    'asyncPing',
    async (event: IpcMainInvokeEvent, aString: string) => {
      const params = aString;

      // Beispiel: POST-Request mit params als JSON
      const response = await fetch('https://www.spielfreunde.de/rsvp/home', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: params,
      });

      // Antwort als Text oder JSON zurückgeben
      const result = await response.text();
      return result;
    },
  );
}
