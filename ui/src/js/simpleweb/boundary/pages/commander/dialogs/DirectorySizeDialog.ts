import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('directory-size-dialog')
export class DirectorySizeDialog extends LitElement {
  static styles = css`
    .content {
      padding: 1rem;
    }
    .directory-name {
      font-size: 1.2rem;
      font-weight: bold;
      color: #0ea5e9;
      margin-bottom: 1rem;
      word-break: break-all;
    }
    .progress-box {
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 2px solid #475569;
    }
    .progress-box.calculating {
      border-color: #0ea5e9;
    }
    .progress-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #0ea5e9;
      font-weight: bold;
      margin-bottom: 0.75rem;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #0ea5e9;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .current-file {
      color: #94a3b8;
      font-size: 0.85rem;
      margin-top: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .result-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.75rem 1rem;
      margin-top: 1rem;
    }
    .result-label {
      color: #94a3b8;
    }
    .result-value {
      color: #fff;
      font-weight: bold;
    }
    .result-value.size {
      color: #22c55e;
      font-size: 1.1rem;
    }
    .file-count {
      color: #cbd5e1;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }
    .dialog-buttons {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      justify-content: flex-end;
    }
    .btn-close {
      background: #475569;
      color: #fff;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-close:hover {
      background: #64748b;
    }
  `

  @property({ type: Object }) data: {
    name: string
    path: string
    isCalculating: boolean
    totalSize: number
    fileCount: number
    directoryCount: number
    currentFile: string
    isFile?: boolean
  } | null = null

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && !this.data?.isCalculating) {
      e.preventDefault()
      this.close()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.handleKeyDown.bind(this))
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.handleKeyDown.bind(this))
  }

  render() {
    if (!this.data) return ''

    const { name, isCalculating, totalSize, fileCount, directoryCount, currentFile, isFile } = this.data

    return html`
      <simple-dialog
        .open=${true}
        .title=${isFile ? 'File Size' : 'Directory Size'}
        .width=${'500px'}
        .showCloseButton=${!isCalculating}
        @dialog-close=${isCalculating ? null : this.close}
      >
        <div class="content">
          <div class="directory-name">${isFile ? '📄' : '📁'} ${name}</div>

          <div class="progress-box ${isCalculating ? 'calculating' : ''}">
            ${isCalculating
              ? html`
                  <div class="progress-indicator">
                    <span class="spinner"></span>
                    Calculating size...
                  </div>
                  <div class="file-count">
                    Files scanned: ${fileCount}
                  </div>
                  ${currentFile
                    ? html`<div class="current-file" title="${currentFile}">
                        ${currentFile}
                      </div>`
                    : ''}
                `
              : isFile
                ? html`
                    <div class="result-grid">
                      <span class="result-label">File Size:</span>
                      <span class="result-value size">${this.formatFileSize(totalSize)}</span>
                    </div>
                  `
                : html`
                    <div class="result-grid">
                      <span class="result-label">Total Size:</span>
                      <span class="result-value size">${this.formatFileSize(totalSize)}</span>

                      <span class="result-label">Files:</span>
                      <span class="result-value">${fileCount.toLocaleString()}</span>

                      <span class="result-label">Folders:</span>
                      <span class="result-value">${directoryCount.toLocaleString()}</span>
                    </div>
                  `}
          </div>
        </div>

        <div slot="footer" class="dialog-buttons">
          ${!isCalculating
            ? html`
                <button class="btn-close" @click=${this.close}>
                  Close (ESC)
                </button>
              `
            : ''}
        </div>
      </simple-dialog>
    `
  }
}
