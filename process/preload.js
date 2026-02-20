const { contextBridge, ipcRenderer, clipboard, webUtils } = require('electron');

// Expose versions safely in sandbox mode
const versions = process.versions || {};

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector);
    if (element) element.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    if (versions[type]) {
      replaceText(`${type}-version`, versions[type]);
    }
  }
});

contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel, data) => {
      ipcRenderer.send(channel, data);
    },
    on: (channel, func) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    invoke: (channel, ...args) => {
      return ipcRenderer.invoke(channel, ...args);
    },
    onFromMain: (channel, callback) => {
      ipcRenderer.on(channel, (_, data) => callback(data));
    },
  },
  clipboard: {
    writeText: (text) => {
      clipboard.writeText(text);
    },
    readText: () => {
      return clipboard.readText();
    },
  },
  startDrag: (filePath) => {
    ipcRenderer.send('start-drag', filePath);
  },
  getPathForFile: (file) => {
    return webUtils.getPathForFile(file);
  },
});
