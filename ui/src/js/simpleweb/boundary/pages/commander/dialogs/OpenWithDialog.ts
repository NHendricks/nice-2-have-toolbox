import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'

interface Application {
  name: string
  command: string
  isDefault: boolean
  isCustom?: boolean
}

export class OpenWithDialog extends LitElement {
  @property({ type: String })
  fileName = ''

  @property({ type: String })
  filePath = ''

  @property({ type: Array })
  applications: Application[] = []

  @property({ type: Boolean })
  loading = false

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
    if (e.key === 'Escape') {
      e.preventDefault()
      this.handleClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.moveFocus(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.moveFocus(-1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      this.selectFocusedApp()
    }
  }

  moveFocus(delta: number) {
    if (this.applications.length === 0) return

    const newIndex = Math.max(
      0,
      Math.min(this.applications.length - 1, this.focusedIndex + delta),
    )

    this.focusedIndex = newIndex
    this.scrollAppIntoView(newIndex)
  }

  scrollAppIntoView(index: number) {
    setTimeout(() => {
      const appItems = this.shadowRoot?.querySelectorAll('.app-item')
      if (appItems && appItems[index]) {
        appItems[index].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }, 0)
  }

  selectFocusedApp() {
    if (
      this.applications.length === 0 ||
      this.focusedIndex >= this.applications.length
    )
      return

    const selectedApp = this.applications[this.focusedIndex]
    this.handleSelectApp(selectedApp.command)
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
      max-width: 500px;
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

    .loading {
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
    }

    .no-apps {
      padding: 2rem;
      text-align: center;
      color: #94a3b8;
    }

    .app-item {
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

    .app-item:hover {
      background: #334155;
    }

    .app-item.focused {
      background: #0ea5e9;
    }

    .app-item-icon {
      font-size: 1.25rem;
      width: 1.5rem;
      text-align: center;
    }

    .app-item-content {
      flex: 1;
      min-width: 0;
    }

    .app-item-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .app-item-command {
      font-size: 0.75rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.25rem;
    }

    .default-badge {
      display: inline-block;
      padding: 0.125rem 0.375rem;
      background: #22c55e;
      color: white;
      border-radius: 3px;
      font-size: 0.65rem;
      font-weight: 600;
      text-transform: uppercase;
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

    .remove-btn {
      padding: 0.25rem 0.5rem;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.75rem;
      transition: background-color 0.15s;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .remove-btn:hover {
      background: #dc2626;
    }
  `

  async handleBrowseForApp() {
    try {
      // Get platform from navigator
      const isMac = navigator.platform.toLowerCase().includes('mac')
      const isWindows = navigator.platform.toLowerCase().includes('win')

      // Platform-specific dialog configuration
      let dialogOptions: any = {}

      if (isMac) {
        // On macOS, allow selecting .app bundles (which are directories)
        dialogOptions = {
          properties: ['openFile', 'openDirectory'],
          filters: [
            { name: 'Applications', extensions: ['app'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        }
      } else if (isWindows) {
        // On Windows, allow selecting executables
        dialogOptions = {
          properties: ['openFile'],
          filters: [
            { name: 'Executables', extensions: ['exe', 'bat', 'cmd'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        }
      } else {
        // On Linux and other platforms
        dialogOptions = {
          properties: ['openFile'],
          filters: [{ name: 'All Files', extensions: ['*'] }],
        }
      }

      const result = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        dialogOptions,
      )

      if (result && !result.canceled && result.filePaths.length > 0) {
        const appPath = result.filePaths[0]
        const appName = appPath.split(/[/\\]/).pop() || 'Custom Application'

        // Dispatch event to save and use this application
        this.dispatchEvent(
          new CustomEvent('select-custom', {
            detail: { path: appPath, name: appName },
            bubbles: true,
            composed: true,
          }),
        )

        this.handleClose()
      }
    } catch (error) {
      console.error('Error browsing for application:', error)
    }
  }

  handleRemoveApp(command: string, event: Event) {
    event.stopPropagation() // Prevent app selection when clicking remove

    this.dispatchEvent(
      new CustomEvent('remove-app', {
        detail: command,
        bubbles: true,
        composed: true,
      }),
    )
  }

  handleSelectApp(command: string) {
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: command,
        bubbles: true,
        composed: true,
      }),
    )

    this.handleClose()
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
    return html`
      <div class="overlay" @click=${this.handleClose}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="app-item-icon">🚀</span>
            <span class="dialog-title">Open With - ${this.fileName}</span>
          </div>

          <div class="dialog-content">
            ${this.loading
              ? html`<div class="loading">Loading applications...</div>`
              : html`
                  ${this.applications.length === 0
                    ? html`<div class="no-apps">
                        No applications found for this file type.
                      </div>`
                    : this.applications.map(
                        (app, index) => html`
                          <div
                            class="app-item ${index === this.focusedIndex
                              ? 'focused'
                              : ''}"
                            @click=${() => this.handleSelectApp(app.command)}
                          >
                            <span class="app-item-icon">
                              ${app.isDefault ? '⭐' : '📦'}
                            </span>
                            <div class="app-item-content">
                              <div class="app-item-name">
                                ${app.name}
                                ${app.isDefault
                                  ? html`<span class="default-badge"
                                      >Default</span
                                    >`
                                  : ''}
                              </div>
                              <div class="app-item-command">${app.command}</div>
                            </div>
                            ${app.isCustom
                              ? html`<button
                                  class="remove-btn"
                                  @click=${(e: Event) =>
                                    this.handleRemoveApp(app.command, e)}
                                  title="Remove custom application"
                                >
                                  🗑️
                                </button>`
                              : ''}
                          </div>
                        `,
                      )}
                  <div
                    class="app-item"
                    @click=${this.handleBrowseForApp}
                    style="border-top: 1px solid #475569; margin-top: 0.5rem; padding-top: 0.75rem;"
                  >
                    <span class="app-item-icon">📁</span>
                    <div class="app-item-content">
                      <div class="app-item-name">Browse for application...</div>
                      <div class="app-item-command">
                        Select a custom application
                      </div>
                    </div>
                  </div>
                `}
          </div>

          <div class="dialog-footer">
            <button class="btn btn-secondary" @click=${this.handleClose}>
              Cancel (ESC)
            </button>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('open-with-dialog', OpenWithDialog)
