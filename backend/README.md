# Backend CLI Application

Eine flexible Command-Line Interface (CLI) Anwendung mit IPC-Unterstützung für Electron-Apps.

## Features

- ✅ **Kommandozeilen-Interface**: Direkt per Node aufrufbar
- ✅ **JSON-Rückgabe**: Alle Befehle geben strukturierte JSON-Antworten zurück
- ✅ **IPC-Integration**: Einfache Integration in Electron-Apps
- ✅ **Erweiterbar**: Neue Befehle können einfach hinzugefügt werden
- ✅ **TypeScript**: Vollständig typisiert

## Installation

```bash
cd backend
npm install
npm run build
```

## CLI Verwendung

### Grundlegende Syntax

```bash
node dist/cli.js <toolname> [params]
```

### Verfügbare Befehle

#### 1. **help** - Zeigt alle verfügbaren Befehle

```bash
node dist/cli.js help
```

Ausgabe:

```json
{
  "success": true,
  "data": {
    "availableCommands": {
      "ping": "Simple ping command - returns Pong with timestamp",
      "echo": "Echo command - returns the input parameters",
      "calculate": "Calculate command - performs basic arithmetic operations",
      "help": "Help command - lists all available commands"
    },
    "usage": "node cli.js <toolname> [params]"
  },
  "toolname": "help",
  "timestamp": "2026-01-24T11:00:00.000Z"
}
```

#### 2. **ping** - Einfacher Test-Befehl

```bash
node dist/cli.js ping
```

Ausgabe:

```json
{
  "success": true,
  "data": {
    "message": "Pong",
    "params": "",
    "timestamp": "2026-01-24T11:00:00.000Z"
  },
  "toolname": "ping",
  "timestamp": "2026-01-24T11:00:00.000Z"
}
```

#### 3. **echo** - Gibt Parameter zurück

```bash
node dist/cli.js echo "Hello World"
```

Ausgabe:

```json
{
  "success": true,
  "data": {
    "echo": "Hello World",
    "type": "string"
  },
  "toolname": "echo",
  "timestamp": "2026-01-24T11:00:00.000Z"
}
```

#### 4. **calculate** - Mathematische Operationen

```bash
# Addition
node dist/cli.js calculate "{\"operation\":\"add\",\"a\":5,\"b\":3}"

# Subtraktion
node dist/cli.js calculate "{\"operation\":\"subtract\",\"a\":10,\"b\":4}"

# Multiplikation
node dist/cli.js calculate "{\"operation\":\"multiply\",\"a\":7,\"b\":6}"

# Division
node dist/cli.js calculate "{\"operation\":\"divide\",\"a\":20,\"b\":5}"
```

Ausgabe (Addition):

```json
{
  "success": true,
  "data": {
    "operation": "add",
    "a": 5,
    "b": 3,
    "result": 8
  },
  "toolname": "calculate",
  "timestamp": "2026-01-24T11:00:00.000Z"
}
```

### NPM Scripts

```bash
# Alle Tests ausführen
npm test

# Einzelne Befehle testen
npm run test:ping
npm run test:echo
npm run test:calculate
npm run test:help
```

## IPC Integration für Electron

### Setup in main.ts

```typescript
import { IpcBridge } from '../backend/ipc-bridge';

const { ipcMain } = require('electron');

// IPC Bridge initialisieren
const ipcBridge = new IpcBridge();
ipcBridge.registerIpcHandlers(ipcMain);

app.whenReady().then(createWindow);
```

### Verwendung im Renderer (Frontend)

```typescript
// Generischer Aufruf
const result = await window.electron.invoke('cli-execute', 'ping', null);
console.log(result);

// Spezifischer Befehl
const pingResult = await window.electron.invoke('cli-ping', null);
const echoResult = await window.electron.invoke('cli-echo', 'Hello');
const calcResult = await window.electron.invoke('cli-calculate', {
  operation: 'add',
  a: 5,
  b: 3,
});
```

### Preload Setup

Stelle sicher, dass in `preload.js` die IPC-Methoden exponiert sind:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
});
```

## Eigene Befehle erstellen

### 1. Neuen Befehl implementieren

Erstelle eine neue Datei z.B. `backend/commands/my-command.ts`:

```typescript
import { ICommand } from './command-interface';

export class MyCommand implements ICommand {
  async execute(params: any): Promise<any> {
    // Deine Logik hier
    return {
      result: 'Mein Ergebnis',
      params: params,
    };
  }

  getDescription(): string {
    return 'Beschreibung meines Befehls';
  }
}
```

### 2. Befehl registrieren

In `backend/commands/command-registry.ts`:

```typescript
import { MyCommand } from './my-command';

private registerDefaultCommands(): void {
  // ... bestehende Befehle
  this.register('mycommand', new MyCommand());
}
```

### 3. Neu kompilieren und testen

```bash
npm run build
node dist/cli.js mycommand "test params"
```

## Struktur

```
backend/
├── cli.ts                      # CLI Entry Point
├── command-handler.ts          # Command Executor
├── ipc-bridge.ts              # IPC Integration
├── commands/
│   ├── command-interface.ts   # Command Interface
│   ├── command-registry.ts    # Command Registry
│   ├── ping-command.ts        # Ping Command
│   ├── echo-command.ts        # Echo Command
│   ├── calculate-command.ts   # Calculate Command
│   └── help-command.ts        # Help Command
├── package.json
├── tsconfig.json
├── test.js                    # Test Suite
└── README.md
```

## Fehlerbehandlung

Bei Fehlern gibt die CLI einen strukturierten Error zurück:

```json
{
  "success": false,
  "error": "Unknown command: xyz",
  "toolname": "xyz",
  "timestamp": "2026-01-24T11:00:00.000Z"
}
```

Exit Codes:

- `0`: Erfolg
- `1`: Fehler

## Entwicklung

```bash
# TypeScript im Watch-Modus
npm run dev

# In anderem Terminal: Tests ausführen
npm test
```

## License

MIT
