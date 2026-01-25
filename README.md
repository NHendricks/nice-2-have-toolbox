# nh-toolbox (https://github.com/NHendricks/nh-toolbox)

A modular Electron-based utility application with an extensible command-line backend and interactive UI.

**Changelog** see https://github.com/NHendricks/nh-toolbox/blob/main/version/changelog.md

## Motivation

When i changed from Windows to Mac i needed to switch back to Windows because my Total Commander
was not available :-) And i couldnt get used to the keyboard shortcuts.

Additionaly i built a lot of cmdline tools for my private use in the past and i wanted to have one place to manage and run them.

So i thought why not build one app with many apps inside. Usable on all platforms. Starting with the nh-commander lets see how it grows. Feel free to contribute !

## Overview

This is a desktop application that provides a flexible framework for running various utility commands through both a CLI interface and a modern web-based UI. Built with TypeScript, Electron, and Lit Elements, it offers a clean architecture for adding new tools and commands.

## Features

- 🎯 **Extensible Command System** - Easy-to-add commands with a plugin-like architecture
- 🖥️ **Dual Interface** - Use commands via CLI or interactive UI
- ⚡ **IPC Communication** - Seamless bridge between Electron and backend
- 📦 **Production Ready** - Build standalone executables
- 🎨 **Modern UI** - Responsive interface built with Lit Elements
- 📝 **TypeScript** - Fully typed codebase

## Project Structure

```
/
├── backend/         # CLI command system with extensible architecture
├── process/         # Electron main process & IPC handlers
├── ui/              # Frontend UI (Lit Elements + Vite)
├── tools/           # Build scripts for executables
└── version/         # Version tracking
```

## Quick Start

### Development Mode

**Terminal - Install dependencies**

```bash
npm run installDependencies
```

**Terminal - Start UI:**

```bash
npm run ui
```

**Terminal - Start Electron:**

```bash
npm run main
```

### CLI Usage

```bash
# Build backend first
npm run buildBackend

# Run commands directly
node backend/dist/cli.js ping
node backend/dist/cli.js calculate '{"operation":"add","a":5,"b":3}'
```

## Building for Production

```bash
npm run buildWindowsApp
```

The executable will be created in the `build-output` directory.

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
