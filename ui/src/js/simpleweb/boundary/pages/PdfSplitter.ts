import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('nh-pdf-splitter')
export class PdfSplitter extends LitElement {
  @state() private inputPath = ''
  @state() private outputDir = ''
  @state() private loading = false
  @state() private error = ''
  @state() private outputFiles: string[] = []
  @state() private totalPages = 0

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #eaeaea;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    .container {
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      box-sizing: border-box;
      overflow: hidden;
    }

    .panel {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      padding: 0.9rem 1.1rem;
      backdrop-filter: blur(8px);
    }

    .title {
      font-size: 1.45rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    label {
      font-size: 0.85rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .path-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .path-display {
      flex: 1;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      padding: 0.5rem 0.75rem;
      font-size: 0.85rem;
      color: #f1f5f9;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: 2rem;
      line-height: 1rem;
    }

    .path-display.empty {
      color: #475569;
      font-style: italic;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    button {
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      font-weight: 600;
      cursor: pointer;
      background: rgba(148, 163, 184, 0.25);
      color: #e2e8f0;
      transition: all 0.15s ease;
      white-space: nowrap;
      font-size: 0.85rem;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(1.08);
    }

    button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    button.primary {
      background: rgba(59, 130, 246, 0.65);
      color: #ffffff;
      padding: 0.6rem 1.4rem;
      font-size: 0.95rem;
    }

    .inputs {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .actions {
      display: flex;
      justify-content: flex-start;
      padding-top: 0.25rem;
    }

    .status {
      font-size: 0.88rem;
      color: #94a3b8;
      padding: 0.4rem 0;
    }

    .status.error {
      color: #f87171;
    }

    .status.success {
      color: #4ade80;
    }

    .results {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow: hidden;
    }

    .results-header {
      font-size: 0.9rem;
      color: #94a3b8;
      font-weight: 600;
    }

    .file-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .file-item {
      background: rgba(15, 23, 42, 0.45);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 8px;
      padding: 0.45rem 0.7rem;
      font-size: 0.82rem;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .spinner {
      display: inline-block;
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(148, 163, 184, 0.3);
      border-top-color: #60a5fa;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      vertical-align: middle;
      margin-right: 0.4rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `

  private async pickPdf() {
    const result = await (window as any).electron.ipcRenderer.invoke(
      'show-open-dialog',
      {
        title: 'PDF auswählen',
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        properties: ['openFile'],
      },
    )
    if (!result.canceled && result.filePaths?.length) {
      this.inputPath = result.filePaths[0]
      this.outputFiles = []
      this.error = ''
    }
  }

  private async pickOutputDir() {
    const result = await (window as any).electron.ipcRenderer.invoke(
      'show-open-dialog',
      {
        title: 'Ausgabeordner wählen',
        properties: ['openDirectory', 'createDirectory'],
      },
    )
    if (!result.canceled && result.filePaths?.length) {
      this.outputDir = result.filePaths[0]
      this.outputFiles = []
      this.error = ''
    }
  }

  private async split() {
    if (!this.inputPath || !this.outputDir) return

    this.loading = true
    this.error = ''
    this.outputFiles = []
    this.totalPages = 0

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'pdf-split',
        {
          inputPath: this.inputPath,
          outputDir: this.outputDir,
        },
      )

      const result = response.data || response
      if (!result?.success) {
        this.error = result?.error || 'Fehler beim Aufteilen der PDF'
      } else {
        this.totalPages = result.totalPages ?? 0
        this.outputFiles = result.outputFiles ?? []
      }
    } catch (err: any) {
      this.error = err?.message || 'Unbekannter Fehler'
    } finally {
      this.loading = false
    }
  }

  render() {
    const canSplit = !!this.inputPath && !!this.outputDir && !this.loading

    return html`
      <div class="container">
        <div class="panel">
          <div class="title">📄 PDF Splitter</div>
        </div>

        <div class="panel inputs">
          <div class="form-group">
            <label>PDF-Datei</label>
            <div class="path-row">
              <div class="path-display ${this.inputPath ? '' : 'empty'}">
                ${this.inputPath || 'Keine Datei ausgewählt'}
              </div>
              <button @click=${this.pickPdf} ?disabled=${this.loading}>
                Auswählen…
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>Ausgabeordner</label>
            <div class="path-row">
              <div class="path-display ${this.outputDir ? '' : 'empty'}">
                ${this.outputDir || 'Kein Ordner ausgewählt'}
              </div>
              <button @click=${this.pickOutputDir} ?disabled=${this.loading}>
                Auswählen…
              </button>
            </div>
          </div>

          <div class="actions">
            <button class="primary" ?disabled=${!canSplit} @click=${this.split}>
              ${this.loading
                ? html`<span class="spinner"></span>Wird aufgeteilt…`
                : 'PDF aufteilen'}
            </button>
          </div>

          ${this.error
            ? html`<div class="status error">${this.error}</div>`
            : this.outputFiles.length
              ? html`<div class="status success">
                  ✓ ${this.totalPages} Seite${this.totalPages !== 1 ? 'n' : ''}
                  erfolgreich aufgeteilt
                </div>`
              : ''}
        </div>

        ${this.outputFiles.length
          ? html`
              <div class="panel results">
                <div class="results-header">
                  Erzeugte Dateien (${this.outputFiles.length})
                </div>
                <div class="file-list">
                  ${this.outputFiles.map(
                    (f) => html`<div class="file-item">${f}</div>`,
                  )}
                </div>
              </div>
            `
          : ''}
      </div>
    `
  }
}
