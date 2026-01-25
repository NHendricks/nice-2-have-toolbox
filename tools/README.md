# 🛠️ Electron Build Tools

Manueller Build für die Electron-Anwendung **ohne ASAR-Archiv** (direkter Ordner-Zugriff).

## 🎯 Was macht das Tool?

1. **Kopiert Electron** aus `node_modules/electron/dist` → `build-output/`
2. **Sammelt App-Content** (Backend, Process, UI) → `app-content/`
3. **Kopiert App-Ordner** direkt nach `resources/app/` (kein ASAR!)
4. **Kopiert version.txt** nach `resources/`

## 📦 Installation

```bash
cd tools
npm install
```

## 🚀 Verwendung

### 1. Zuerst alle Komponenten bauen:

```bash
# Im Root-Verzeichnis
npm run buildBackend
npm run buildUI
npm run buildProcess
```

### 2. Dann Electron-App bauen:

**Für Windows:**

```bash
cd tools
npm run build
```

**Für Mac:**

```bash
cd tools
npm run build-mac
```

**Alternative mit ASAR (falls gewünscht):**

```bash
cd tools
npm run build:asar
```

### 3. App starten:

**Windows:**

```bash
# Aus build-output
d:\dev\_nas\test\build-output\nh-tools.exe
```

**Mac:**

```bash
# Aus build-output
open build-output/nh-tools.app
```

## 📂 Struktur

```
tools/
├── package.json          # Dependencies: fs-extra, electron
├── build.js              # Windows Build-Script (ohne ASAR)
├── build-mac.js          # Mac Build-Script (ohne ASAR)
├── build-asar.js         # Alternatives Script (mit ASAR)
└── README.md            # Diese Datei

Nach dem Build:
├── app-content/          # Temporärer App-Content
│   ├── backend/dist/
│   ├── process/dist/
│   ├── ui/dist/
│   └── package.json
└── build-output/         # Fertige Electron-App
    ├── x-tools.exe
    ├── resources/
    │   ├── app/          # Deine App als Ordner (kein ASAR!)
    │   │   ├── backend/
    │   │   ├── process/
    │   │   ├── ui/
    │   │   └── package.json
    │   └── version.txt
    └── ...
```

## 🔧 Was wird kopiert?

### Aus dem Projekt:

- `backend/dist/` → Backend CLI Commands
- `process/dist/` → Electron Main Process
- `process/node_modules/` → Runtime Dependencies
- `ui/dist/` → Frontend (Vite Build)
- `package.json` → App Manifest
- `version/version.txt` → Version Info

### Aus node_modules:

- `electron/dist/` → Komplette Electron Runtime

## ⚙️ Script-Ablauf (build.js - Windows)

```
1. 📁 Prepare directories
   └── Clean old build-output & app-content

2. 📦 Copy Electron
   └── node_modules/electron/dist → build-output

3. 📋 Prepare app content
   ├── backend/dist → app-content/backend/dist
   ├── process/dist → app-content/process/dist
   ├── process/node_modules → app-content/process/node_modules
   ├── ui/dist → app-content/ui/dist
   └── package.json → app-content/package.json

4. 📂 Copy app folder
   └── app-content → build-output/resources/app (direkter Ordner!)

5. 📄 Copy version.txt
   └── version/version.txt → build-output/resources/version.txt

6. 🏷️ Rename executable
   └── electron.exe → nh-tools.exe

7. ✅ Done!
```

## ⚙️ Script-Ablauf (build-mac.js - Mac)

```
1. 📁 Prepare directories
   └── Clean old build-output & app-content

2. 📦 Copy Electron
   └── node_modules/electron/dist → build-output

3. 📋 Prepare app content
   ├── backend/dist → app-content/backend/dist
   ├── process/dist → app-content/process/dist
   ├── process/node_modules → app-content/process/node_modules
   ├── ui/dist → app-content/ui/dist
   └── package.json → app-content/package.json

4. 📂 Copy app folder
   └── app-content → build-output/Electron.app/Contents/Resources/app

5. 📄 Copy version.txt
   └── version/version.txt → build-output/Electron.app/Contents/Resources/version.txt

6. 🏷️ Rename app bundle
   └── Electron.app → nh-tools.app

7. 🏷️ Rename executable
   └── Contents/MacOS/Electron → Contents/MacOS/nh-tools

8. 📝 Update Info.plist
   └── CFBundleExecutable, CFBundleName, CFBundleDisplayName → nh-tools

9. ✅ Done!
```

## 💡 Vorteile: Ohne ASAR vs. Mit ASAR

### ✅ Ohne ASAR (Standard: `npm run build`)

- ✅ **Debugging einfacher** - Dateien direkt lesbar
- ✅ **Entwicklung schneller** - Keine ASAR-Kompression
- ✅ **Flexibler** - Einzelne Dateien können direkt geändert werden
- ✅ **Transparenter** - Vollständiger Dateizugriff
- ⚠️ **Größer** - Keine Kompression

### 🗜️ Mit ASAR (Optional: `npm run build:asar`)

- ✅ **Kompakter** - Alle Dateien in einem Archiv
- ✅ **Schnellerer Start** - Weniger Dateizugriffe
- ✅ **Schutz** - Leichter Quellcode-Schutz
- ⚠️ **Debugging komplexer** - ASAR muss extrahiert werden

## 🔍 Debugging (ohne ASAR)

### App-Struktur inspizieren:

```bash
# Direkter Zugriff auf alle Dateien
dir build-output\resources\app
dir build-output\resources\app\backend\dist
dir build-output\resources\app\process\dist
dir build-output\resources\app\ui\dist
```

### Einzelne Dateien bearbeiten:

```bash
# Dateien können direkt geändert werden
notepad build-output\resources\app\package.json
```

## 🔍 Debugging (mit ASAR)

### ASAR inspizieren:

```bash
npx @electron/asar extract build-output/resources/app.asar extracted-app
```

### ASAR-Inhalt auflisten:

```bash
npx @electron/asar list build-output/resources/app.asar
```

## 📝 Hinweise

- **Standard-Build** verwendet **kein ASAR** mehr (direkter Ordner-Zugriff)
- **ASAR-Build** ist weiterhin verfügbar (`npm run build:asar`)
- **electron-builder** bleibt vorerst AS-IS (nicht gelöscht)
- Für Production-Builds mit Signing nutze weiterhin electron-builder
- Für schnelle Dev-Builds nutze dieses Tool

## 🚦 Status

- ✅ Backend CLI Integration
- ✅ Direkter Ordner-Build (ohne ASAR)
- ✅ ASAR-Build (optional)
- ✅ version.txt Copy
- ✅ Electron Runtime Copy
- 🔄 Später: Executable renaming, Icon injection, etc.

## 📊 Vergleich

| Feature      | Ohne ASAR       | Mit ASAR             |
| ------------ | --------------- | -------------------- |
| Build-Befehl | `npm run build` | `npm run build:asar` |
| Dateizugriff | Direkt          | Via ASAR-API         |
| Debugging    | Einfach         | Komplex              |
| Dateigröße   | Größer          | Kleiner              |
| Performance  | Gut             | Besser               |
| Entwicklung  | ⭐⭐⭐⭐⭐      | ⭐⭐⭐               |
| Production   | ⭐⭐⭐          | ⭐⭐⭐⭐⭐           |
