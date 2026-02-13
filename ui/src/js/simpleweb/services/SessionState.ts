/**
 * SessionState - In-memory state manager for preserving app values during session
 * State is lost when the app is closed (not stored in localStorage)
 */

// Garbage Finder state
export interface GarbageFinderState {
  treeData?: any[] // FolderNode[]
  sortBySize?: boolean
  expandedPaths?: string[]
}

// Restic UI state
export interface ResticState {
  activeTab?: string
  repoPath?: string
  repoPassword?: string
  backupPaths?: string[]
  connectionName?: string
  retentionPolicy?: {
    keepLast?: number
    keepHourly?: number
    keepDaily?: number
    keepWeekly?: number
    keepMonthly?: number
    keepYearly?: number
  }
  // Repository and snapshots
  repository?: any // ResticRepository
  snapshots?: any[] // ResticSnapshot[]
  selectedSnapshot?: any // ResticSnapshot
  browseEntries?: any[] // ResticFileEntry[]
  browsePath?: string
  stats?: any // ResticStats
  // Comparison state
  compareSnapshot1?: any // ResticSnapshot
  compareSnapshot2?: any // ResticSnapshot
  diffResult?: any // ResticDiffResult
  // File browser state
  expandedPaths?: string[]
  selectedFiles?: string[]
  // Timeline diff mode state
  timelineDiffMode?: boolean
  timelineDiffSnapshot?: any // ResticSnapshot
  timelineDiffResult?: {
    snapshotTree: any[] // Serialized Map entries
    currentFsTree: any[] // Serialized Map entries
    comparison: {
      added: string[]
      removed: string[]
      modified: string[]
      unchanged: string[]
    }
  }
  timelineSliderPosition?: number
}

// All app states
interface AppStates {
  garbageFinder: GarbageFinderState
  restic: ResticState
}

// In-memory storage
const states: AppStates = {
  garbageFinder: {},
  restic: {},
}

/**
 * Get saved state for Garbage Finder
 */
export function getGarbageFinderState(): GarbageFinderState {
  return { ...states.garbageFinder }
}

/**
 * Save state for Garbage Finder
 */
export function saveGarbageFinderState(state: Partial<GarbageFinderState>): void {
  states.garbageFinder = { ...states.garbageFinder, ...state }
}

/**
 * Get saved state for Restic UI
 */
export function getResticState(): ResticState {
  return { ...states.restic }
}

/**
 * Save state for Restic UI
 */
export function saveResticState(state: Partial<ResticState>): void {
  states.restic = { ...states.restic, ...state }
}

/**
 * Clear all session state (useful for testing)
 */
export function clearAllState(): void {
  states.garbageFinder = {}
  states.restic = {}
}
