# X-Tools (Nilsomat)

A modular Electron-based utility application with an extensible command-line backend and interactive UI.

## Overview

X-Tools is a desktop application that provides a flexible framework for running various utility commands through both a CLI interface and a modern web-based UI. Built with TypeScript, Electron, and Lit Elements, it offers a clean architecture for adding new tools and commands.

## Features

- 🎯 **Extensible Command System** - Easy-to-add commands with a plugin-like architecture
- 🖥️ **Dual Interface** - Use commands via CLI or interactive UI
- ⚡ **IPC Communication** - Seamless bridge between Electron and backend
- 📦 **Production Ready** - Build standalone executables
- 🎨 **Modern UI** - Responsive interface built with Lit Elements
- 📝 **TypeScript** - Fully typed codebase

## Project Structure

```
x-tools/
├── backend/         # CLI command system with extensible architecture
├── process/         # Electron main process & IPC handlers
├── ui/              # Frontend UI (Lit Elements + Vite)
├── tools/           # Build scripts for executables
└── version/         # Version tracking
```

## Quick Start

### Development Mode

**Terminal 1 - Start UI:**

```bash
cd ui
npm install
npm run dev
```

**Terminal 2 - Start Electron:**

```bash
cd process
npm install
npm run start
```

### CLI Usage

```bash
# Build backend first
npm run buildBackend

# Run commands directly
node backend/dist/cli.js ping
node backend/dist/cli.js echo "Hello World"
node backend/dist/cli.js calculate '{"operation":"add","a":5,"b":3}'
```

## Building for Production

```bash
npm install
npm run buildElectron
```

The executable will be created in the `dist/` directory.

## Technology Stack

- **Electron** - Desktop application framework
- **TypeScript** - Type-safe development
- **Lit Elements** - Lightweight web components
- **Vite** - Fast build tooling
- **Node.js** - Backend runtime

## Author

Nils Hendricks

## License

MIT
