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
      font-family: 'JetBrains Mono', monospace;
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
      /* transform origin at center for zooming */
      transform-origin: center center;
      transition: transform 0.1s ease-out;
    }
    .dialog-footer {
      background: #334155;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .zoom-controls {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-right: 0.5rem;
    }

    .zoom-controls button {
      background: transparent;
      border: 1px solid #fff;
      color: #fff;
      width: 1.5rem;
      height: 1.5rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      line-height: 1;
    }

    .zoom-controls span {
      color: #fff;
      min-width: 2.5rem;
      text-align: center;
    }
  `

  @property({ type: Object })
  file: {
    path: string
    content: string
    size: number
    isImage: boolean
  } | null = null

  // zoom level for image viewer (1 == 100%)
  @property({ type: Number })
  zoomLevel = 1

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  private zoomIn() {
    // increase by 25%, clamp at 10x
    this.zoomLevel = Math.min(this.zoomLevel * 1.25, 10)
  }

  private zoomOut() {
    // decrease by 20% (inverse of 1.25), clamp at 0.1x
    this.zoomLevel = Math.max(this.zoomLevel / 1.25, 0.1)
  }

  private resetZoom() {
    this.zoomLevel = 1
  }

  private onWheel(e: WheelEvent) {
    if (!this.file?.isImage) return
    if (e.deltaY < 0) {
      this.zoomIn()
    } else {
      this.zoomOut()
    }
    e.preventDefault()
  }

  private handleKeydown = (e: KeyboardEvent) => {
    if (!this.file?.isImage) return
    switch (e.key) {
      case '+':
      case '=': // some layouts use = for plus
        e.preventDefault()
        this.zoomIn()
        break
      case '-':
        e.preventDefault()
        this.zoomOut()
        break
      case '0':
        e.preventDefault()
        this.resetZoom()
        break
      default:
        return
    }
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.handleKeydown)
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeydown)
    super.disconnectedCallback()
  }

  updated(changed: Map<string, any>) {
    if (changed.has('file')) {
      // reset zoom whenever a new file is opened
      this.zoomLevel = 1
    }
  }

  render() {
    if (!this.file) return ''

    return html`
      <div class="dialog-overlay" @click=${this.close}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">${this.file.path}</span>
            ${this.file.isImage
              ? html`
                  <div class="zoom-controls">
                    <button @click=${this.zoomOut} title="Zoom out">-</button>
                    <span>${Math.round(this.zoomLevel * 100)}%</span>
                    <button @click=${this.zoomIn} title="Zoom in">+</button>
                    <button @click=${this.resetZoom} title="Reset">⟳</button>
                  </div>
                `
              : ''}
            <button class="dialog-close" @click=${this.close}>ESC</button>
          </div>
          <div
            class="dialog-content ${this.file.isImage ? 'image-viewer' : ''}"
            @wheel=${this.onWheel}
          >
            ${this.file.isImage
              ? html`<img
                  src="${this.file.content}"
                  alt="Image preview"
                  style="transform: scale(${this.zoomLevel});"
                />`
              : this.file.content}
          </div>
          <div class="dialog-footer">
            ${this.file.isImage
              ? html`
                  Bild: ${this.file.path.split(/[/\\]/).pop()} |
                  ${Math.round(this.zoomLevel * 100)}% | press ESC to close
                `
              : html`Größe: ${this.formatFileSize(this.file.size)} | press ESC
                to close`}
          </div>
        </div>
      </div>
    `
  }
}
