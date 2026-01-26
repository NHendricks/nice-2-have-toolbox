import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import './SimpleDialog'

export class FileCompare extends LitElement {
  static styles = css`
    .root {
      display: flex;
      flex-direction: column;
      height: 70vh;
      background: #0f172a;
    }

    .toolbar {
      display: flex;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      align-items: center;
    }

    .btn {
      padding: 0.4rem 0.8rem;
      background: #475569;
      border: none;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      font-weight: bold;
    }

    .btn.active {
      background: #0ea5e9;
    }

    .btn:disabled {
      opacity: 0.4;
      cursor: default;
    }

    .compare-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      flex: 1;
      overflow: hidden;
    }

    .file {
      overflow: auto;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .line {
      display: block;
    }

    .line.modified {
      background: rgba(251, 191, 36, 0.15);
      color: #fbbf24;
    }

    .num {
      display: inline-block;
      width: 42px;
      color: #64748b;
      text-align: right;
      padding-right: 1rem;
      user-select: none;
    }

    .unified {
      padding: 1rem;
      overflow: auto;
      font-family: 'Courier New', monospace;
      white-space: pre;
    }

    .add {
      color: #10b981;
    }
    .del {
      color: #ef4444;
    }
    .hdr {
      color: #0ea5e9;
      font-weight: bold;
    }
  `

  /* ---------- Inputs ---------- */

  @property() leftPath = ''
  @property() rightPath = ''

  /* ---------- State ---------- */

  @property() leftContent = ''
  @property() rightContent = ''

  @property({ type: Boolean }) loading = false
  @property() error = ''

  @property({ type: String })
  viewMode: 'side' | 'unified' = 'side'

  @property({ type: Boolean })
  showOnlyDiffs = false

  private diffLines: number[] = []
  private currentDiff = 0

