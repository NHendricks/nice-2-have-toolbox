import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url,
).href

// Helper function: "1-3,5,7-9" => [1,2,3,5,7,8,9]
function parsePageInput(input: string, max: number): number[] {
  if (!input) return []
  let out: number[] = []
  for (const part of input.split(/[,;\s]+/)) {
    if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10)
      if (n >= 1 && n <= max) out.push(n)
    } else if (/^(\d+)-(\d+)$/.test(part)) {
      const [, a, b] = part.match(/(\d+)-(\d+)/) || []
      let from = parseInt(a, 10),
        to = parseInt(b, 10)
      if (from > to) [from, to] = [to, from]
      for (let i = from; i <= to; ++i) if (i >= 1 && i <= max) out.push(i)
    }
  }
  return Array.from(new Set(out)).sort((a, b) => a - b)
}

@customElement('nh-pdf-splitter')
export class PdfSplitter extends LitElement {
  @state() private inputPath = ''
  @state() private outputDir = ''
  @state() private loading = false
  @state() private error = ''
  @state() private outputFiles: string[] = []
  @state() private totalPages = 0
  @state() private previews: string[] = []
  @state() private pageInput = ''
  @state() private selectedPages: number[] = []

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

    .preview-slider {
      display: flex;
      flex-direction: row;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.5rem 0.2rem 0.5rem 0.2rem;
      background: rgba(30, 40, 60, 0.18);
      border-radius: 8px;
      min-height: 190px;
      align-items: flex-end;
      scroll-behavior: smooth;
    }

    .preview-thumb {
      border: 2.5px solid transparent;
      border-radius: 6px;
      background: #fff;
      box-shadow: 0 2px 8px #0002;
      cursor: pointer;
      transition:
        border 0.15s,
        box-shadow 0.15s;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .preview-thumb.selected {
      border: 2.5px solid #3b82f6;
      box-shadow: 0 2px 12px #3b82f655;
    }

    .preview-thumb .page-num {
      position: absolute;
      bottom: 6px;
      right: 10px;
      background: #1e293b;
      color: #fff;
      font-size: 0.85em;
      border-radius: 4px;
      padding: 0.1em 0.5em;
      opacity: 0.8;
    }

    .page-select-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      margin: 0.5rem 0 0.2rem 0;
    }

    .page-input {
      font-size: 1.1em;
      padding: 0.3em 0.7em;
      border-radius: 6px;
      border: 1.5px solid #64748b;
      background: #0f172a;
      color: #e0e7ef;
      width: 180px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .page-input:focus {
      outline: 2px solid #3b82f6;
      border-color: #3b82f6;
    }
  `

  private async updatePreviews() {
    this.previews = []
    this.totalPages = 0
    this.pageInput = ''
    this.selectedPages = []
    this.error = ''
    if (!this.inputPath) return

    try {
      const buffer: Buffer = await (window as any).electron.ipcRenderer.invoke(
        'read-file-buffer',
        this.inputPath,
      )
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) })
        .promise
      this.totalPages = pdf.numPages
      this.pageInput = `1-${this.totalPages}`
      this.updateSelectedPages()

      const previews: string[] = []
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 0.4 })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport })
          .promise
        previews.push(canvas.toDataURL('image/jpeg', 0.85))
        this.previews = [...previews] // reaktiv aktualisieren während Seiten laden
      }
    } catch (err: any) {
      this.error = err?.message || 'Fehler beim Laden der Vorschau'
    }
  }

  private updateSelectedPages() {
    this.selectedPages = parsePageInput(this.pageInput, this.totalPages)
    // Scroll to first selected page
    setTimeout(() => {
      const idx = this.selectedPages[0]
      if (typeof idx === 'number') {
        const el = this.renderRoot.querySelector(
          `.preview-thumb[data-page='${idx}']`,
        )
        if (el)
          (el as HTMLElement).scrollIntoView({
            behavior: 'smooth',
            inline: 'center',
            block: 'nearest',
          })
      }
    }, 120)
  }

  private onPageInput(e: Event) {
    this.pageInput = (e.target as HTMLInputElement).value
    this.updateSelectedPages()
  }

  private onThumbClick(idx: number) {
    // Toggle page in selection
    let sel = new Set(this.selectedPages)
    if (sel.has(idx)) sel.delete(idx)
    else sel.add(idx)
    this.pageInput = Array.from(sel)
      .sort((a, b) => a - b)
      .join(',')
    this.updateSelectedPages()
  }

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
      await this.updatePreviews()
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
    if (!this.inputPath || !this.outputDir || this.selectedPages.length === 0)
      return

    this.loading = true
    this.error = ''
    this.outputFiles = []

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'pdf-split',
        {
          inputPath: this.inputPath,
          outputDir: this.outputDir,
          pages: this.pageInput,
        },
      )

      const result = response.data || response
      if (!result?.success) {
        this.error = result?.error || 'Fehler beim Speichern der Seiten'
      } else {
        this.outputFiles = result.outputFiles ?? []
      }
    } catch (err: any) {
      this.error = err?.message || 'Unbekannter Fehler'
    } finally {
      this.loading = false
    }
  }

  render() {
    const canSplit =
      !!this.inputPath &&
      !!this.outputDir &&
      !this.loading &&
      this.selectedPages.length > 0

    return html`
      <div class="container">
        <div class="panel">
          <div class="title">📄 PDF Seiten extrahieren</div>
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
                ? html`<span class="spinner"></span>Wird gespeichert…`
                : `${this.selectedPages.length} Seite${this.selectedPages.length !== 1 ? 'n' : ''} als PDF speichern`}
            </button>
          </div>

          ${this.error
            ? html`<div class="status error">${this.error}</div>`
            : this.outputFiles.length
              ? html`<div class="status success">
                  ✓ Gespeichert: ${this.outputFiles[0]}
                </div>`
              : ''}
        </div>

        ${this.previews.length
          ? html`
              <div class="panel">
                <div class="page-select-row">
                  <label for="page-input">Seiten (z.B. 1-5,7,9-10):</label>
                  <input
                    id="page-input"
                    class="page-input"
                    .value=${this.pageInput}
                    @input=${this.onPageInput}
                    placeholder="1-3,5,7-9"
                  />
                </div>
                <div class="preview-slider">
                  ${this.previews.map(
                    (src, i) => html`
                      <div
                        class="preview-thumb${this.selectedPages.includes(i + 1)
                          ? ' selected'
                          : ''}"
                        data-page="${i + 1}"
                        @click=${() => this.onThumbClick(i + 1)}
                      >
                        <img
                          src="${src}"
                          style="display:block;max-height:170px;width:auto;"
                        />
                        <span class="page-num">${i + 1}</span>
                      </div>
                    `,
                  )}
                </div>
              </div>
            `
          : ''}
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
