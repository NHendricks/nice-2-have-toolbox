const { contextBridge, ipcRenderer } = require('electron');

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
});
