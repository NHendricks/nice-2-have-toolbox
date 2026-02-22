/**
 * ConfigService - Manages configuration files in ~/n2htoolbox/
 * 
 * This service provides a safe way to store preferences that may contain
 * sensitive data. It does NOT automatically save preferences - you must
 * explicitly call save methods.
 * 
 * Example usage:
 * ```typescript
 * // Get config directory path
 * const dir = await ConfigService.getConfigDir()
 * 
 * // Save preferences manually
 * await ConfigService.writeConfig('my-settings.json', { theme: 'dark' })
 * 
 * // Read preferences
 * const settings = await ConfigService.readConfig('my-settings.json')
 * ```
 */

export class ConfigService {
  /**
   * Get the config directory path (~/n2htoolbox/)
   */
  static async getConfigDir(): Promise<string> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'get-dir' },
    )
    
    if (response.success) {
      return response.path
    }
    throw new Error(response.error || 'Failed to get config directory')
  }

  /**
   * Read a config file
   * Returns null if file doesn't exist
   */
  static async readConfig<T = any>(filename: string): Promise<T | null> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'read', filename },
    )
    
    if (response.success) {
      return response.data as T
    }
    
    if (response.notFound) {
      return null
    }
    
    throw new Error(response.error || 'Failed to read config')
  }

  /**
   * Write a config file
   * Data can be an object (will be JSON stringified) or a string
   */
  static async writeConfig(
    filename: string,
    data: any,
  ): Promise<{ success: boolean; path: string }> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'write', filename, data },
    )
    
    if (response.success) {
      return {
        success: true,
        path: response.path,
      }
    }
    
    throw new Error(response.error || 'Failed to write config')
  }

  /**
   * List all config files
   */
  static async listConfigs(): Promise<Array<{ name: string; path: string }>> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'list' },
    )
    
    if (response.success) {
      return response.files
    }
    
    throw new Error(response.error || 'Failed to list configs')
  }

  /**
   * Delete a config file
   */
  static async deleteConfig(filename: string): Promise<boolean> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'delete', filename },
    )
    
    if (response.success) {
      return true
    }
    
    if (response.notFound) {
      return false
    }
    
    throw new Error(response.error || 'Failed to delete config')
  }

  /**
   * Check if a config file exists
   */
  static async configExists(filename: string): Promise<boolean> {
    const response = await (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'config',
      { operation: 'exists', filename },
    )
    
    if (response.success) {
      return response.exists
    }
    
    throw new Error(response.error || 'Failed to check config existence')
  }
}
