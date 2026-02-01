import type { FileItem } from '../commander.types.js'

/**
 * NavigationUtils - Utilities for file and image navigation
 */
export class NavigationUtils {
  /**
   * Check if a file is an image based on its extension
   */
  static isImageFile(filePath: string): boolean {
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
      '.ico',
    ]
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return imageExtensions.includes(ext)
  }

  /**
   * Find the next image file in a list of items
   * @param items - Array of file items to search
   * @param currentIndex - Current file index
   * @param wrap - Whether to wrap around to the beginning
   * @returns Index of next image, or -1 if not found
   */
  static findNextImage(
    items: FileItem[],
    currentIndex: number,
    wrap: boolean = true,
  ): number {
    // Search forward from current position
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        return i
      }
    }

    // Wrap around to beginning if enabled
    if (wrap) {
      for (let i = 0; i < currentIndex; i++) {
        const item = items[i]
        if (item.isFile && this.isImageFile(item.path)) {
          return i
        }
      }
    }

    return -1
  }

  /**
   * Find the previous image file in a list of items
   * @param items - Array of file items to search
   * @param currentIndex - Current file index
   * @param wrap - Whether to wrap around to the end
   * @returns Index of previous image, or -1 if not found
   */
  static findPreviousImage(
    items: FileItem[],
    currentIndex: number,
    wrap: boolean = true,
  ): number {
    // Search backward from current position
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        return i
      }
    }

    // Wrap around to end if enabled
    if (wrap) {
      for (let i = items.length - 1; i > currentIndex; i--) {
        const item = items[i]
        if (item.isFile && this.isImageFile(item.path)) {
          return i
        }
      }
    }

    return -1
  }

  /**
   * Get the parent path of a given path
   * Handles both Windows and Unix paths
   */
  static getParentPath(currentPath: string): string {
    // Detect OS: Windows paths have drive letters (e.g., "C:\"), Unix paths start with "/"
    const isWindows = /^[a-zA-Z]:[\\\/]/.test(currentPath)
    const separator = isWindows ? '\\' : '/'

    // Normalize separators for consistency
    const normalized = isWindows
      ? currentPath.replace(/\//g, '\\')
      : currentPath.replace(/\\/g, '/')

    // Check if we're at root
    if (isWindows) {
      // Windows root: "d:\" or "d:"
      if (normalized.match(/^[a-zA-Z]:\\?$/)) {
        return normalized
      }
    } else {
      // Unix root: "/"
      if (normalized === '/') {
        return '/'
      }
    }

    // Remove trailing separator if present (but not if it's the root)
    const minLength = isWindows ? 3 : 1
    const cleanPath =
      normalized.endsWith(separator) && normalized.length > minLength
        ? normalized.slice(0, -1)
        : normalized

    // Find last separator
    const lastSeparator = cleanPath.lastIndexOf(separator)
    if (lastSeparator === -1) {
      return normalized
    }

    // Return everything up to the last separator
    const parentPath = cleanPath.substring(0, lastSeparator)

    // Handle edge cases
    if (isWindows) {
      // If parent path is just drive letter, add backslash
      if (parentPath.match(/^[a-zA-Z]:$/)) {
        return parentPath + '\\'
      }
    } else {
      // If parent path is empty, return root
      if (parentPath === '') {
        return '/'
      }
    }

    return parentPath || normalized
  }

  /**
   * Check if a file is a ZIP file
   */
  static isZipFile(item: FileItem): boolean {
    return !item.isDirectory && item.name.toLowerCase().endsWith('.zip')
  }

  /**
   * Check if an item can be navigated into (directory or ZIP)
   */
  static isNavigable(item: FileItem): boolean {
    return item.isDirectory || this.isZipFile(item)
  }
}