  /* ---------- Lifecycle ---------- */

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.onKeyDown)
    this.loadFiles()
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.onKeyDown)
    super.disconnectedCallback()
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('leftContent') || changed.has('rightContent')) {
      this.computeDiffs()
      this.currentDiff = 0
    }
  }

  /* ---------- File loading ---------- */

  async loadFiles() {
    if (!this.leftPath || !this.rightPath) return

    this.loading = true
    this.error = ''

    try {
      const left = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'read', filePath: this.leftPath },
      )

      const right = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'read', filePath: this.rightPath },
      )

      if (left.success && right.success) {
        this.leftContent = left.data.content
        this.rightContent = right.data.content
      } else {
        this.error = left.error || right.error || 'Fehler beim Laden'
      }
    } catch (e: any) {
      this.error = e.message ?? 'Unbekannter Fehler'
    } finally {
      this.loading = false
    }
  }

  /* ---------- Diff logic ---------- */

  computeDiffs() {
    const l = this.leftContent.split('\n')
    const r = this.rightContent.split('\n')

    this.diffLines = []
    const max = Math.max(l.length, r.length)

    for (let i = 0; i < max; i++) {
      if ((l[i] ?? '') !== (r[i] ?? '')) {
        this.diffLines.push(i + 1)
      }
    }
  }

  scrollToDiff(index: number) {
    if (this.viewMode !== 'side') return

    const line = this.diffLines[index]
    if (!line) return

    this.renderRoot
      .querySelectorAll(`[data-line="${line}"]`)
      .forEach((el) =>
        el.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      )

    this.currentDiff = index
  }

  nextDiff() {
    if (this.currentDiff < this.diffLines.length - 1) {
      this.scrollToDiff(this.currentDiff + 1)
    }
  }

  prevDiff() {
    if (this.currentDiff > 0) {
      this.scrollToDiff(this.currentDiff - 1)
    }
  }

  /* ---------- Keyboard ---------- */

  onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') this.close()
    if (e.key === 'n' || e.key === 'ArrowDown') this.nextDiff()
    if (e.key === 'p' || e.key === 'ArrowUp') this.prevDiff()
    if (e.key === 'd') this.showOnlyDiffs = !this.showOnlyDiffs
    if (e.key === 'u') this.viewMode = 'unified'
    if (e.key === 's') this.viewMode = 'side'
  }

  close() {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    )
  }

  /* ---------- Render helpers ---------- */

  renderSide() {
    const l = this.leftContent.split('\n')
    const r = this.rightContent.split('\n')
    const max = Math.max(l.length, r.length)

    const rows = Array.from({ length: max }, (_, i) => ({
      i,
      left: l[i] ?? '',
      right: r[i] ?? '',
      changed: (l[i] ?? '') !== (r[i] ?? ''),
    }))

    const visible = this.showOnlyDiffs ? rows.filter((r) => r.changed) : rows

    return html`
      <div class="compare-body">
        <div class="file">
          ${visible.map(
            (row) => html`
              <span
                class="line ${row.changed ? 'modified' : ''}"
                data-line=${row.i + 1}
              >
                <span class="num">${row.i + 1}</span>${row.left || ' '}
              </span>
            `,
          )}
        </div>
        <div class="file">
          ${visible.map(
            (row) => html`
              <span
                class="line ${row.changed ? 'modified' : ''}"
                data-line=${row.i + 1}
              >
                <span class="num">${row.i + 1}</span>${row.right || ' '}
              </span>
            `,
          )}
        </div>
      </div>
    `
  }

  renderUnified() {
    const l = this.leftContent.split('\n')
    const r = this.rightContent.split('\n')
    const max = Math.max(l.length, r.length)

    return html`
      <div class="unified">
        <div class="hdr">--- ${this.leftPath}</div>
        <div class="hdr">+++ ${this.rightPath}</div>
        ${Array.from({ length: max }, (_, i) => {
          if ((l[i] ?? '') !== (r[i] ?? '')) {
            return html`
              ${l[i] ? html`<div class="del">-${l[i]}</div>` : ''}
              ${r[i] ? html`<div class="add">+${r[i]}</div>` : ''}
            `
          }
          return this.showOnlyDiffs ? null : html`<div>${l[i] ?? ''}</div>`
        })}
      </div>
    `
  }

  /* ---------- Render ---------- */

  render() {
    return html`
      <simple-dialog .open=${true} title="📊 Dateivergleich" width="95%">
        <div class="root">
          <div class="toolbar">
            <button
              class="btn ${this.viewMode === 'side' ? 'active' : ''}"
              @click=${() => (this.viewMode = 'side')}
            >
              Side
            </button>

            <button
              class="btn ${this.viewMode === 'unified' ? 'active' : ''}"
              @click=${() => (this.viewMode = 'unified')}
            >
              Unified
            </button>

            <button
              class="btn ${this.showOnlyDiffs ? 'active' : ''}"
              @click=${() => (this.showOnlyDiffs = !this.showOnlyDiffs)}
            >
              Nur Diffs
            </button>

            <button
              class="btn"
              ?disabled=${this.viewMode !== 'side' || this.currentDiff === 0}
              @click=${this.prevDiff}
            >
              ⬆
            </button>

            <button
              class="btn"
              ?disabled=${this.viewMode !== 'side' ||
              this.currentDiff >= this.diffLines.length - 1}
              @click=${this.nextDiff}
            >
              ⬇
            </button>

            <span style="color:#94a3b8">
              ${this.diffLines.length
                ? `${this.currentDiff + 1}/${this.diffLines.length}`
                : 'keine Diffs'}
            </span>
          </div>

          ${this.loading
            ? html`<div style="padding:2rem;color:#0ea5e9">Lade…</div>`
            : this.error
              ? html`<div style="padding:2rem;color:#ef4444">
                  ${this.error}
                </div>`
              : this.viewMode === 'side'
                ? this.renderSide()
                : this.renderUnified()}
        </div>

        <div slot="footer">
          <button class="btn" @click=${this.close}>Schließen (Esc)</button>
        </div>
      </simple-dialog>
    `
  }
}

customElements.define('file-compare', FileCompare)
