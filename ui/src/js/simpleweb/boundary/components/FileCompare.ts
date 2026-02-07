import { diffLines, diffWords, type ChangeObject } from 'diff'
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
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
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
      font-family: 'JetBrains Mono', monospace;
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

    .inline-add {
      background-color: rgba(16, 185, 129, 0.2);
    }

    .inline-del {
      background-color: rgba(239, 68, 68, 0.2);
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
  private lineDiffMap: { left: string; right: string; changed: boolean }[] = []
  private isSyncing = false

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
        this.error = left.error || right.error || 'Error loading'
      }
    } catch (e: any) {
      this.error = e.message ?? 'Unknown error'
    } finally {
      this.loading = false
    }
  }

  /* ---------- Diff logic ---------- */
  computeDiffs() {
    const l = this.leftContent
    const r = this.rightContent

    const changes: ChangeObject<string>[] = diffLines(l, r)

    this.diffLines = []
    this.lineDiffMap = []

    let lineNum = 1
    let i = 0
    while (i < changes.length) {
      const change = changes[i]
      const lines = change.value.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()

      if (change.removed) {
        // Check if next change is 'added' (modification pair)
        const next = changes[i + 1]
        if (next?.added) {
          const addedLines = next.value.split('\n')
          if (addedLines[addedLines.length - 1] === '') addedLines.pop()

          // Pair removed and added lines together
          const maxLen = Math.max(lines.length, addedLines.length)
          for (let j = 0; j < maxLen; j++) {
            this.lineDiffMap.push({
              left: lines[j] ?? '',
              right: addedLines[j] ?? '',
              changed: true,
            })
            this.diffLines.push(lineNum)
            lineNum++
          }
          i += 2 // Skip both removed and added
          continue
        } else {
          // Only removed (deleted lines)
          lines.forEach((line) => {
            this.lineDiffMap.push({ left: line, right: '', changed: true })
            this.diffLines.push(lineNum)
            lineNum++
          })
        }
      } else if (change.added) {
        // Only added (new lines, not paired with removed)
        lines.forEach((line) => {
          this.lineDiffMap.push({ left: '', right: line, changed: true })
          this.diffLines.push(lineNum)
          lineNum++
        })
      } else {
        // Unchanged lines
        lines.forEach((line) => {
          this.lineDiffMap.push({ left: line, right: line, changed: false })
        })
        lineNum += lines.length
      }
      i++
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

  /* ---------- Synchronized scrolling ---------- */
  private syncScroll = (e: Event) => {
    if (this.isSyncing) return

    const source = e.target as HTMLElement
    const panes = this.renderRoot.querySelectorAll('.file')
    if (panes.length !== 2) return

    this.isSyncing = true
    panes.forEach((pane) => {
      if (pane !== source) {
        ;(pane as HTMLElement).scrollTop = source.scrollTop
        ;(pane as HTMLElement).scrollLeft = source.scrollLeft
      }
    })
    this.isSyncing = false
  }

  /* ---------- Render helpers ---------- */
  renderSide() {
    const visible = this.showOnlyDiffs
      ? this.lineDiffMap.filter((r) => r.changed)
      : this.lineDiffMap

    return html`
      <div class="compare-body">
        <div class="file" @scroll=${this.syncScroll}>
          ${visible.map(
            (row, i) => html`
              <span
                class="line ${row.changed ? 'modified' : ''}"
                data-line=${i + 1}
              >
                <span class="num">${i + 1}</span>${this.renderInlineDiff(
                  row.left,
                  row.right,
                  'left',
                )}
              </span>
            `,
          )}
        </div>
        <div class="file" @scroll=${this.syncScroll}>
          ${visible.map(
            (row, i) => html`
              <span
                class="line ${row.changed ? 'modified' : ''}"
                data-line=${i + 1}
              >
                <span class="num">${i + 1}</span>${this.renderInlineDiff(
                  row.left,
                  row.right,
                  'right',
                )}
              </span>
            `,
          )}
        </div>
      </div>
    `
  }

  renderInlineDiff(left: string, right: string, side: 'left' | 'right') {
    if (!left && !right) return html``
    if (left === right) return html`${left}`

    // Handle cases where one side is empty
    if (side === 'left') {
      if (!left) return html`` // Left is empty, show nothing on left side
      if (!right)
        return html`<span class="inline-del">${left}</span>` // Entire line deleted
    } else {
      if (!right) return html`` // Right is empty, show nothing on right side
      if (!left)
        return html`<span class="inline-add">${right}</span>` // Entire line added
    }

    // Both sides have content - show word-level diff
    const diffs = diffWords(left, right)

    if (side === 'left') {
      // Left pane: show removed (red) + unchanged, skip added
      return html`${diffs.map((part) =>
        part.added
          ? html`` // Don't show added content on left side
          : part.removed
            ? html`<span class="inline-del">${part.value}</span>`
            : html`${part.value}`,
      )}`
    } else {
      // Right pane: show added (green) + unchanged, skip removed
      return html`${diffs.map((part) =>
        part.removed
          ? html`` // Don't show removed content on right side
          : part.added
            ? html`<span class="inline-add">${part.value}</span>`
            : html`${part.value}`,
      )}`
    }
  }

  renderUnified() {
    const changes: ChangeObject<string>[] = diffLines(
      this.leftContent,
      this.rightContent,
    )

    return html`
      <div class="unified">
        <div class="hdr">--- ${this.leftPath}</div>
        <div class="hdr">+++ ${this.rightPath}</div>
        ${changes.map((change) => {
          const lines = change.value.split('\n')
          if (lines[lines.length - 1] === '') lines.pop()

          return lines.map((line) => {
            if (change.added) return html`<div class="add">+${line}</div>`
            if (change.removed) return html`<div class="del">-${line}</div>`
            if (this.showOnlyDiffs) return null
            return html`<div>${line}</div>`
          })
        })}
      </div>
    `
  }

  /* ---------- Render ---------- */
  render() {
    return html`
      <simple-dialog .open=${true} title="📊 file comparison" width="95%">
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
              Diffs Only
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
                : 'no diffs'}
            </span>
          </div>

          ${this.loading
            ? html`<div style="padding:2rem;color:#0ea5e9">Loading…</div>`
            : this.error
              ? html`<div style="padding:2rem;color:#ef4444">
                  ${this.error}
                </div>`
              : this.viewMode === 'side'
                ? this.renderSide()
                : this.renderUnified()}
        </div>

        <div slot="footer">
          <button class="btn" @click=${this.close}>Close (Esc)</button>
        </div>
      </simple-dialog>
    `
  }
}

customElements.define('file-compare', FileCompare)
