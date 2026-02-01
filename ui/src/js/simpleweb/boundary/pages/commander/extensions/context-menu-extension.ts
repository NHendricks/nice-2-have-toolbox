/**
 * Context Menu Extension for Commander
 * This file adds context menu functionality via SHIFT + F10
 */

import type { Commander } from '../../Commander.js'

export function addContextMenuMethods(commander: Commander) {
  // Add property tracking
  ;(commander as any)._contextMenu = null

  // Define getter/setter for contextMenu
  Object.defineProperty(commander, 'contextMenu', {
    get() {
      return (this as any)._contextMenu
    },
    set(value) {
      ;(this as any)._contextMenu = value
      this.requestUpdate()
    },
    enumerable: true,
    configurable: true,
  })

  // Add openContextMenu method
  ;(commander as any).openContextMenu = function () {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..') {
      this.setStatus('No valid file selected for context menu', 'error')
      return
    }

    const selectedCount =
      pane.selectedIndices.size > 0 ? pane.selectedIndices.size : 1

    this.contextMenu = {
      fileName: item.name,
      isDirectory: item.isDirectory,
      selectedCount: selectedCount,
    }
  }

  // Add closeContextMenu method
  ;(commander as any).closeContextMenu = function () {
    this.contextMenu = null
  }

  // Add handleContextMenuAction method
  ;(commander as any).handleContextMenuAction = function (action: string) {
    switch (action) {
      case 'view':
        this.handleF3()
        break
      case 'rename':
        this.handleF2()
        break
      case 'copy':
        this.handleF5()
        break
      case 'move':
        this.handleF6()
        break
      case 'delete':
        this.handleF8()
        break
      case 'copy-path':
        this.handleF10()
        break
      case 'zip':
        this.handleF12()
        break
      case 'command':
        this.handleF9()
        break
      default:
        this.setStatus(`Action not implemented: ${action}`, 'error')
    }
  }
}
