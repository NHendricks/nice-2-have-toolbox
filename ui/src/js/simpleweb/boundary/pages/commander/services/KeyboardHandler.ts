import type { Commander } from '../../Commander.js'

/**
 * KeyboardHandler - Handles all keyboard events for Commander
 * Uses command pattern for key mappings
 */
export class KeyboardHandler {
  private commander: Commander

  constructor(commander: Commander) {
    this.commander = commander
  }

  /**
   * Main keyboard event handler
   */
  handleKeydown = (event: KeyboardEvent): void => {
    // Handle ESC key first (works even in input fields)
    if (this.handleEscapeKey(event)) {
      return
    }

    // Handle ENTER for delete dialog (works even in input fields)
    if (this.handleDeleteEnterKey(event)) {
      return
    }

    // Ignore other keys if typing in an input field (but allow ESC and ENTER above)
    if (this.isInputField(event.target)) {
      // Allow ENTER to bubble up in input fields so dialogs can handle form submission
      if (event.key === 'Enter') {
        return
      }
      // Block all other keys when in input fields
      return
    }

    // Handle drive selector navigation
    if (this.handleDriveSelectorKeys(event)) {
      return
    }

    // Handle arrow keys in image viewer
    if (this.handleImageViewerKeys(event)) {
      return
    }

    // Handle alphanumeric quick launch
    if (this.handleQuickLaunchKey(event)) {
      return
    }

    // Handle modifier key combinations
    if (this.handleModifierKeys(event)) {
      return
    }

    // Handle standard keys
    this.handleStandardKeys(event)
  }

