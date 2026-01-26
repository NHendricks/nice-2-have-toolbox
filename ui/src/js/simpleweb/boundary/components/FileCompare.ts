import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import './SimpleDialog'

interface FileDiff {
  leftContent: string
  rightContent: string
  leftPath: string
  rightPath: string
}

export class FileCompare extends LitElement {
  static styles = css`
    .file-compare-content {
      display: flex;
      flex-direction: column;
      height: 70vh;
      background: #0f172a;
    }

    .compare-header {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      background: #334155;
      padding: 0.5rem;
      border-bottom: 2px solid #475569;
    }

    .file-header {
      background: #1e293b;
      padding: 0.75rem 1rem;
      border-radius: 4px;
    }

    .file-path {
      color: #fbbf24;
      font-weight: bold;
      font-size: 0.9rem;
      font-family: 'Courier New', monospace;
      word-break: break-all;
    }

    .file-info {
      color: #94a3b8;
      font-size: 0.75rem;
      margin-top: 0.25rem;
    }

    .compare-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      background: #334155;
      flex: 1;
      overflow: hidden;
    }

    .file-content {
      background: #0f172a;
      overflow: auto;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-all;
    }

    .line-numbers {
      display: inline-block;
      width: 40px;
      color: #64748b;
      text-align: right;
      padding-right: 1rem;
      user-select: none;
      border-right: 1px solid #334155;
      margin-right: 1rem;
    }

    .line {
      display: block;
    }

    .line.added {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
    }

    .line.removed {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
    }

    .line.modified {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .diff-mode-toggle {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
    }

    .diff-mode-button {
      padding: 0.4rem 0.8rem;
      background: #475569;
      border: none;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: bold;
      transition: all 0.2s;
    }

    .diff-mode-button:hover {
      background: #64748b;
    }

    .diff-mode-button.active {
      background: #0ea5e9;
    }

    .unified-diff {
      background: #0f172a;
      overflow: auto;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre;
      color: #cbd5e1;
    }

    .diff-line-add {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      display: block;
    }

    .diff-line-remove {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      display: block;
    }

    .diff-line-context {
      color: #cbd5e1;
      display: block;
    }

    .diff-line-header {
      color: #0ea5e9;
      font-weight: bold;
      display: block;
      margin-top: 1rem;
    }

    .loading-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      gap: 1rem;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #334155;
      border-top: 4px solid #0ea5e9;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .error-message {
      color: #ef4444;
      padding: 2rem;
      text-align: center;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      margin: 1rem;
    }

    .dialog-buttons {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      justify-content: flex-end;
    }

    .dialog-buttons button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 0.9rem;
    }

    .btn-cancel {
      background: #475569;
      color: #fff;
    }

    .btn-cancel:hover {
      background: #64748b;
    }
  `

  @property({ type: String })
  leftPath = ''

  @property({ type: String })
  rightPath = ''

  @property({ type: String })
  leftContent = ''

  @property({ type: String })
  rightContent = ''

  @property({ type: Boolean })
  loading = false

  @property({ type: String })
  error = ''

  @property({ type: String })
  viewMode: 'side-by-side' | 'unified' = 'side-by-side'

  async connectedCallback() {
    super.connectedCallback()
    await this.loadFiles()
  }

  async loadFiles() {
    if (!this.leftPath || !this.rightPath) return

    this.loading = true
    this.error = ''

    try {
      // Load left file
      const leftResponse = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'read',
          filePath: this.leftPath,
        },
      )

