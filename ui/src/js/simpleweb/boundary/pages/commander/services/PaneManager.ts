import type { PaneState } from '../commander.types.js'

/**
 * PaneManager - Manages state for left and right panes
 */
export class PaneManager {
  private leftPane: PaneState
  private rightPane: PaneState
  private activePane: 'left' | 'right' = 'left'

  constructor(initialLeftPane: PaneState, initialRightPane: PaneState) {
    this.leftPane = initialLeftPane
    this.rightPane = initialRightPane
  }

  /**
   * Get the active pane state
   */
  getActivePane(): PaneState {
    return this.activePane === 'left' ? this.leftPane : this.rightPane
  }

  /**
   * Get the inactive pane state
   */
  getInactivePane(): PaneState {
    return this.activePane === 'left' ? this.rightPane : this.leftPane
  }

  /**
   * Get a specific pane by name
   */
  getPane(pane: 'left' | 'right'): PaneState {
    return pane === 'left' ? this.leftPane : this.rightPane
  }

  /**
   * Get the currently active pane name
   */
  getActivePaneName(): 'left' | 'right' {
    return this.activePane
  }

  /**
   * Set which pane is active
   */
  setActivePane(pane: 'left' | 'right'): void {
    this.activePane = pane
  }

  /**
   * Toggle between left and right panes
   */
  toggleActivePane(): void {
    this.activePane = this.activePane === 'left' ? 'right' : 'left'
  }

  /**
   * Update the active pane with partial state
   */
  updateActivePane(updates: Partial<PaneState>): PaneState {
    if (this.activePane === 'left') {
      this.leftPane = { ...this.leftPane, ...updates }
      return this.leftPane
    } else {
      this.rightPane = { ...this.rightPane, ...updates }
      return this.rightPane
    }
  }

  /**
   * Update a specific pane with partial state
   */
  updatePane(pane: 'left' | 'right', updates: Partial<PaneState>): PaneState {
    if (pane === 'left') {
      this.leftPane = { ...this.leftPane, ...updates }
      return this.leftPane
    } else {
      this.rightPane = { ...this.rightPane, ...updates }
      return this.rightPane
    }
  }

  /**
   * Set complete pane state
   */
  setPane(pane: 'left' | 'right', state: PaneState): void {
    if (pane === 'left') {
      this.leftPane = state
    } else {
      this.rightPane = state
    }
  }

  /**
   * Get both panes for rendering
   */
  getBothPanes(): { left: PaneState; right: PaneState } {
    return {
      left: this.leftPane,
      right: this.rightPane,
    }
  }

  /**
   * Swap the paths between left and right panes
   * Useful for synchronizing panes
   */
  swapPanePaths(): void {
    const leftPath = this.leftPane.currentPath
    const rightPath = this.rightPane.currentPath
    this.leftPane.currentPath = rightPath
    this.rightPane.currentPath = leftPath
  }

  /**
   * Save pane paths to localStorage
   */
  savePanePaths(): void {
    localStorage.setItem('commander-left-path', this.leftPane.currentPath)
    localStorage.setItem('commander-right-path', this.rightPane.currentPath)
  }

  /**
   * Load pane paths from localStorage
   */
  loadPanePaths(): { left: string | null; right: string | null } {
    return {
      left: localStorage.getItem('commander-left-path'),
      right: localStorage.getItem('commander-right-path'),
    }
  }

  /**
   * Save sort settings to localStorage
   */
  saveSortSettings(pane: 'left' | 'right'): void {
    const paneState = this.getPane(pane)
    const paneKey =
      pane === 'left' ? 'commander-left-sort' : 'commander-right-sort'
    localStorage.setItem(
      paneKey,
      JSON.stringify({
        sortBy: paneState.sortBy,
        sortDirection: paneState.sortDirection,
      }),
    )
  }
}
