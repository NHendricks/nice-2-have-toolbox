// Global type definitions for Electron API exposed via preload.js

interface Window {
  electron?: {
    ipcRenderer: {
      send: (channel: string, data?: any) => void
      on: (channel: string, func: (...args: any[]) => void) => void
      invoke: (channel: string, ...args: any[]) => Promise<any>
      onFromMain: (channel: string, callback: (data: any) => void) => void
    }
    clipboard: {
      writeText: (text: string) => void
      readText: () => string
    }
    startDrag: (filePath: string) => void
  }
}
