/**
 * FileService - Handles all IPC calls to the backend for file operations
 */

import type { DriveInfo, FileItem } from '../commander.types.js'

export class FileService {
  /**
   * Load directory contents
   */
  static async loadDirectory(path: string): Promise<{
    success: boolean
    data?: {
      path: string
      directories: FileItem[]
      files: FileItem[]
      summary: { totalDirectories: number; totalFiles: number }
    }
    error?: string
  }> {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'list', folderPath: path },
    )
  }

  /**
   * Load available drives
   */
  static async loadDrives(): Promise<{
    success: boolean
    data?: { drives: DriveInfo[] }
    error?: string
  }> {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'drives' },
    )
  }

  /**
   * Read file content
   */
  static async readFile(filePath: string): Promise<{
    success: boolean
    data?: { path: string; content: string; size: number; isImage: boolean }
    error?: string
  }> {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'read', filePath },
    )
  }

  /**
   * Copy file/directory
   */
  static async copy(sourcePath: string, destinationPath: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'copy', sourcePath, destinationPath },
    )
  }

  /**
   * Move file/directory
   */
  static async move(sourcePath: string, destinationPath: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'move', sourcePath, destinationPath },
    )
  }

  /**
   * Delete file/directory
   */
  static async delete(sourcePath: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'delete', sourcePath },
    )
  }

  /**
   * Rename file/directory
   */
  static async rename(sourcePath: string, newName: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'rename', sourcePath, destinationPath: newName },
    )
  }

  /**
   * Create ZIP archive
   */
  static async zip(files: string[], zipFilePath: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'zip', files, zipFilePath },
    )
  }

  /**
   * Compare directories
   */
  static async compare(
    leftPath: string,
    rightPath: string,
    recursive: boolean,
  ) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'compare', leftPath, rightPath, recursive },
    )
  }

  /**
   * Execute a shell command
   */
  static async executeCommand(command: string, workingDir: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'execute-command', command, workingDir },
    )
  }

  /**
   * Execute a file with default application
   */
  static async executeFile(filePath: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'execute-file', filePath },
    )
  }

  /**
   * Cancel ongoing file operation
   */
  static async cancelOperation() {
    return (window as any).electron.ipcRenderer.invoke('cancel-file-operation')
  }

  /**
   * Write text to clipboard
   */
  static async copyToClipboard(text: string) {
    return (window as any).electron.ipcRenderer.invoke(
      'clipboard-write-text',
      text,
    )
  }

  /**
   * Register IPC listener
   */
  static onProgress(
    channel: 'zip-progress' | 'copy-progress' | 'compare-progress',
    callback: (data: any) => void,
  ) {
    ;(window as any).electron.ipcRenderer.on(channel, callback)
  }
}
