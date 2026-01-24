import * as fs from 'fs';
import { registerCommands } from './register-commands';

// electron/main.js
const {
  app,
  BrowserWindow,
  shell,
  screen,
  globalShortcut,
} = require('electron');
const path = require('path');
const installExtension = require('electron-devtools-installer').default;
const { REDUX_DEVTOOLS } = require('electron-devtools-installer');

const isDev = process.env.NODE_ENV
  ? process.env.NODE_ENV.startsWith('development')
  : false;

let version = '0.0';
if (!isDev) {
  process.env.NODE_ENV = 'production';
  const versionFilePath = path.join(process.resourcesPath, 'version.txt');
  version = '' + fs.readFileSync(versionFilePath, 'utf8');
} else {
  let versionsfile = path.resolve(__dirname, '../../version/version.txt');
  version = fs.readFileSync(versionsfile, 'utf8');
}

async function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  let path2Icon = '../../../public/';
  if (isDev) {
    path2Icon = '../../renderer/src/public/';
  }

  const win = new BrowserWindow({
    width: width,
    height: height,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      backgroundThrottling: false,
    },
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
app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
