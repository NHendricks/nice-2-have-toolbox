import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import type { NetworkShareInfo } from '../commander.types.js'

@customElement('drive-selector-dialog')
export class DriveSelectorDialog extends LitElement {
  static styles = css`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: #1e293b;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .dialog-header {
      background: #0ea5e9;
      padding: 1rem;
      font-weight: bold;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .dialog-title {
      font-size: 1.1rem;
    }
    .dialog-close {
      background: #dc2626;
      border: none;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .drive-list {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem;
    }
    .drive-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .drive-item:hover {
      background: #334155;
    }
    .drive-item.focused {
      background: #0ea5e9;
    }
    .drive-icon {
      font-size: 1.5rem;
    }
    .drive-info {
      flex: 1;
    }
    .drive-label {
      font-weight: bold;
      color: #e2e8f0;
    }
    .drive-path {
      font-size: 0.85rem;
      color: #94a3b8;
    }
    .dialog-footer {
      padding: 1rem;
      border-top: 2px solid #475569;
    }
    .btn-confirm {
      width: 100%;
      padding: 0.75rem;
      background: #059669;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .section-header {
      padding: 0.5rem 0;
      color: #fbbf24;
      font-weight: bold;
      border-bottom: 1px solid #475569;
      margin-top: 0.5rem;
    }
    .unc-input-container {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #0f172a;
      border-radius: 4px;
      margin: 0.5rem;
    }
    .unc-input {
      flex: 1;
      padding: 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-family: monospace;
    }
    .unc-input:focus {
      outline: none;
      border-color: #0ea5e9;
    }
    .btn-small {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-go {
      background: #059669;
      color: #fff;
    }
    .btn-cancel {
      background: #475569;
      color: #fff;
    }
    .btn-add-network {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      margin: 0.5rem;
      background: #1e3a5f;
      border: 1px dashed #0ea5e9;
      border-radius: 4px;
      color: #0ea5e9;
      cursor: pointer;
      font-size: 0.9rem;
    }
    .btn-add-network:hover {
      background: #1e4976;
    }
  `

