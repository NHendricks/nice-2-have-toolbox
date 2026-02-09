import * as fs from 'fs';
import { spawn } from 'child_process';
import { registerCommands } from './register-commands';

// electron/main.js
const {
  app,
  BrowserWindow,
  shell,
  screen,
  globalShortcut,
  clipboard,
  Tray,
  Menu,
  dialog,
} = require('electron');
const path = require('path');
const installExtension = require('electron-devtools-installer').default;
const { REDUX_DEVTOOLS } = require('electron-devtools-installer');

const isDev = process.env.NODE_ENV
  ? process.env.NODE_ENV.startsWith('development')
  : false;

/**
 * Parse .n2henv file and return environment variables
 * Searches in the given directory and parent directories up to root
 * Format: KEY=VALUE (one per line, # for comments)
 */
function loadN2hEnvFile(dirPath: string): Record<string, string> {
  const envVars: Record<string, string> = {};
  let currentDir = dirPath;

  // Search up the directory tree for .n2henv files
  while (currentDir) {
    const envFilePath = path.join(currentDir, '.n2henv');
    if (fs.existsSync(envFilePath)) {
      try {
        const content = fs.readFileSync(envFilePath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          // Skip empty lines and comments
          if (!trimmed || trimmed.startsWith('#')) continue;

          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            let value = trimmed.substring(eqIndex + 1).trim();
            // Remove quotes if present
            if (
              (value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))
            ) {
              value = value.slice(1, -1);
            }
            envVars[key] = value;
          }
        }
        console.log(`[n2henv] Loaded from ${envFilePath}:`, Object.keys(envVars));
        break; // Stop at first .n2henv file found
      } catch (error) {
        console.warn(`[n2henv] Failed to read ${envFilePath}:`, error);
      }
    }

    // Move to parent directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  return envVars;
}

let tray: any = null;
let version = '0.0';
if (!isDev) {
  process.env.NODE_ENV = 'production';
  const versionFilePath = path.join(process.resourcesPath, 'version.txt');
  version = '' + fs.readFileSync(versionFilePath, 'utf8');
} else {
  let versionsfile = path.resolve(__dirname, '../../version/version.txt');
  version = fs.readFileSync(versionsfile, 'utf8');
}

