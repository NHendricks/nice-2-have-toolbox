import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

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
  `

  @property({ type: Array }) drives: any[] = []
  @property({ type: Array }) favorites: string[] = []
  @property({ type: String }) currentPath = ''
  @property({ type: Number }) focusedIndex = 0

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

  render() {
    const isCurrentFavorite = this.isFavorite(this.currentPath)

    return html`
      <div class="dialog-overlay" @click=${this.close}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">💾 select drive & manage favorites</span>
            <button class="dialog-close" @click=${this.close}>ESC</button>
          </div>
          <div class="drive-list">
            ${this.favorites.length > 0
              ? html`
                  <div
                    style="padding: 0.5rem 0; color: #fbbf24; font-weight: bold; border-bottom: 1px solid #475569;"
                  >
                    ⭐ Favoriten
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
                  <div
                    style="padding: 0.5rem 0; color: #fbbf24; font-weight: bold; border-bottom: 1px solid #475569; margin-top: 0.5rem;"
                  >
                    💾 drives
                  </div>
                `
              : ''}
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
