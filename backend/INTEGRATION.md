# Integration der Backend CLI in Electron

## So integrierst du die CLI in deine bestehende Electron-App

### Schritt 1: IPC Bridge in main.ts einbinden

Füge folgende Zeilen in `process/main.ts` hinzu:

```typescript
// Oben bei den Imports
import { IpcBridge } from '../backend/ipc-bridge';

// Vor app.whenReady()
const { ipcMain } = require('electron');
const ipcBridge = new IpcBridge();
ipcBridge.registerIpcHandlers(ipcMain);
```

### Vollständiges Beispiel für process/main.ts:

```typescript
import * as fs from 'fs';
import { registerCommands } from './register-commands';
import { IpcBridge } from '../backend/ipc-bridge'; // NEU

const {
  app,
  BrowserWindow,
  shell,
  screen,
  globalShortcut,
  ipcMain, // NEU: hier direkt importieren
} = require('electron');

// ... dein bestehender Code ...

// NEU: Backend CLI über IPC verfügbar machen
const ipcBridge = new IpcBridge();
ipcBridge.registerIpcHandlers(ipcMain);

// Deine bestehenden IPC Commands
registerCommands(ipcMain, version);

app.whenReady().then(createWindow);
// ... rest deines Codes ...
```

### Schritt 2: Frontend - Verwendung im UI

In deinem Frontend-Code (z.B. `ui/src/js/app.ts` oder anderen Komponenten):

```typescript
// Beispiel: Ping Befehl aufrufen
const result = await window.electron.invoke('cli-ping', null);
console.log(result);
// Output: { success: true, data: { message: "Pong", ... }, ... }

// Beispiel: Echo Befehl
const echoResult = await window.electron.invoke('cli-echo', 'Hallo Backend!');
console.log(echoResult.data.echo); // "Hallo Backend!"

// Beispiel: Calculate Befehl
const calcResult = await window.electron.invoke('cli-calculate', {
  operation: 'multiply',
  a: 7,
  b: 6,
});
console.log(calcResult.data.result); // 42

// Generischer Aufruf für alle Befehle
const genericResult = await window.electron.invoke('cli-execute', 'ping', null);
```

### Schritt 3: Preload.js überprüfen

Stelle sicher, dass dein `process/preload.js` die IPC-Aufrufe exponiert:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
```

### Verfügbare IPC-Channels

Nach der Integration stehen folgende Channels zur Verfügung:

- `cli-execute` - Generischer Aufruf: `(toolname: string, params: any)`
- `cli-ping` - Direkt: `(params: any)`
- `cli-echo` - Direkt: `(params: any)`
- `cli-calculate` - Direkt: `(params: any)`
- `cli-help` - Direkt: `(params: any)`

## Beispiel-Komponente

```typescript
// ui/src/js/backend-tester.ts
export class BackendTester {
  async testBackend() {
    try {
      // Test Ping
      const pingResult = await window.electron.invoke('cli-ping', null);
      console.log('✅ Ping:', pingResult);

      // Test Echo
      const echoResult = await window.electron.invoke('cli-echo', 'Test 123');
      console.log('✅ Echo:', echoResult);

      // Test Calculate
      const calcResult = await window.electron.invoke('cli-calculate', {
        operation: 'add',
        a: 100,
        b: 50,
      });
      console.log('✅ Calculate:', calcResult);

      // Test Help
      const helpResult = await window.electron.invoke('cli-help', null);
      console.log('✅ Available commands:', helpResult.data.availableCommands);
    } catch (error) {
      console.error('❌ Backend test failed:', error);
    }
  }
}

// Verwendung
const tester = new BackendTester();
tester.testBackend();
```

## Eigene Befehle hinzufügen

1. Erstelle neue Datei: `backend/commands/my-command.ts`
2. Implementiere `ICommand` Interface
3. Registriere in `backend/commands/command-registry.ts`
4. Neu kompilieren: `npm run build` im backend-Verzeichnis
5. Automatisch verfügbar als `cli-mycommand` im IPC

## Troubleshooting

**Problem**: IPC-Channel nicht gefunden

- Lösung: Electron-App neu starten nach Backend-Änderungen

**Problem**: TypeScript-Fehler bei Electron

- Lösung: `npm install electron --save-dev` im process-Verzeichnis

**Problem**: Module nicht gefunden

- Lösung: Backend neu kompilieren mit korrekten .js Extensions in Imports
