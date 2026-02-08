/**
 * PathUtils - Utility functions for path manipulation
 */

/**
 * Get the parent path from a given path
 * Handles Windows (C:\), Unix (/), and FTP (ftp://) style paths
 */
export function getParentPath(currentPath: string): string {
  // Handle FTP URLs
  if (currentPath.startsWith('ftp://')) {
    // Extract the base URL (ftp://user:pass@host:port) and the remote path
    const match = currentPath.match(/^(ftp:\/\/[^/]+)(\/.*)?$/)
    if (!match) return currentPath

    const baseUrl = match[1] // ftp://user:pass@host:port
    const remotePath = match[2] || '/' // /folder1/folder2/

    // If we're at root of FTP, stay there
    if (remotePath === '/' || remotePath === '') {
      return baseUrl + '/'
    }

    // Remove trailing slash for processing
    const cleanPath = remotePath.endsWith('/') ? remotePath.slice(0, -1) : remotePath

    // Find the last slash to get parent
    const lastSlash = cleanPath.lastIndexOf('/')
    if (lastSlash <= 0) {
      // We're at top level folder, go to root
      return baseUrl + '/'
    }

    // Return parent path with trailing slash
    return baseUrl + cleanPath.substring(0, lastSlash) + '/'
  }

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
 * Mask password in FTP URL for display
 * ftp://user:password@host:port/path -> ftp://user:***@host:port/path
 */
export function maskFtpPassword(path: string): string {
  if (!path) return ''
  if (!path.startsWith('ftp://')) return path
  // Match ftp://user:password@host pattern
  return path.replace(/^(ftp:\/\/[^:]+:)[^@]+(@)/, '$1***$2')
}

/**
 * Check if a path is at root level
 */
export function isRootPath(path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  return !!normalizedPath.match(/^[a-z]:\/?\s*$/) || normalizedPath === '/'
}

/**
 * Get the separator for a given path
 */
export function getPathSeparator(path: string): string {
  return path.includes('\\') ? '\\' : '/'
}

/**
 * Extract filename from a path
 */
export function getFileName(path: string): string {
  return path.split(/[/\\]/).pop() || ''
}

/**
 * Join path segments with the appropriate separator
 */
export function joinPath(basePath: string, ...segments: string[]): string {
  const separator = getPathSeparator(basePath)
  let result = basePath.endsWith(separator) ? basePath.slice(0, -1) : basePath

  for (const segment of segments) {
    result += separator + segment
  }

  return result
}

/**
 * Check if a path is an FTP URL
 */
export function isFtpPath(path: string): boolean {
  return path ? path.startsWith('ftp://') : false
}

/**
 * Check if a path is a Samba/SMB network path
 * Matches \\server\share or //server/share patterns
 */
export function isSambaPath(path: string): boolean {
  if (!path) return false
  return path.startsWith('\\\\') || path.startsWith('//')
}

/**
 * Check if a path is a local filesystem path (not FTP or Samba)
 */
export function isLocalPath(path: string): boolean {
  if (!path) return false
  return !isFtpPath(path) && !isSambaPath(path)
}
