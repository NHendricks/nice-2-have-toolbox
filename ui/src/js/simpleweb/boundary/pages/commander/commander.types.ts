/**
 * Type definitions for the Commander component
 */

export interface FileItem {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
  isDirectory: boolean
  isFile: boolean
}

export interface PaneState {
  currentPath: string
  items: FileItem[]
  selectedIndices: Set<number>
  focusedIndex: number
  filter: string
  filterActive: boolean
  sortBy: 'name' | 'size' | 'modified' | 'extension'
  sortDirection: 'asc' | 'desc'
}

export interface ProgressInfo {
  current: number
  total: number
  fileName: string
  percentage: number
}

export interface ViewerFile {
  path: string
  content: string
  size: number
  isImage: boolean
}

export interface OperationDialog {
  type: 'copy' | 'move'
  files: string[]
  destination: string
}

export interface DeleteDialog {
  files: string[]
}

export interface CommandDialog {
  command: string
  workingDir: string
}

export interface QuickLaunchDialog {
  command: string
}

export interface RenameDialog {
  filePath: string
  oldName: string
  newName: string
}

export interface ZipDialog {
  files: string[]
  zipFileName: string
}

export interface CompareDialogState {
  result: any
  recursive: boolean
}

export interface DriveInfo {
  letter: string
  path: string
  label: string
}
