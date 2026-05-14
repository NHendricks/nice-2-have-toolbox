# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**nh-toolbox** (Nice2Have Toolbox) — cross-platform Electron desktop app (Windows/macOS/Linux) with a modular utility framework. TypeScript + Lit Web Components + Vaadin Router frontend; Node.js CLI backend; Electron main process bridging the two via IPC.

## Commands

```bash
# Install all workspace deps
npm run installDependencies

# Dev mode (hot-reload UI + Electron)
npm run ui        # Start Vite dev server for UI
npm run main      # Build backend + process, then launch Electron

# Production builds
npm run build             # All modules
npm run buildWindowsApp   # → target/dist/ (.exe)
npm run buildMacApp       # → target/dist/ (.app)
npm run buildLinuxApp     # → target/dist/ (AppImage)

# Tests (backend only)
cd backend
npm test                  # Jest
npm run test:watch
npm run test:coverage

# Formatting (Prettier)
npx prettier --write .    # single quotes, 2-space indent, trailing commas, semicolons
```

## Architecture

Three independent workspaces with their own `package.json`:

| Workspace | Role |
|-----------|------|
| `backend/` | CLI command system. Entry: `cli.ts <command> <json-params>`. Commands registered in `command-registry.ts`, implement `ICommand` interface. Built to `backend/dist/`. |
| `process/` | Electron main process. `main.ts` manages windows + IPC. `register-commands.ts` spawns `node backend/dist/cli.js` as child process per IPC call. `preload.js` exposes secure IPC bridge. |
| `ui/` | Lit web components. `app.ts` defines Vaadin Router routes. Components under `src/js/simpleweb/boundary/`. IPC calls go through `control/callElectron.ts`. |

**Request flow:** UI component → `callElectron()` → Electron IPC → child process `cli.js` → command registry → JSON response → back to UI.

## Adding a New Command

1. Create `backend/commands/<name>.ts` implementing `ICommand`
2. Register it in `backend/commands/command-registry.ts`
3. Add an IPC handler in `process/register-commands.ts` if needed
4. Add a UI route in `ui/src/js/app.ts` and a page component under `ui/src/js/simpleweb/boundary/pages/`

## Key Files

- `version/version.txt` — current version (bump manually before release)
- `version/changelog.md` — release notes
- `process/main.ts` — Electron lifecycle, remote debug on port 9222
- `backend/command-interface.ts` — `ICommand` interface + `CommandParameter` types
- `.n2henv` — local env vars (searched up directory tree at startup)