      // Load right file
      const rightResponse = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'read',
          filePath: this.rightPath,
        },
      )

      if (leftResponse.success && rightResponse.success) {
        this.leftContent = leftResponse.data.content
        this.rightContent = rightResponse.data.content
      } else {
        this.error =
          leftResponse.error || rightResponse.error || 'Fehler beim Laden'
      }
    } catch (error: any) {
      this.error = error.message || 'Unbekannter Fehler'
    } finally {
      this.loading = false
    }
  }

  close() {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    )
  }

  generateUnifiedDiff(): string {
    const leftLines = this.leftContent.split('\n')
    const rightLines = this.rightContent.split('\n')

    let diff = `--- ${this.leftPath}\n`
    diff += `+++ ${this.rightPath}\n`

    const maxLines = Math.max(leftLines.length, rightLines.length)
    let i = 0

    while (i < maxLines) {
      // Find a chunk of differences
      let chunkStart = i
      let hasDiff = false

      // Look ahead to find differences
      while (i < maxLines) {
        const leftLine = leftLines[i] || ''
        const rightLine = rightLines[i] || ''

        if (leftLine !== rightLine) {
          hasDiff = true
          i++
        } else if (hasDiff) {
          break
        } else {
          i++
        }
      }

      if (hasDiff) {
        // Output chunk header
        const contextStart = Math.max(0, chunkStart - 3)
        const contextEnd = Math.min(maxLines, i + 3)

        diff += `@@ -${contextStart + 1},${contextEnd - contextStart} +${contextStart + 1},${contextEnd - contextStart} @@\n`

        // Output context and changes
        for (let j = contextStart; j < contextEnd; j++) {
          const leftLine = leftLines[j] || ''
          const rightLine = rightLines[j] || ''

          if (j >= chunkStart && j < i && leftLine !== rightLine) {
            if (leftLine && rightLine) {
              diff += `-${leftLine}\n`
              diff += `+${rightLine}\n`
            } else if (leftLine) {
              diff += `-${leftLine}\n`
            } else {
              diff += `+${rightLine}\n`
            }
          } else {
            diff += ` ${leftLine}\n`
          }
        }
      }
    }

    return diff || 'Keine Unterschiede gefunden'
  }

  renderSideBySide() {
    const leftLines = this.leftContent.split('\n')
    const rightLines = this.rightContent.split('\n')
    const maxLines = Math.max(leftLines.length, rightLines.length)

    return html`
      <div class="compare-header">
        <div class="file-header">
          <div class="file-path">📄 ${this.leftPath.split(/[/\\]/).pop()}</div>
          <div class="file-info">
            ${leftLines.length} Zeilen | ${this.leftPath}
          </div>
        </div>
        <div class="file-header">
          <div class="file-path">📄 ${this.rightPath.split(/[/\\]/).pop()}</div>
          <div class="file-info">
            ${rightLines.length} Zeilen | ${this.rightPath}
          </div>
        </div>
      </div>

      <div class="compare-body">
        <div class="file-content">
          ${leftLines.map(
            (line, index) => html`
              <span
                class="line ${line !== (rightLines[index] || '')
                  ? 'modified'
                  : ''}"
              >
                <span class="line-numbers">${index + 1}</span>${line || ' '}
              </span>
            `,
          )}
        </div>
        <div class="file-content">
          ${rightLines.map(
            (line, index) => html`
              <span
                class="line ${line !== (leftLines[index] || '')
                  ? 'modified'
                  : ''}"
              >
                <span class="line-numbers">${index + 1}</span>${line || ' '}
              </span>
            `,
          )}
        </div>
      </div>
    `
  }

  renderUnifiedDiff() {
    const diff = this.generateUnifiedDiff()
    const lines = diff.split('\n')

    return html`
      <div class="unified-diff">
        ${lines.map((line) => {
          if (line.startsWith('+++') || line.startsWith('---')) {
            return html`<span class="diff-line-header">${line}</span>`
          } else if (line.startsWith('+')) {
            return html`<span class="diff-line-add">${line}</span>`
          } else if (line.startsWith('-')) {
            return html`<span class="diff-line-remove">${line}</span>`
          } else if (line.startsWith('@@')) {
            return html`<span class="diff-line-header">${line}</span>`
          } else {
            return html`<span class="diff-line-context">${line}</span>`
          }
        })}
      </div>
    `
  }

  render() {
    return html`
      <simple-dialog
        .open=${true}
        .title=${'📊 Dateivergleich'}
        .width=${'95%'}
        .maxHeight=${'90vh'}
        @dialog-close=${this.close}
      >
        <div class="file-compare-content">
          ${this.loading
            ? html`
                <div class="loading-overlay">
                  <div class="spinner"></div>
                  <div style="color: #0ea5e9; font-weight: bold;">
                    Lade Dateien...
                  </div>
                </div>
              `
            : this.error
              ? html`
                  <div class="error-message">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">
                      ⚠️
                    </div>
                    <div style="font-weight: bold; margin-bottom: 0.5rem;">
                      Fehler beim Laden der Dateien
                    </div>
                    <div>${this.error}</div>
                  </div>
                `
              : html`
                  <div class="diff-mode-toggle">
                    <button
                      class="diff-mode-button ${this.viewMode === 'side-by-side'
                        ? 'active'
                        : ''}"
                      @click=${() => (this.viewMode = 'side-by-side')}
                    >
                      ⚏ Nebeneinander
                    </button>
                    <button
                      class="diff-mode-button ${this.viewMode === 'unified'
                        ? 'active'
                        : ''}"
                      @click=${() => (this.viewMode = 'unified')}
                    >
                      ≡ Unified Diff
                    </button>
                  </div>
                  ${this.viewMode === 'side-by-side'
                    ? this.renderSideBySide()
                    : this.renderUnifiedDiff()}
                `}
        </div>

        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.close}>
            Schließen (ESC)
          </button>
        </div>
      </simple-dialog>
    `
  }
}

customElements.define('file-compare', FileCompare)
