/**
 * Restic UI Types
 */

// Repository configuration
export interface ResticRepository {
  path: string // Repository path (local path, S3, B2, SFTP, etc.)
  password: string // Repository password (stored in memory only)
  passwordFile?: string // Optional path to password file
  isInitialized: boolean // Whether repo is initialized
  lastChecked?: Date // Last health check
}

// Snapshot from restic snapshots output
export interface ResticSnapshot {
  id: string // Full snapshot ID
  short_id: string // Short snapshot ID (8 chars)
  time: string // Snapshot timestamp ISO string
  hostname: string // Host that created snapshot
  username: string // User who created snapshot
  paths: string[] // Backed up paths
  tags?: string[] // Snapshot tags
  parent?: string // Parent snapshot ID
  tree?: string // Tree ID for browsing
}

// File entry from restic ls output
export interface ResticFileEntry {
  name: string
  path: string
  type: 'file' | 'dir' | 'symlink'
  size: number
  mode: number
  mtime: string // ISO string
  atime: string
  ctime: string
  uid: number
  gid: number
}

// Backup progress (from restic backup --json)
export interface ResticBackupProgress {
  type: 'progress' | 'summary'
  percentDone: number
  totalFiles: number
  filesDone: number
  totalBytes: number
  bytesDone: number
  currentFile: string
}

// Backup summary (from restic backup --json summary)
export interface ResticBackupSummary {
  message_type: 'summary'
  files_new: number
  files_changed: number
  files_unmodified: number
  dirs_new: number
  dirs_changed: number
  dirs_unmodified: number
  data_blobs: number
  tree_blobs: number
  data_added: number
  total_files_processed: number
  total_bytes_processed: number
  total_duration: number
  snapshot_id: string
}

// Retention policy configuration
export interface ResticRetentionPolicy {
  keepLast?: number // Keep last n snapshots
  keepHourly?: number // Keep n hourly snapshots
  keepDaily?: number // Keep n daily snapshots
  keepWeekly?: number // Keep n weekly snapshots
  keepMonthly?: number // Keep n monthly snapshots
  keepYearly?: number // Keep n yearly snapshots
  keepWithin?: string // Keep all within duration (e.g., "2m")
  keepTags?: string[] // Keep snapshots with these tags
}

// Repository statistics from restic stats
export interface ResticStats {
  total_size: number
  total_file_count: number
  snapshots_count?: number
}

// Check result from restic check
export interface ResticCheckResult {
  success: boolean
  message: string
  errors: string[]
  warnings: string[]
}

// Saved backup profile
export interface ResticBackupProfile {
  name: string
  paths: string[] // Paths to backup
  excludePatterns: string[] // Patterns to exclude
  tags: string[] // Tags to apply
}

// Grouped snapshots for timeline display
export interface SnapshotGroup {
  label: string // e.g., "Today", "Yesterday", "January 2024"
  date: Date
  snapshots: ResticSnapshot[]
}

// Diff result from comparing two snapshots
export interface ResticDiffResult {
  added: string[]
  removed: string[]
  modified: string[]
  summary: {
    addedCount: number
    removedCount: number
    modifiedCount: number
  }
}

// Saved connection (password is obfuscated, not stored in plain text)
export interface SavedResticConnection {
  name: string
  repoPath: string
  passwordObfuscated: string // XOR-obfuscated, base64-encoded password
  backupPaths?: string[] // Remember last used backup paths
}

// UI Tab types
export type ResticTab = 'backup' | 'browse' | 'compare' | 'retention' | 'health'
