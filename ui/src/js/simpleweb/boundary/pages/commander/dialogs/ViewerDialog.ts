import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('viewer-dialog')
export class ViewerDialog extends LitElement {
  static styles = css`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: #1e293b;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      width: 90%;
      height: 80%;
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
      overflow: hidden;
      text-overflow: ellipsis;
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
    .dialog-content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .dialog-content.image-viewer {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: #000;
    }
    .dialog-content.image-viewer img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .dialog-footer {
      background: #334155;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }
  `

  @property({ type: Object })
  file: {
    path: string
    content: string
    size: number
    isImage: boolean
  } | null = null

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  render() {
    if (!this.file) return ''

    return html`
      <div class="dialog-overlay" @click=${this.close}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">${this.file.path}</span>
            <button class="dialog-close" @click=${this.close}>ESC</button>
          </div>
          <div
            class="dialog-content ${this.file.isImage ? 'image-viewer' : ''}"
          >
            ${this.file.isImage
              ? html`<img src="${this.file.content}" alt="Image preview" />`
              : this.file.content}
          </div>
          <div class="dialog-footer">
            ${this.file.isImage
              ? `Bild: ${this.file.path.split(/[/\\]/).pop()}`
              : `Größe: ${this.formatFileSize(this.file.size)}`}
            | press ESC to close
          </div>
        </div>
      </div>
    `
  }
}
