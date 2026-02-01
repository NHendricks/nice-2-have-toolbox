# Context Menu Integration for SHIFT + F10

## Implementation Complete

The SHIFT + F10 keyboard shortcut has been implemented to open a context menu for the selected file/directory.

### Files Created/Modified:

1. **KeyboardHandler.ts** - Modified to handle SHIFT + F10
   - Added check for `event.shiftKey` on F10 key
   - Calls `this.commander.openContextMenu()` when SHIFT + F10 is pressed

2. **ContextMenuDialog.ts** - New dialog component
   - Displays a context menu with file operations
   - Shows appropriate options based on selection

3. **dialogs/index.ts** - Updated to export ContextMenuDialog

### Integration Steps for Commander.ts:

Add these methods to the Commander class (after `closeHelp()` method):

```typescript
openContextMenu() {
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

closeContextMenu() {
  this.contextMenu = null
}

handleContextMenuAction(action: string) {
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
```

Add this to the render() method (after the showHelp dialog):

```typescript
${this.contextMenu
  ? html`<context-menu-dialog
      .fileName=${this.contextMenu.fileName}
      .isDirectory=${this.contextMenu.isDirectory}
      .selectedCount=${this.contextMenu.selectedCount}
      @close=${this.closeContextMenu}
      @action=${(e: CustomEvent) => this.handleContextMenuAction(e.detail)}
    ></context-menu-dialog>`
  : ''}
```

## Usage

Press **SHIFT + F10** while a file or directory is selected to open the context menu with the following options:

- View/Open (F3)
- Rename (F2)
- Copy (F5)
- Move (F6)
- Delete (F8)
- Copy Path (F10)
- Create ZIP (F12)
- Execute Command Here (F9)

The menu can be closed by clicking outside, pressing ESC, or selecting an action.