  @property({ type: Array }) drives: any[] = []
  @property({ type: Array }) favorites: string[] = []
  @property({ type: String }) currentPath = ''
  @property({ type: Number }) focusedIndex = 0
  @property({ type: Array }) networkShares: NetworkShareInfo[] = []
  @property({ type: Boolean }) showUncInput = false
  @property({ type: String }) uncPath = ''

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }
  private selectDrive(path: string) {
    this.dispatchEvent(new CustomEvent('select', { detail: path }))
  }
  private toggleFavorite(path: string) {
    this.dispatchEvent(new CustomEvent('toggle-favorite', { detail: path }))
  }

  private isFavorite(path: string): boolean {
    return this.favorites.includes(path)
  }

  private toggleUncInput() {
    this.showUncInput = !this.showUncInput
    this.uncPath = ''
  }

  private handleUncSubmit() {
    if (this.uncPath && this.uncPath.startsWith('\\\\')) {
      // Automatically add network share to favorites
      this.dispatchEvent(
        new CustomEvent('add-to-favorites', {
          detail: this.uncPath,
        }),
      )

      // Navigate to the network share
      this.selectDrive(this.uncPath)
      this.showUncInput = false
      this.uncPath = ''
    }
  }

  private handleUncKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.handleUncSubmit()
    } else if (e.key === 'Escape') {
      this.showUncInput = false
      this.uncPath = ''
    }
  }

  render() {
    const isCurrentFavorite = this.isFavorite(this.currentPath)

    return html`
      <div class="dialog-overlay" @click=${this.close}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title"
              >💾 select drive, network & favorites</span
            >
            <button class="dialog-close" @click=${this.close}>ESC</button>
          </div>
          <div class="drive-list">
            ${this.favorites.length > 0
              ? html`
                  <div
                    style="padding: 0.5rem 0; color: #fbbf24; font-weight: bold; border-bottom: 1px solid #475569;"
                  >
                    ⭐ Favorites
                  </div>
                  ${this.favorites.map(
                    (favPath, index) => html`
                      <div
                        class="drive-item ${this.focusedIndex === index
                          ? 'focused'
                          : ''}"
                        style="position: relative;"
                      >
                        <span class="drive-icon">⭐</span>
                        <div
                          class="drive-info"
                          @click=${() => this.selectDrive(favPath)}
                          style="cursor: pointer;"
                        >
                          <div class="drive-label">
                            ${favPath.split(/[/\\]/).pop() || favPath}
                          </div>
                          <div class="drive-path">${favPath}</div>
                        </div>
                        <button
                          @click=${(e: Event) => {
                            e.stopPropagation()
                            this.toggleFavorite(favPath)
                          }}
                          style="background: #dc2626; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1.2rem;"
                          title="Aus Favoriten entfernen"
                        >
                          🗑️
                        </button>
                      </div>
                    `,
                  )}
                `
              : ''}
            <!-- FTP Section -->
            <div class="section-header">📡 FTP</div>
            <button
              class="btn-add-network"
              @click=${() => this.dispatchEvent(new CustomEvent('open-ftp'))}
            >
              + Connect to FTP Server
            </button>

            <!-- Network Shares Section -->
            <div class="section-header">🌐 Network</div>
            ${this.networkShares.length > 0
              ? this.networkShares.map(
                  (share) => html`
                    <div
                      class="drive-item"
                      @click=${() => this.selectDrive(share.remotePath)}
                    >
                      <span class="drive-icon">🌐</span>
                      <div class="drive-info">
                        <div class="drive-label">
                          ${share.name
                            ? `${share.name} → `
                            : ''}${share.remotePath.split('\\').pop()}
                        </div>
                        <div class="drive-path">${share.remotePath}</div>
                      </div>
                      <span
                        style="font-size: 0.75rem; color: ${share.status ===
                        'OK'
                          ? '#22c55e'
                          : '#f59e0b'};"
                      >
                        ${share.status}
                      </span>
                    </div>
                  `,
                )
              : ''}
            ${this.showUncInput
              ? html`
                  <div class="unc-input-container">
                    <input
                      type="text"
                      class="unc-input"
                      placeholder="\\\\server\\share"
                      .value=${this.uncPath}
                      @input=${(e: Event) =>
                        (this.uncPath = (e.target as HTMLInputElement).value)}
                      @keydown=${this.handleUncKeydown}
                      autofocus
                    />
                    <button
                      class="btn-small btn-go"
                      @click=${this.handleUncSubmit}
                    >
                      Go
                    </button>
                    <button
                      class="btn-small btn-cancel"
                      @click=${this.toggleUncInput}
                    >
                      Cancel
                    </button>
                  </div>
                `
              : html`
                  <button class="btn-add-network" @click=${this.toggleUncInput}>
                    + Add Network Path
                  </button>
                `}
            <!-- Drives Section -->
            <div class="section-header">💾 Drives</div>
            ${this.drives.map(
              (drive, index) => html`
                <div
                  class="drive-item ${this.focusedIndex ===
                  this.favorites.length + index
                    ? 'focused'
                    : ''}"
                  @click=${() => this.selectDrive(drive.path)}
                >
                  <span class="drive-icon">💾</span>
                  <div class="drive-info">
                    <div class="drive-label">${drive.label}</div>
                    <div class="drive-path">${drive.path}</div>
                  </div>
                </div>
              `,
            )}
          </div>
          ${!isCurrentFavorite
            ? html`
                <div class="dialog-footer">
                  <button
                    class="btn-confirm"
                    @click=${(e: Event) => {
                      e.stopPropagation()
                      this.toggleFavorite(this.currentPath)
                    }}
                  >
                    ☆ add current directory<br /><span
                      style="font-size: 0.85rem; opacity: 0.8;"
                      >${this.currentPath}</span
                    >
                  </button>
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }
}
