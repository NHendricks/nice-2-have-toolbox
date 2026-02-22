/**
 * UserPreferencesService - Manages user preferences stored in ~/n2htoolbox/user-preferences.json
 */

const PREFERENCES_FILENAME = 'user-preferences.json'

export interface UserPreferences {
  lastName?: string
  defaultScanDirectory?: string
  defaultResolution?: string
  defaultFormat?: string
  includeLastNameInFilename?: boolean
  senders?: string[] // Fixed sender strings to match in OCR
  accountNumbers?: string[] // Fixed account numbers/topics to match in OCR
}

export class UserPreferencesService {
  private preferences: UserPreferences = {}
  private loaded = false

  /**
   * Load preferences from file
   */
  async load(): Promise<UserPreferences> {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'config',
        {
          operation: 'read',
          filename: PREFERENCES_FILENAME,
        },
      )

      if (response.success && response.content) {
        try {
          this.preferences = JSON.parse(response.content)
          this.loaded = true
          console.log('[UserPreferences] Loaded preferences:', this.preferences)
        } catch (e) {
          console.warn('[UserPreferences] Failed to parse preferences:', e)
          this.preferences = {}
        }
      } else {
        console.log(
          '[UserPreferences] No preferences file found, using defaults',
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
   * Get last name
   */
  getLastName(): string {
    return this.preferences.lastName || ''
  }

  /**
   * Get whether to include last name in filename
   */
  getIncludeLastNameInFilename(): boolean {
    return this.preferences.includeLastNameInFilename !== false // default true
  }

  /**
   * Get default scan directory
   */
  getDefaultScanDirectory(): string {
    return this.preferences.defaultScanDirectory || ''
  }

  /**
   * Get default resolution
   */
  getDefaultResolution(): string {
    return this.preferences.defaultResolution || '300'
  }

  /**
   * Get default format
   */
  getDefaultFormat(): string {
    return this.preferences.defaultFormat || 'pdf'
  }

  /**
   * Get fixed senders list
   */
  getSenders(): string[] {
    return this.preferences.senders || []
  }

  /**
   * Get fixed account numbers list
   */
  getAccountNumbers(): string[] {
    return this.preferences.accountNumbers || []
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