  /**
   * Check if the event target is an input field
   */
  private isInputField(target: EventTarget | null): boolean {
    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement
    )
  }

  /**
   * Handle keyboard navigation in drive selector
   */
  private handleDriveSelectorKeys(event: KeyboardEvent): boolean {
    if (!this.commander.showDriveSelector) {
      return false
    }

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        this.commander.closeDriveSelector()
        return true

      case 'ArrowUp':
        event.preventDefault()
        this.commander.moveDriveSelectorFocus(-1)
        return true

      case 'ArrowDown':
        event.preventDefault()
        this.commander.moveDriveSelectorFocus(1)
        return true

      case 'Enter':
        event.preventDefault()
        this.commander.selectFocusedDrive()
        return true

      default:
        // Block other keys while drive selector is open
        return true
    }
  }

  /**
   * Handle ESC key for various dialogs
   */
  private handleEscapeKey(event: KeyboardEvent): boolean {
    if (event.key !== 'Escape') {
      return false
    }

    event.preventDefault()

    if (this.commander.showHelp) {
      this.commander.closeHelp()
      return true
    }

    if (this.commander.viewerFile) {
      this.commander.closeViewer()
      return true
    }

    if (this.commander.operationDialog) {
      this.commander.cancelOperation()
      return true
    }

    if (this.commander.deleteDialog) {
      this.commander.cancelDelete()
      return true
    }

    if (this.commander.commandDialog) {
      this.commander.cancelCommand()
      return true
    }

    if (this.commander.quickLaunchDialog) {
      this.commander.cancelQuickLaunch()
      return true
    }

    if (this.commander.renameDialog) {
      this.commander.cancelRename()
      return true
    }

    if (this.commander.zipDialog) {
      this.commander.cancelZip()
      return true
    }

    // Clear filter if active
    const pane = this.commander.getActivePane()
    if (pane.filterActive) {
      this.commander.updateActivePane({ filter: '', filterActive: false })
      return true
    }

    return false
  }

  /**
   * Handle ENTER key for delete dialog
   */
  private handleDeleteEnterKey(event: KeyboardEvent): boolean {
    if (event.key === 'Enter' && this.commander.deleteDialog) {
      event.preventDefault()
      this.commander.executeDelete()
      return true
    }
    return false
  }

  /**
   * Handle arrow keys in image viewer
   */
  private handleImageViewerKeys(event: KeyboardEvent): boolean {
    if (!this.commander.viewerFile || !this.commander.viewerFile.isImage) {
      return false
    }

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        this.commander.viewNextImage()
        return true

      case 'ArrowLeft':
        event.preventDefault()
        this.commander.viewPreviousImage()
        return true

      default:
        return false
    }
  }

  /**
   * Handle alphanumeric input for quick launch
   */
  private handleQuickLaunchKey(event: KeyboardEvent): boolean {
    // Check if any dialog is open
    if (this.isAnyDialogOpen()) {
      return false
    }

    // Check for alphanumeric key without modifiers
    if (
      !event.ctrlKey &&
      !event.altKey &&
      !event.metaKey &&
      event.key.length === 1 &&
      event.key.match(/[a-zA-Z0-9]/)
    ) {
      event.preventDefault()
      this.commander.openQuickLaunch(event.key)
      return true
    }

    return false
  }

  /**
   * Check if any dialog is currently open
   */
  private isAnyDialogOpen(): boolean {
    return !!(
      this.commander.showHelp ||
      this.commander.viewerFile ||
      this.commander.operationDialog ||
      this.commander.deleteDialog ||
      this.commander.showDriveSelector ||
      this.commander.commandDialog ||
      this.commander.quickLaunchDialog ||
      this.commander.renameDialog ||
      this.commander.zipDialog ||
      this.commander.compareDialog ||
      this.commander.getActivePane().filterActive
    )
  }

  /**
   * Handle Alt/Meta key combinations
   */
  private handleModifierKeys(event: KeyboardEvent): boolean {
    if (event.altKey || event.metaKey) {
      return this.handleAltMetaKeys(event)
    }

    return false
  }

  /**
   * Handle Alt/Meta + key combinations
   */
  private handleAltMetaKeys(event: KeyboardEvent): boolean {
    switch (event.key) {
      case '1':
        event.preventDefault()
        this.commander.handlePathClick('left')
        return true

      case '2':
        event.preventDefault()
        this.commander.handlePathClick('right')
        return true

      case 'f':
      case 'F':
        // Only Alt+F for filter (not Cmd+F which is browser search)
        if (event.altKey) {
          event.preventDefault()
          const pane = this.commander.getActivePane()
          this.commander.updateActivePane({
            filterActive: !pane.filterActive,
          })
          // Focus the filter input after a short delay
          if (!pane.filterActive) {
            setTimeout(() => {
              const filterInput = this.commander.shadowRoot?.querySelector(
                '.pane.active .filter-input',
              ) as HTMLInputElement
              if (filterInput) {
                filterInput.focus()
              }
            }, 100)
          }
          return true
        }
        return false

      default:
        return false
    }
  }

  /**
   * Handle standard keys (function keys, arrows, etc.)
   */
  private handleStandardKeys(event: KeyboardEvent): void {
    switch (event.key) {
      // Function keys
      case 'F1':
        event.preventDefault()
        this.commander.openHelp()
        break

      case 'F2':
        event.preventDefault()
        this.commander.handleF2()
        break

      case 'F3':
        event.preventDefault()
        this.commander.handleF3()
        break

      case 'F5':
        event.preventDefault()
        this.commander.handleF5()
        break

      case 'F6':
        event.preventDefault()
        this.commander.handleF6()
        break

      case 'F8':
      case 'Delete':
        event.preventDefault()
        this.commander.handleF8()
        break

      case 'F9':
        event.preventDefault()
        this.commander.handleF9()
        break

      case 'F10':
        event.preventDefault()
        this.commander.handleF10()
        break

      case 'F12':
        event.preventDefault()
        this.commander.handleF12()
        break

      // Enter key
      case 'Enter':
        // Don't handle Enter if certain dialogs are open (they handle it themselves)
        if (this.commander.showHelp || this.commander.showDriveSelector) {
          return
        }
        // Let operation, command, rename, and zip dialogs handle ENTER themselves
        if (
          this.commander.operationDialog ||
          this.commander.commandDialog ||
          this.commander.renameDialog ||
          this.commander.zipDialog ||
          this.commander.quickLaunchDialog
        ) {
          return
        }
        event.preventDefault()
        this.commander.handleEnter()
        break

      // Arrow keys
      case 'ArrowUp':
        this.handleArrowUp(event)
        break

      case 'ArrowDown':
        this.handleArrowDown(event)
        break

      case 'ArrowLeft':
        this.handleArrowLeft(event)
        break

      case 'ArrowRight':
        this.handleArrowRight(event)
        break

      // Page navigation
      case 'PageUp':
        event.preventDefault()
        this.commander.moveFocus(-20, event.ctrlKey)
        break

      case 'PageDown':
        event.preventDefault()
        this.commander.moveFocus(20, event.ctrlKey)
        break

      case 'Home':
        event.preventDefault()
        this.commander.moveFocus(-Infinity, event.ctrlKey)
        break

      case 'End':
        event.preventDefault()
        this.commander.moveFocus(Infinity, event.ctrlKey)
        break

      // Tab
      case 'Tab':
        event.preventDefault()
        this.commander.activePane =
          this.commander.activePane === 'left' ? 'right' : 'left'
        break

      // Space
      case ' ':
        if (event.ctrlKey) {
          event.preventDefault()
          this.commander.toggleSelection()
        }
        break
    }
  }

  /**
   * Handle ArrowUp key with modifiers
   */
  private handleArrowUp(event: KeyboardEvent): void {
    event.preventDefault()
    this.commander.moveFocus(-1, event.ctrlKey)
  }

  /**
   * Handle ArrowDown key with modifiers
   */
  private handleArrowDown(event: KeyboardEvent): void {
    event.preventDefault()
    this.commander.moveFocus(1, event.ctrlKey)
  }

  /**
   * Handle ArrowLeft key with modifiers
   */
  private handleArrowLeft(event: KeyboardEvent): void {
    if (event.altKey) {
      event.preventDefault()
      // Alt+Left: Navigate back in history
      this.commander.navigateHistoryBack()
    } else if (event.ctrlKey) {
      event.preventDefault()
      // Ctrl+Left: Switch left panel to right panel's directory
      const targetPath = this.commander.rightPane.currentPath
      const previousActive = this.commander.activePane
      this.commander.activePane = 'left'
      this.commander.navigateToDirectory(targetPath).then(() => {
        this.commander.activePane = previousActive
      })
    }
  }

  /**
   * Handle ArrowRight key with modifiers
   */
  private handleArrowRight(event: KeyboardEvent): void {
    if (event.altKey) {
      event.preventDefault()
      // Alt+Right: Navigate forward in history
      this.commander.navigateHistoryForward()
    } else if (event.ctrlKey) {
      event.preventDefault()
      // Ctrl+Right: Switch right panel to left panel's directory
      const targetPath = this.commander.leftPane.currentPath
      const previousActive = this.commander.activePane
      this.commander.activePane = 'right'
      this.commander.navigateToDirectory(targetPath).then(() => {
        this.commander.activePane = previousActive
      })
    }
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    window.removeEventListener('keydown', this.handleKeydown)
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    window.addEventListener('keydown', this.handleKeydown)
  }
}
