export class Caller {
  static async callElectron(): Promise<string> {
    console.log('calling')
    const v = await (window as any).electron.ipcRenderer.invoke('getVersion')
    console.log('called:' + v)
    return v
  }
}
