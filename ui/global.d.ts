export {}

declare global {
  interface Window {
    process: {
      platform: 'darwin' | 'linux' | 'win32'
    }
    electron: {
      ipcRenderer: {
        invoke: (channel: string, ...args: any[]) => Promise<any>
      }
    }
  }
}

declare module '*.json' {
  const value: any
  export default value
}
