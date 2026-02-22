/**
 * ScannerPreferencesService - Manages scanner preferences (last used scanner, settings)
 * Now delegates to UserPreferencesService for file-based storage
 */

import { userPreferencesService } from './UserPreferencesService.js'

export interface ScannerPreferences {
  lastScannerId?: string
  resolution?: string
  colorMode?: string
  format?: string
  multiPage?: boolean
  duplex?: boolean
}

export class ScannerPreferencesService {
  /**
   * Load preferences - now a no-op since UserPreferencesService auto-loads
   */
  load(): ScannerPreferences {
    return this.getAll()
  }

  /**
   * Get all preferences
   */
  getAll(): ScannerPreferences {
    const prefs = userPreferencesService.getAll()
    return {
      lastScannerId: prefs.lastScannerId,
      resolution: prefs.resolution,
      colorMode: prefs.colorMode,
      format: prefs.format,
      multiPage: prefs.multiPage,
      duplex: prefs.duplex,
    }
  }

  /**
   * Get last used scanner ID
   */
  getLastScannerId(): string | undefined {
    return userPreferencesService.getLastScannerId()
  }

  /**
   * Set last used scanner ID
   */
  setLastScannerId(scannerId: string): void {
    userPreferencesService.setLastScannerId(scannerId)
    console.log('Saved last used scanner:', scannerId)
  }

  /**
   * Get scan resolution preference
   */
  getResolution(): string {
    return userPreferencesService.getResolution()
  }

  /**
   * Set scan resolution preference
   */
  setResolution(resolution: string): void {
    userPreferencesService.setResolution(resolution)
  }

  /**
   * Get color mode preference
   */
  getColorMode(): string {
    return userPreferencesService.getColorMode()
  }

  /**
   * Set color mode preference
   */
  setColorMode(colorMode: string): void {
    userPreferencesService.setColorMode(colorMode)
  }

  /**
   * Get format preference
   */
  getFormat(): string {
    return userPreferencesService.getFormat()
  }

  /**
   * Set format preference
   */
  setFormat(format: string): void {
    userPreferencesService.setFormat(format)
  }

  /**
   * Get multi-page preference
   */
  getMultiPage(): boolean {
    return userPreferencesService.getMultiPage()
  }

  /**
   * Set multi-page preference
   */
  setMultiPage(multiPage: boolean): void {
    userPreferencesService.setMultiPage(multiPage)
  }

  /**
   * Get duplex preference
   */
  getDuplex(): boolean {
    return userPreferencesService.getDuplex()
  }

  /**
   * Set duplex preference
   */
  setDuplex(duplex: boolean): void {
    userPreferencesService.setDuplex(duplex)
  }

  /**
   * Update multiple preferences at once
   */
  updatePreferences(prefs: Partial<ScannerPreferences>): void {
    userPreferencesService.updatePreferences(prefs)
  }

  /**
   * Clear all preferences
   */
  clear(): void {
    userPreferencesService.updatePreferences({
      lastScannerId: undefined,
      resolution: undefined,
      colorMode: undefined,
      format: undefined,
      multiPage: undefined,
      duplex: undefined,
    })
  }
}

// Singleton instance for easy access
export const scannerPreferencesService = new ScannerPreferencesService()
