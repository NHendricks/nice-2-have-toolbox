/**
 * HistoryService - Manages navigation history for left and right panes
 */
export class HistoryService {
  private leftHistory: string[] = []
  private leftHistoryIndex = -1
  private rightHistory: string[] = []
  private rightHistoryIndex = -1

  private maxHistoryEntries = 20

  /**
   * Add a path to the history of the specified pane
   */
  addToHistory(pane: 'left' | 'right', path: string): void {
    if (pane === 'left') {
      // If we're not at the end of history, truncate forward history
      if (this.leftHistoryIndex < this.leftHistory.length - 1) {
        this.leftHistory = this.leftHistory.slice(0, this.leftHistoryIndex + 1)
      }
      // Add new path
      this.leftHistory = [...this.leftHistory, path]
      // Keep only last N entries
      if (this.leftHistory.length > this.maxHistoryEntries) {
        this.leftHistory = this.leftHistory.slice(-this.maxHistoryEntries)
      }
      this.leftHistoryIndex = this.leftHistory.length - 1
    } else {
      // If we're not at the end of history, truncate forward history
      if (this.rightHistoryIndex < this.rightHistory.length - 1) {
        this.rightHistory = this.rightHistory.slice(
          0,
          this.rightHistoryIndex + 1,
        )
      }
      // Add new path
      this.rightHistory = [...this.rightHistory, path]
      // Keep only last N entries
      if (this.rightHistory.length > this.maxHistoryEntries) {
        this.rightHistory = this.rightHistory.slice(-this.maxHistoryEntries)
      }
      this.rightHistoryIndex = this.rightHistory.length - 1
    }
  }

  /**
   * Navigate in history for the specified pane
   * @param direction 1 for forward, -1 for backward
   * @returns The target path and status message, or null if navigation not possible
   */
  navigate(
    pane: 'left' | 'right',
    direction: 1 | -1,
  ): { path: string; message: string } | null {
    const history = pane === 'left' ? this.leftHistory : this.rightHistory
    const currentIndex =
      pane === 'left' ? this.leftHistoryIndex : this.rightHistoryIndex

    if (direction === -1) {
      // Navigate back
      if (currentIndex >= 0 && history.length > 0) {
        const targetPath = history[currentIndex]
        const newIndex = Math.max(0, currentIndex - 1)

        if (pane === 'left') {
          this.leftHistoryIndex = newIndex
        } else {
          this.rightHistoryIndex = newIndex
        }

        return {
          path: targetPath,
          message: `← Back (${newIndex + 1}/${history.length})`,
        }
      }
      return null
    } else {
      // Navigate forward
      if (currentIndex < history.length - 1) {
        const newIndex = currentIndex + 1
        const targetPath = history[newIndex]

        if (pane === 'left') {
          this.leftHistoryIndex = newIndex
        } else {
          this.rightHistoryIndex = newIndex
        }

        return {
          path: targetPath,
          message: `→ Forward (${newIndex + 1}/${history.length})`,
        }
      }
      return null
    }
  }

  /**
   * Check if backward navigation is possible
   */
  canNavigateBack(pane: 'left' | 'right'): boolean {
    const history = pane === 'left' ? this.leftHistory : this.rightHistory
    const currentIndex =
      pane === 'left' ? this.leftHistoryIndex : this.rightHistoryIndex
    return currentIndex >= 0 && history.length > 0
  }

  /**
   * Check if forward navigation is possible
   */
  canNavigateForward(pane: 'left' | 'right'): boolean {
    const history = pane === 'left' ? this.leftHistory : this.rightHistory
    const currentIndex =
      pane === 'left' ? this.leftHistoryIndex : this.rightHistoryIndex
    return currentIndex < history.length - 1
  }

  /**
   * Get current history state (for debugging or display)
   */
  getHistoryState(pane: 'left' | 'right') {
    return {
      history: pane === 'left' ? this.leftHistory : this.rightHistory,
      index: pane === 'left' ? this.leftHistoryIndex : this.rightHistoryIndex,
    }
  }
}
