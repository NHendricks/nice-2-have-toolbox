/**
 * FileOperationsHandler - Handles file operation logic (copy, move, delete, zip)
 */

import { getFileName, getPathSeparator, isFtpPath } from '../utils/PathUtils.js'
import { FileService } from './FileService.js'

export interface OperationResult {
  success: boolean
  message: string
  successCount?: number
}

/**
 * Execute a copy or move operation for multiple files
 */
export async function executeFileOperation(
  type: 'copy' | 'move',
  files: string[],
  destination: string,
  onProgress?: (message: string) => void,
): Promise<OperationResult> {
  let successCount = 0
  // If all sources are local and destination is local, perform a single batch operation
  const anySourceIsFtp = files.some((f) => isFtpPath(f))
  const isDestFTP = isFtpPath(destination)

  if (!anySourceIsFtp && !isDestFTP) {
    onProgress?.(
      `${type === 'copy' ? 'Copying' : 'Moving'} ${files.length} file(s)...`,
    )

    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      {
        operation: type,
        sourcePath: files,
        destinationPath: destination,
      },
    )

    if (response.success) {
      const count = response.data?.filesCopied ?? files.length
      return {
        success: true,
        message: `${count} file(s) successfully ${type === 'copy' ? 'copied' : 'moved'}`,
        successCount: count,
      }
    }

    return {
      success: false,
      message: response.error || 'Unknown error',
      successCount: 0,
    }
  }

  // Fallback: handle mixed FTP/local cases per file
  for (const file of files) {
    const fileName = getFileName(file) || 'file'
    const isSourceFTP = isFtpPath(file)

    // Handle FTP operations
    if (isSourceFTP && !isDestFTP) {
      // Download from FTP to local
      const separator = getPathSeparator(destination)
      const localPath = destination + separator + fileName

      onProgress?.(`Downloading ${fileName}...`)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'ftp',
        {
          operation: 'download',
          ftpUrl: file,
          localPath: localPath,
        },
      )

      if (response.success) {
        successCount++
      } else {
        return {
          success: false,
          message: `Error downloading ${fileName}: ${response.error}`,
          successCount,
        }
      }
    } else if (!isSourceFTP && isDestFTP) {
      // Upload from local to FTP
      const ftpPath = destination.endsWith('/')
        ? destination + fileName
        : destination + '/' + fileName

      onProgress?.(`Uploading ${fileName}...`)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'ftp',
        {
          operation: 'upload',
          localPath: file,
          ftpUrl: ftpPath,
        },
      )

      if (response.success) {
        successCount++
      } else {
        return {
          success: false,
          message: `Error uploading ${fileName}: ${response.error}`,
          successCount,
        }
      }
    } else if (isSourceFTP && isDestFTP) {
      // FTP to FTP not supported yet
      return {
        success: false,
        message: 'FTP to FTP copy not supported yet',
        successCount,
      }
    } else {
      // Normal local file operation
      const separator = getPathSeparator(destination)
      const destPath = destination + separator + fileName

      onProgress?.(`${type === 'copy' ? 'Copying' : 'Moving'} ${fileName}...`)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: type,
          sourcePath: file,
          destinationPath: destPath,
        },
      )

      if (response.success) {
        successCount++
      } else {
        return {
          success: false,
          message: `Error with ${fileName}: ${response.error}`,
          successCount,
        }
      }
    }
  }

  return {
    success: true,
    message: `${successCount} file(s) successfully ${type === 'copy' ? 'copied' : 'moved'}`,
    successCount,
  }
}

/**
 * Execute delete operation for multiple files
 */
export async function executeDelete(
  files: string[],
  onProgress?: (message: string) => void,
): Promise<OperationResult> {
  let successCount = 0

  for (const file of files) {
    const fileName = getFileName(file) || 'file'
    onProgress?.(`Deleting ${fileName}...`)

    const response = await FileService.delete(file)

    if (response.success) {
      successCount++
    } else {
      return {
        success: false,
        message: `Error with ${fileName}: ${response.error}`,
        successCount,
      }
    }
  }

  return {
    success: true,
    message: `${successCount} file(s) successfully deleted`,
    successCount,
  }
}

/**
 * Execute zip operation
 */
export async function executeZip(
  files: string[],
  zipFilePath: string,
): Promise<OperationResult> {
  const response = await (window as any).electron.ipcRenderer.invoke(
    'cli-execute',
    'file-operations',
    {
      operation: 'zip',
      files: files,
      zipFilePath: zipFilePath,
    },
  )

  if (response.success && response.data) {
    return {
      success: true,
      message: `Successfully zipped ${response.data.filesAdded} file(s)`,
      successCount: response.data.filesAdded,
    }
  } else {
    return {
      success: false,
      message: `Error zipping: ${response.error}`,
    }
  }
}

/**
 * Execute rename operation (supports both local and FTP)
 */
export async function executeRename(
  sourcePath: string,
  newName: string,
): Promise<OperationResult> {
  if (isFtpPath(sourcePath)) {
    // FTP rename
    const lastSlash = sourcePath.lastIndexOf('/')
    const parentUrl = sourcePath.substring(0, lastSlash)
    const newFtpUrl = `${parentUrl}/${newName}`

    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'ftp',
      { operation: 'rename', ftpUrl: sourcePath, newFtpUrl },
    )

    if (response.success) {
      return { success: true, message: `Renamed to: ${newName}` }
    } else {
      return { success: false, message: `Error: ${response.error}` }
    }
  } else {
    // Local rename
    const response = await FileService.rename(sourcePath, newName)

    if (response.success) {
      return { success: true, message: `Renamed to: ${newName}` }
    } else {
      return { success: false, message: `Error: ${response.error}` }
    }
  }
}

/**
 * Execute mkdir operation (supports both local and FTP)
 */
export async function executeMkdir(
  currentPath: string,
  folderName: string,
): Promise<OperationResult> {
  if (isFtpPath(currentPath)) {
    // FTP mkdir
    const ftpUrl = currentPath.endsWith('/')
      ? `${currentPath}${folderName}`
      : `${currentPath}/${folderName}`

    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'ftp',
      { operation: 'mkdir', ftpUrl },
    )

    if (response.success && response.data?.success) {
      return { success: true, message: `Created folder: ${folderName}` }
    } else {
      return {
        success: false,
        message: `Error: ${response.data?.error || response.error || 'Unknown error'}`,
      }
    }
  } else {
    // Local mkdir
    const dirPath =
      currentPath + (currentPath.endsWith('/') ? '' : '/') + folderName

    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'file-operations',
      { operation: 'mkdir', dirPath },
    )

    if (response.success && response.data?.success) {
      return { success: true, message: `Created folder: ${folderName}` }
    } else {
      return {
        success: false,
        message: `Error: ${response.data?.error || response.error || 'Unknown error'}`,
      }
    }
  }
}

/**
 * Cancel ongoing file operation
 */
export async function cancelOperation(): Promise<void> {
  await FileService.cancelOperation()
}
