/**
 * FormatUtils - Utility functions for formatting values
 */

/**
 * Format file size in human-readable format
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "3.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '-'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/**
 * Format a date for display
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString()
}

/**
 * Format a date as a short date string
 * @param date - Date to format
 * @returns Formatted date string (e.g., "2024-01-15")
 */
export function formatShortDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/**
 * Format a date compactly for file listings (DD.MM.YY)
 * @param date - Date, string, or timestamp to format
 * @returns Compact date string (e.g., "15.01.24")
 */
export function formatCompactDate(date: Date | string | number): string {
  if (!date) return '-'
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = String(d.getFullYear()).slice(-2)
  return `${day}.${month}.${year}`
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted string (e.g., "1,234,567")
 */
export function formatNumber(num: number): string {
  return num.toLocaleString()
}
