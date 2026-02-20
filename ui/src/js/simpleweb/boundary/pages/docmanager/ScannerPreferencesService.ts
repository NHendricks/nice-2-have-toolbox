/**
 * ScannerPreferencesService - Manages scanner preferences (last used scanner, settings)
 */

const STORAGE_KEY = 'docmanager-scanner-preferences'

export interface ScannerPreferences {
  lastScannerId?: string
  resolution?: string
  colorMode?: string
  format?: string
  multiPage?: boolean
  duplex?: boolean
}

export class ScannerPreferencesService {
  private preferences: ScannerPreferences = {}

  constructor() {
    this.load()
  }

  /**
   * Load preferences from localStorage
   */
  load(): ScannerPreferences {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        this.preferences = JSON.parse(saved)
      } catch (error) {
        console.error('Failed to load scanner preferences:', error)
        this.preferences = {}
      }
    }
    return this.preferences
  }

  /**
   * Save preferences to localStorage
   */
  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
  }

  /**
   * Get all preferences
   */
  getAll(): ScannerPreferences {
    return { ...this.preferences }
  }

  /**
   * Get last used scanner ID
   */
  getLastScannerId(): string | undefined {
    return this.preferences.lastScannerId
  }

  /**
   * Set last used scanner ID
   */
  setLastScannerId(scannerId: string): void {
    this.preferences.lastScannerId = scannerId
    this.save()
    console.log('Saved last used scanner:', scannerId)
  }

  /**
   * Get scan resolution preference
   */
  getResolution(): string {
    return this.preferences.resolution || '300'
  }

  /**
   * Set scan resolution preference
   */
  setResolution(resolution: string): void {
    this.preferences.resolution = resolution
    this.save()
  }

  /**
   * Get color mode preference
   */
  getColorMode(): string {
    return this.preferences.colorMode || 'color'
  }

  /**
   * Set color mode preference
   */
  setColorMode(colorMode: string): void {
    this.preferences.colorMode = colorMode
    this.save()
  }

  /**
   * Get format preference
   */
  getFormat(): string {
    return this.preferences.format || 'pdf'
  }

  /**
   * Set format preference
   */
  setFormat(format: string): void {
    this.preferences.format = format
    this.save()
  }

  /**
   * Get multi-page preference
   */
  getMultiPage(): boolean {
    return this.preferences.multiPage !== undefined ? this.preferences.multiPage : true
  }

  /**
   * Set multi-page preference
   */
  setMultiPage(multiPage: boolean): void {
    this.preferences.multiPage = multiPage
    this.save()
  }

  /**
   * Get duplex preference
   */
  getDuplex(): boolean {
    return this.preferences.duplex !== undefined ? this.preferences.duplex : false
  }

  /**
   * Set duplex preference
   */
  setDuplex(duplex: boolean): void {
    this.preferences.duplex = duplex
    this.save()
  }

  /**
   * Update multiple preferences at once
   */
  updatePreferences(prefs: Partial<ScannerPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs }
    this.save()
  }

  /**
   * Clear all preferences
   */
  clear(): void {
    this.preferences = {}
    this.save()
  }
}

// Singleton instance for easy access
export const scannerPreferencesService = new ScannerPreferencesService()