function createTray() {
  // Only create tray on macOS
  if (process.platform !== 'darwin') {
    return;
  }

  // Set tray icon path based on environment
  // Use 16x16 icon for proper macOS menubar sizing
  let trayIconPath: string;
  if (isDev) {
    trayIconPath = path.join(__dirname, '../../assets/icons/icon-16.png');
  } else {
    trayIconPath = path.join(process.resourcesPath, 'icon-16.png');
  }

  tray = new Tray(trayIconPath);

  // Set the icon as a template image for proper Dark Mode support
  tray.setImage(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `nh-toolbox v${version}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show App',
      click: () => {
        if (isQuitting) return;
        const windows = BrowserWindow.getAllWindows();
        if (windows.length > 0) {
          windows[0].show();
          windows[0].focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip('nh-toolbox');
  tray.setContextMenu(contextMenu);

  // On macOS, clicking the tray icon should show/hide the window
  tray.on('click', () => {
    if (isQuitting) return;
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      if (windows[0].isVisible()) {
        windows[0].hide();
      } else {
        windows[0].show();
        windows[0].focus();
      }
    } else {
      createWindow();
    }
  });
}

async function createWindow() {
  if (isQuitting) return;

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Set icon path based on environment and platform
  const windowOptions: any = {
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      backgroundThrottling: false,
    },
  };

  // On macOS, the icon is set via the app bundle - don't set it in BrowserWindow
  // On Windows and Linux, set the icon explicitly
  if (process.platform === 'win32') {
    // Windows uses .ico format
    let iconPath: string;
    if (isDev) {
      iconPath = path.join(__dirname, '../../assets/icons/icon.ico');
    } else {
      iconPath = path.join(process.resourcesPath, '../icon.ico');
    }
    windowOptions.icon = iconPath;
  } else if (process.platform === 'linux') {
    // Linux uses .png format (256x256 is standard for app icons)
    let iconPath: string;
    if (isDev) {
      iconPath = path.join(__dirname, '../../assets/icons/icon-256.png');
    } else {
      // On Linux, icon.png is in the resources folder
      iconPath = path.join(process.resourcesPath, 'icon.png');
    }
    windowOptions.icon = iconPath;
  }

  const win = new BrowserWindow(windowOptions);

  // Register keyboard shortcuts for zoom (especially for German keyboard layouts)
  win.webContents.on('before-input-event', (event: any, input: any) => {
    // Zoom in: Ctrl+Plus (numpad), Ctrl+Shift+Plus, Ctrl+=
    if (input.control && !input.alt && !input.meta) {
      if (
        input.key === '+' ||
        input.key === '=' ||
        input.code === 'NumpadAdd'
      ) {
        event.preventDefault();
        win.webContents.setZoomLevel(win.webContents.getZoomLevel() + 0.5);
      }
      // Zoom out: Ctrl+Minus
      else if (input.key === '-' || input.code === 'NumpadSubtract') {
        event.preventDefault();
        win.webContents.setZoomLevel(win.webContents.getZoomLevel() - 0.5);
      }
      // Reset zoom: Ctrl+0
      else if (input.key === '0' || input.code === 'Numpad0') {
        event.preventDefault();
        win.webContents.setZoomLevel(0);
      }
    }
  });

  // Handle window close - only on macOS hide instead of quit
  win.on('close', (event: any) => {
    if (process.platform === 'darwin' && !isQuitting) {
      // On macOS, hide the window instead of quitting
      event.preventDefault();
      win.hide();
    }
  });

  win.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    // Öffne die URL im Standardbrowser
    shell.openExternal(url);
    return { action: 'deny' }; // Verhindere, dass Electron ein neues Fenster öffnet
  });

  console.log('dev=' + isDev);

  if (isDev) {
    win.loadURL('http://localhost:5173');
    try {
      await installExtension(REDUX_DEVTOOLS);
    } catch (err) {}
    process.on('unhandledRejection', (reason, promise) => {
      console.error('unhandledRejection:', reason);
    });
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../../ui/dist/index.html'));
  }
}

const { ipcMain } = require('electron');
registerCommands(ipcMain, version);

// Clipboard IPC handler
ipcMain.handle('clipboard-write-text', (_event: any, text: string) => {
  try {
    clipboard.writeText(text);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clipboard-read-text', () => {
  try {
    const text = clipboard.readText();
    return { success: true, text };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// File dialog IPC handlers
ipcMain.handle('show-open-dialog', async (_event: any, options: any) => {
  try {
    const result = await dialog.showOpenDialog(options);
    if (result.canceled) {
      return { success: true, canceled: true };
    }
    return { success: true, canceled: false, filePaths: result.filePaths };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-save-dialog', async (_event: any, options: any) => {
  try {
    const result = await dialog.showSaveDialog(options);
    if (result.canceled) {
      return { success: true, canceled: true };
    }
    return { success: true, canceled: false, filePath: result.filePath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-terminal', async (_event: any, dirPath: string) => {
  try {
    const platform = process.platform;
    // Load .n2henv file if present
    const n2hEnv = loadN2hEnvFile(dirPath);
    // Set up environment with NODE_ENV and .n2henv variables
    const env = { ...process.env, NODE_ENV: 'development', ...n2hEnv };

    if (platform === 'win32') {
      // Windows: open cmd.exe in the specified directory
      spawn('cmd.exe', [], {
        cwd: dirPath,
        detached: true,
        stdio: 'ignore',
        shell: true,
        env,
      }).unref();
    } else if (platform === 'darwin') {
      // macOS: open Terminal.app in the specified directory
      spawn('open', ['-a', 'Terminal', dirPath], {
        detached: true,
        stdio: 'ignore',
        env,
      }).unref();
    } else {
      // Linux: try common terminal emulators
      const terminals = ['gnome-terminal', 'konsole', 'xterm'];
      for (const term of terminals) {
        try {
          spawn(term, ['--working-directory=' + dirPath], {
            detached: true,
            stdio: 'ignore',
            env,
          }).unref();
          break;
        } catch {
          continue;
        }
      }
    }
    const n2hEnvKeys = Object.keys(n2hEnv);
    return {
      success: true,
      n2hEnvLoaded: n2hEnvKeys.length > 0 ? n2hEnvKeys : undefined,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// Create application menu with zoom functionality
function createApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template: any[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },

    // View menu
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        {
          label: 'Zoom In',
          role: 'zoomIn',
          accelerator: 'CommandOrControl+=',
        },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  // Set app name for Linux WM_CLASS (needed for dock icon to work)
  if (process.platform === 'linux') {
    app.setName('nh-toolbox');
  }

  createApplicationMenu(); // Create application menu with zoom support
  createTray(); // Will only create tray on macOS
  createWindow();
});

// Track if we're quitting to prevent window recreation
let isQuitting = false;

app.on('window-all-closed', () => {
  // On macOS, keep app running with tray icon
  // On Windows, quit the app
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', (event: any) => {
  isQuitting = true;

  // Destroy tray on macOS
  if (tray && process.platform === 'darwin') {
    try {
      tray.destroy();
      tray = null;
    } catch (err) {
      console.error('Error destroying tray:', err);
    }
  }
});
