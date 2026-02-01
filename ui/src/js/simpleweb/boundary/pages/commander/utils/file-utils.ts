/**
 * Utility functions for file operations
 */

import type { FileItem } from '../commander.types.js'

export const FILE_ICONS: Record<string, string> = {
  zip: '📦',
  exe: '🧩',
  dmg: '💿',
  app: '🍎',
  pdf: '📕',
  md: '📝',
  json: '🧱',
  ts: '🟦',
  js: '🟨',
  html: '🌐',
  css: '🎨',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
}

export function getFileIcon(item: FileItem): string {
  if (item.isDirectory) return '📁'
  const ext = item.name.split('.').pop()?.toLowerCase()
  return (ext && FILE_ICONS[ext]) ?? '📄'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return ''
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
}

export function isImageFile(filePath: string): boolean {
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

export function getParentPath(currentPath: string): string {
  const isWindows = /^[a-zA-Z]:[\\\/]/.test(currentPath)
  const separator = isWindows ? '\\' : '/'

  const normalized = isWindows
    ? currentPath.replace(/\//g, '\\')
    : currentPath.replace(/\\/g, '/')

  if (isWindows) {
    if (normalized.match(/^[a-zA-Z]:\\?$/)) return normalized
  } else {
    if (normalized === '/') return '/'
  }

  const minLength = isWindows ? 3 : 1
  const cleanPath =
    normalized.endsWith(separator) && normalized.length > minLength
      ? normalized.slice(0, -1)
      : normalized

  const lastSeparator = cleanPath.lastIndexOf(separator)
  if (lastSeparator === -1) return normalized

  const parentPath = cleanPath.substring(0, lastSeparator)

  if (isWindows) {
    if (parentPath.match(/^[a-zA-Z]:$/)) return parentPath + '\\'
  } else {
    if (parentPath === '') return '/'
  }

  return parentPath || normalized
}

export function sortItems(
  items: FileItem[],
  sortBy: string,
  sortDirection: string,
): FileItem[] {
  const parentDir = items.find((item) => item.name === '..')
  const itemsToSort = items.filter((item) => item.name !== '..')

  const sorted = [...itemsToSort].sort((a, b) => {
    let comparison = 0

    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true })
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'modified':
        comparison =
          new Date(a.modified).getTime() - new Date(b.modified).getTime()
        break
      case 'extension':
        const extA = a.isDirectory ? '' : a.name.split('.').pop() || ''
        const extB = b.isDirectory ? '' : b.name.split('.').pop() || ''
        comparison = extA.localeCompare(extB)
        if (comparison === 0) {
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
          })
        }
        break
    }

    return sortDirection === 'asc' ? comparison : -comparison
  })

  return parentDir ? [parentDir, ...sorted] : sorted
}
