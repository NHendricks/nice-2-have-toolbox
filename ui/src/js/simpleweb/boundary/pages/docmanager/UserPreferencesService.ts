/**
 * UserPreferencesService - Manages user preferences stored in ~/n2htoolbox/user-preferences.json
 */

const PREFERENCES_FILENAME = 'user-preferences.json'

export interface UserPreferences {
  defaultScanDirectory?: string
  defaultResolution?: string
  defaultFormat?: string
  autoSetFileName?: boolean // Enable OCR scan for first page
  senders?: string[] // Fixed sender strings to match in OCR
  accountNumbers?: string[] // Fixed account numbers/topics to match in OCR
  fullNames?: string[] // Fixed full names to match in OCR
  // Scanner session preferences (last used settings)
  lastScannerId?: string
  resolution?: string
  colorMode?: string
  format?: string
  multiPage?: boolean
  duplex?: boolean
}

export class UserPreferencesService {
  private preferences: UserPreferences = {}
  private loaded = false

  /**
   * Load preferences from file
   */
  async load(): Promise<UserPreferences> {
    try {
      console.log('[UserPreferences] Loading from:', PREFERENCES_FILENAME)
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'config',
        {
          operation: 'read',
          filename: PREFERENCES_FILENAME,
        },
      )

      console.log('[UserPreferences] Full response from config read:', response)

      // Handle response wrapping - check both response.data and response directly
      const result = response.data || response
      console.log('[UserPreferences] Result after unwrapping:', result)

      if (result.success && result.content) {
        try {
          this.preferences = JSON.parse(result.content)
          this.loaded = true
          console.log('[UserPreferences] Loaded preferences:', this.preferences)
        } catch (e) {
          console.warn('[UserPreferences] Failed to parse preferences:', e)
          this.preferences = {}
        }
      } else if (
        result.success &&
        result.data &&
        typeof result.data === 'object'
      ) {
        // If data is already parsed as object
        this.preferences = result.data
        this.loaded = true
        console.log(
          '[UserPreferences] Loaded preferences from data field:',
          this.preferences,
        )
      } else {
        console.log(
          '[UserPreferences] No preferences file found or failed to load. Result:',
          result,
          'notFound:',
          result.notFound,
        )
        this.preferences = {}
      }
    } catch (error) {
      console.error('[UserPreferences] Failed to load preferences:', error)
      this.preferences = {}
    }

    this.loaded = true
    return this.preferences
  }

  /**
   * Save preferences to file
   */
  async save(prefs: Partial<UserPreferences>): Promise<boolean> {
    try {
      // Merge with existing preferences
      this.preferences = { ...this.preferences, ...prefs }

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'config',
        {
          operation: 'write',
          filename: PREFERENCES_FILENAME,
          content: JSON.stringify(this.preferences, null, 2),
        },
      )

      if (response.success) {
        console.log('[UserPreferences] Saved preferences:', this.preferences)
        return true
      } else {
        console.error('[UserPreferences] Failed to save:', response.error)
        return false
      }
    } catch (error) {
      console.error('[UserPreferences] Save error:', error)
      return false
    }
  }

  /**
   * Get all preferences
   */
  getAll(): UserPreferences {
    return { ...this.preferences }
  }

  /**
   * Get fixed account numbers list
   */
  getAccountNumbers(): string[] {
    return this.preferences.accountNumbers || []
  }

  /**
   * Get fixed senders list
   */
  getSenders(): string[] {
    return this.preferences.senders || []
  }

  /**
   * Get fixed full names list
   */
  getFullNames(): string[] {
    return this.preferences.fullNames || []
  }

  /**
   * Get default scan directory
   */
  getDefaultScanDirectory(): string {
    return this.preferences.defaultScanDirectory || ''
  }

  /**
   * Get auto set file name (OCR scan enabled)
   */
  getAutoSetFileName(): boolean {
    return this.preferences.autoSetFileName || false
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
  async setLastScannerId(scannerId: string): Promise<void> {
    this.preferences.lastScannerId = scannerId
    await this.save(this.preferences)
  }

  /**
   * Get scan resolution preference
   */
  getResolution(): string {
    return (
      this.preferences.resolution || this.preferences.defaultResolution || '300'
    )
  }

  /**
   * Set scan resolution preference
   */
  async setResolution(resolution: string): Promise<void> {
    this.preferences.resolution = resolution
    await this.save(this.preferences)
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
  async setColorMode(colorMode: string): Promise<void> {
    this.preferences.colorMode = colorMode
    await this.save(this.preferences)
  }

  /**
   * Get format preference
   */
  getFormat(): string {
    return this.preferences.format || this.preferences.defaultFormat || 'pdf'
  }

  /**
   * Set format preference
   */
  async setFormat(format: string): Promise<void> {
    this.preferences.format = format
    await this.save(this.preferences)
  }

  /**
   * Get multi-page preference
   */
  getMultiPage(): boolean {
    return this.preferences.multiPage !== undefined
      ? this.preferences.multiPage
      : true
  }

  /**
   * Set multi-page preference
   */
  async setMultiPage(multiPage: boolean): Promise<void> {
    this.preferences.multiPage = multiPage
    await this.save(this.preferences)
  }

  /**
   * Get duplex preference
   */
  getDuplex(): boolean {
    return this.preferences.duplex !== undefined
      ? this.preferences.duplex
      : false
  }

  /**
   * Set duplex preference
   */
  async setDuplex(duplex: boolean): Promise<void> {
    this.preferences.duplex = duplex
    await this.save(this.preferences)
  }

  /**
   * Update multiple preferences at once
   */
  async updatePreferences(prefs: Partial<UserPreferences>): Promise<void> {
    await this.save(prefs)
  }

  /**
   * Check if preferences are loaded
   */
  isLoaded(): boolean {
    return this.loaded
  }

  /**
   * Wait for preferences to load
   */
  async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.load()
    }
  }
}

export const userPreferencesService = new UserPreferencesService()
