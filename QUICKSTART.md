# 🚀 Quick Start - Backend CLI Interface

## Deine neue interaktive UI ist fertig!

Die Start-Seite zeigt jetzt alle Backend-Commands dynamisch an. Bei Klick auf einen Command öffnet sich ein Dialog zur Eingabe der Parameter, und das Ergebnis wird schön formatiert angezeigt.

## So startest du die App:

### Terminal 1: UI starten

```bash
cd ui
npm run dev
```

### Terminal 2: Electron Process starten

```bash
cd process
npm run start
```

## Was wurde implementiert:

### ✅ Backend CLI (bereits fertig)

- 📁 Verzeichnis: `backend/`
- 4 Befehle: `ping`, `echo`, `calculate`, `help`
- Alle Commands geben strukturiertes JSON zurück
- Kompiliert nach `backend/dist/`

### ✅ IPC-Integration

- 📁 Datei: `process/register-commands.ts`
- Zwei neue IPC-Handler:
  - `cli-getCommands` - Lädt alle verfügbaren Commands
  - `cli-execute` - Führt einen Command aus
- Spawnt Node-Prozess für CLI-Ausführung

### ✅ Interaktive UI auf Start-Seite

- 📁 Datei: `ui/src/js/simpleweb/boundary/pages/Start.ts`
- **Features:**
  - 🎨 Schöne Command-Karten in Grid-Layout
  - 💬 Modal-Dialog für Parameter-Eingabe
  - ⚡ Live-Ausführung der Commands
  - ✅ Formatierte Ergebnis-Anzeige (Erfolg/Fehler)
  - 📱 Responsive Design

## Verfügbare Commands in der UI:

### 1. **ping**

- Keine Parameter nötig
- Gibt "Pong" mit Timestamp zurück

### 2. **echo**

- Parameter: Beliebiger Text
- Standard: "Hello from Backend CLI!"
- Gibt den Text zurück

### 3. **calculate**

- Parameter: JSON-Objekt
- Standard: `{"operation":"add","a":5,"b":3}`
- Operationen: `add`, `subtract`, `multiply`, `divide`

### 4. **help**

- Keine Parameter nötig
- Zeigt alle verfügbaren Commands

## So verwendest du die UI:

1. **Start-Seite öffnen** (Standardmäßig geladen)
2. **Command auswählen** - Klicke auf eine der bunten Karten
3. **Parameter eingeben** - Im Dialog erscheinen Standardwerte
4. **Ausführen** - Klicke auf "Ausführen"
5. **Ergebnis ansehen** - Wird automatisch unter den Karten angezeigt

## Beispiel-Flows:

### Ping testen:

1. Klick auf "ping" Karte
2. Klick auf "Ausführen" (keine Parameter nötig)
3. Siehst "Pong" mit Timestamp ✅

### Rechnung durchführen:

1. Klick auf "calculate" Karte
2. Ändere z.B. zu: `{"operation":"multiply","a":7,"b":6}`
3. Klick auf "Ausführen"
4. Siehst Ergebnis: 42 ✅

### Echo testen:

1. Klick auf "echo" Karte
2. Gib ein: "Hello World!"
3. Klick auf "Ausführen"
4. Siehst deinen Text zurück ✅

## Technische Details:

### UI-Komponente (Start.ts):

- **Lit Element** mit TypeScript
- **Reactive Properties** für State-Management
- **CSS-in-JS** für Styling
- **IPC Communication** mit Electron

### IPC-Flow:

```
UI (Start.ts)
  ↓ invoke('cli-execute', toolname, params)
Electron Main (register-commands.ts)
  ↓ spawn('node', ['backend/dist/cli.js', toolname, params])
Backend CLI (cli.ts)
  ↓ CommandHandler → Command → Execute
  ↑ JSON Response
Electron Main
  ↑ JSON Response
UI (Start.ts)
  → Anzeige in result-container
```

## Neue Commands hinzufügen:

1. **Backend**: Neue Datei in `backend/commands/`
2. **Registrieren**: In `backend/commands/command-registry.ts`
3. **Update Liste**: In `process/register-commands.ts` → `cli-getCommands`
4. **Kompilieren**: `npx tsc` im backend-Verzeichnis
5. **Neu laden**: Electron-App neustarten

## Debugging:

### Backend CLI testen (ohne UI):

```bash
node backend/dist/cli.js ping
node backend/dist/cli.js echo "test"
node backend/dist/cli.js calculate '{"operation":"add","a":5,"b":3}'
```

### DevTools öffnen:

- Automatisch im Development-Mode
- Siehe Console für Logs
- Network-Tab für IPC-Calls

## Styling anpassen:

Alle Styles sind in `Start.ts` → `static styles` definiert:

- `.command-card` - Karten-Design
- `.dialog` - Modal-Dialog
- `.result-container` - Ergebnis-Anzeige

## 🎉 Fertig!

Du hast jetzt eine vollständige Backend-CLI mit interaktiver UI!
