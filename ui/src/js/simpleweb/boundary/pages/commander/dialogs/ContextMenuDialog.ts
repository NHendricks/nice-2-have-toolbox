import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'

interface ContextMenuItem {
  label: string
  icon: string
  action: string
  enabled?: boolean
}

export class ContextMenuDialog extends LitElement {
  @property({ type: String })
  fileName = ''

  @property({ type: Boolean })
  isDirectory = false

  @property({ type: Array })
  selectedCount = 0

  @property({ type: Number })
  focusedIndex = 0

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.handleKeydown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.handleKeydown)
  }

  handleKeydown = (e: KeyboardEvent) => {
    const menuItems = this.getMenuItems().filter(
      (item) => item.action !== 'separator' && item.enabled !== false,
    )

    if (e.key === 'Escape') {
      e.preventDefault()
      this.handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.focusedIndex = (this.focusedIndex + 1) % menuItems.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.focusedIndex =
        (this.focusedIndex - 1 + menuItems.length) % menuItems.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const focusedItem = menuItems[this.focusedIndex]
      if (focusedItem) {
        this.handleAction(focusedItem.action)
      }
    }
  }

  static styles = css`
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #1e293b;
      border: 2px solid #475569;
      border-radius: 8px;
      width: 90%;
      max-width: 400px;
      padding: 0;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      padding: 1rem;
      background: #334155;
      border-bottom: 1px solid #475569;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .dialog-title {
      font-size: 1rem;
      font-weight: 600;
      color: #f1f5f9;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dialog-content {
      padding: 0.5rem;
      max-height: 60vh;
      overflow-y: auto;
    }

    .menu-item {
      padding: 0.75rem 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      border-radius: 4px;
      transition: background-color 0.15s;
      color: #f1f5f9;
      font-size: 0.875rem;
    }

    .menu-item:hover:not(.disabled) {
      background: #334155;
    }

    .menu-item.focused {
      background: #0ea5e9;
    }

    .menu-item.disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .menu-item-icon {
      font-size: 1.25rem;
      width: 1.5rem;
      text-align: center;
    }

    .menu-item-label {
      flex: 1;
    }

    .menu-separator {
      height: 1px;
      background: #475569;
      margin: 0.25rem 0;
    }

    .dialog-footer {
      padding: 0.75rem 1rem;
      background: #334155;
      border-top: 1px solid #475569;
      display: flex;
      justify-content: flex-end;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: background-color 0.15s;
    }

    .btn-secondary {
      background: #475569;
      color: #f1f5f9;
    }

    .btn-secondary:hover {
      background: #64748b;
    }
  `

  getMenuItems(): ContextMenuItem[] {
    const items: ContextMenuItem[] = []

    if (this.selectedCount > 1) {
      items.push({
        label: `${this.selectedCount} items selected`,
        icon: '📦',
        action: 'info',
        enabled: false,
      })
      items.push({ label: '', icon: '', action: 'separator' })
    }

    // File operations
    items.push({
      label: 'View/Open',
      icon: '👁️',
      action: 'view',
      enabled: true,
    })

    items.push({
      label: 'Rename',
      icon: '✏️',
      action: 'rename',
      enabled: this.selectedCount <= 1,
    })

    items.push({ label: '', icon: '', action: 'separator' })

    items.push({
      label: 'Copy',
      icon: '📋',
      action: 'copy',
      enabled: true,
    })

    items.push({
      label: 'Move',
      icon: '➡️',
      action: 'move',
      enabled: true,
    })

    items.push({
      label: 'Delete',
      icon: '🗑️',
      action: 'delete',
      enabled: true,
    })

    items.push({ label: '', icon: '', action: 'separator' })

    if (this.selectedCount === 1 || this.selectedCount === 0) {
      items.push({
        label: 'Copy Path',
        icon: '📋',
        action: 'copy-path',
        enabled: true,
      })
    }

    items.push({
      label: 'Create ZIP',
      icon: '📦',
      action: 'zip',
      enabled: true,
    })

    items.push({ label: '', icon: '', action: 'separator' })

    items.push({
      label: 'Execute Command Here',
      icon: '⚡',
      action: 'command',
      enabled: true,
    })

    return items
  }

  handleAction(action: string) {
    if (action === 'separator' || action === 'info') {
      return
    }

    this.dispatchEvent(
      new CustomEvent('action', {
        detail: action,
        bubbles: true,
        composed: true,
      }),
    )

    this.dispatchEvent(
      new CustomEvent('close', {
        bubbles: true,
        composed: true,
      }),
    )
  }

  handleClose() {
    this.dispatchEvent(
      new CustomEvent('close', {
        bubbles: true,
        composed: true,
      }),
    )
  }

  render() {
    const menuItems = this.getMenuItems()
    const displayName =
      this.selectedCount > 1
        ? `${this.selectedCount} items`
        : this.fileName || 'File Menu'

    // Track focusable items index
    let focusableIndex = -1

    return html`
      <div class="overlay" @click=${this.handleClose}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="menu-item-icon"
              >${this.isDirectory ? '📁' : '📄'}</span
            >
            <span class="dialog-title">${displayName}</span>
          </div>

          <div class="dialog-content">
            ${menuItems.map((item) => {
              if (item.action === 'separator') {
                return html`<div class="menu-separator"></div>`
              }

              // Track focusable items
              if (item.enabled !== false) {
                focusableIndex++
              }

              const isFocused =
                item.enabled !== false && focusableIndex === this.focusedIndex

              return html`
                <div
                  class="menu-item ${item.enabled === false
                    ? 'disabled'
                    : ''} ${isFocused ? 'focused' : ''}"
                  @click=${() =>
                    item.enabled !== false && this.handleAction(item.action)}
                >
                  <span class="menu-item-icon">${item.icon}</span>
                  <span class="menu-item-label">${item.label}</span>
                </div>
              `
            })}
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click=${this.handleClose}>
              Close (ESC)
            </button>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('context-menu-dialog', ContextMenuDialog)
