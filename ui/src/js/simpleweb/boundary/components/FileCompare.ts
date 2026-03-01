import { diffLines, type ChangeObject } from 'diff'
import { LitElement, css, html } from 'lit'
import { property, state } from 'lit/decorators.js'
import { live } from 'lit/directives/live.js'
import './SimpleDialog'

interface DiffBlock {
  start: number
  end: number
}

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
      flex-wrap: wrap;
    }

    .toolbar-sep {
      width: 1px;
      height: 1.2rem;
      background: #334155;
      flex-shrink: 0;
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
      white-space: nowrap;
    }

    .btn.active {
      background: #0ea5e9;
    }
    .btn.save {
      background: #059669;
    }
    .btn.edit {
      background: #7c3aed;
    }
    .btn:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    /* ── Side view ── */
    .side-view {
      display: grid;
      grid-template-columns: 1fr 26px 1fr;
      flex: 1;
      overflow: hidden;
    }

    .pane {
      display: flex;
      overflow: hidden;
      min-width: 0;
    }

    /* Gutter: line numbers with diff coloring */
    .gutter {
      width: 46px;
      flex-shrink: 0;
      overflow-y: scroll;
      scrollbar-width: none;
      background: #0c1525;
      border-right: 1px solid #1e293b;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      padding-top: 0.5rem;
      color: #475569;
      text-align: right;
      user-select: none;
    }
    .gutter::-webkit-scrollbar {
      display: none;
    }

    .gutter-line {
      display: block;
      padding: 0 5px;
      line-height: 1.5;
      font-size: 0.85rem;
    }
    .gutter-line.diff {
      background: rgba(251, 191, 36, 0.18);
      color: #ca8a04;
    }
    .gutter-line.current {
      background: #0ea5e9;
      color: #fff;
      font-weight: bold;
    }

    /* Textarea fills remaining pane width */
    .pane-ta[readonly] {
      background: #080f1e;
      cursor: default;
    }

    .pane-ta {
      flex: 1;
      min-width: 0;
      background: #0f172a;
      color: #e2e8f0;
      border: none;
      padding: 0.5rem 0.75rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
      line-height: 1.5;
      resize: none;
      outline: none;
      overflow: auto;
      white-space: pre;
      word-wrap: normal;
      overflow-wrap: normal;
      tab-size: 2;
      box-sizing: border-box;
    }

    /* Copy column between panes */
    .copy-col {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      padding-top: 0.5rem;
      gap: 0.2rem;
      background: #1e293b;
      border-left: 1px solid #334155;
      border-right: 1px solid #334155;
    }

    .arrow-btn {
      width: 20px;
      height: 20px;
      padding: 0;
      background: #334155;
      border: none;
      color: #94a3b8;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.7rem;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .arrow-btn:hover:not(:disabled) {
      background: #0ea5e9;
      color: #fff;
    }
    .arrow-btn:disabled {
      opacity: 0.3;
      cursor: default;
    }

    /* ── Unified view ── */
    .unified {
      padding: 1rem;
      overflow: auto;
      flex: 1;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.85rem;
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

  /* ── Props ── */
  @property() leftPath = ''
  @property() rightPath = ''
  @property() leftContent = ''
  @property() rightContent = ''
  @property({ type: Boolean }) loading = false
  @property() error = ''
  @property({ type: String }) viewMode: 'side' | 'unified' = 'side'

  /* ── State ── */
  @state() private diffBlocks: DiffBlock[] = []
  @state() private leftChangedLines = new Set<number>()
  @state() private rightChangedLines = new Set<number>()
  @state() private isBinary = false
  @state() private leftDirty = false
  @state() private rightDirty = false
  @state() private saving = false
  @state() private editMode = false

  private currentDiff = 0
  private isSyncing = false
  private diffTimer: ReturnType<typeof setTimeout> | null = null

  /* lineDiffMap: one row per "virtual" diff line (may have phantoms) */
  private lineDiffMap: { left: string; right: string; changed: boolean }[] = []
  /* map from file-line-index → lineDiffMap row */
  private leftLineToMapRow: number[] = []
  private rightLineToMapRow: number[] = []

  /* ── Lifecycle ── */
  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.onKeyDown)
  }
  disconnectedCallback() {
    window.removeEventListener('keydown', this.onKeyDown)
    super.disconnectedCallback()
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('leftPath') || changed.has('rightPath')) {
      if (this.leftPath && this.rightPath) this.loadFiles()
    }
    /* User typing → debounce diff recompute to avoid lag */
    if (changed.has('leftContent') || changed.has('rightContent')) {
      this.scheduleDiff()
    }
  }

  /* ── File I/O ── */
  async loadFiles() {
    this.loading = true
    this.error = ''
    this.leftDirty = false
    this.rightDirty = false
    try {
      const [left, right] = await Promise.all([
        (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          { operation: 'read', filePath: this.leftPath },
        ),
        (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          { operation: 'read', filePath: this.rightPath },
        ),
      ])
      if (left.success && right.success) {
        this.isBinary =
          left.data.isImage ||
          right.data.isImage ||
          this.containsNullBytes(left.data.content) ||
          this.containsNullBytes(right.data.content)
        this.leftContent = left.data.content
        this.rightContent = right.data.content
        this.currentDiff = 0
        this.computeDiffs() // immediate on load
      } else {
        this.error = left.error || right.error || 'Error loading'
      }
    } catch (e: any) {
      this.error = e.message ?? 'Unknown error'
    } finally {
      this.loading = false
    }
  }

  private scheduleDiff() {
    if (this.diffTimer) clearTimeout(this.diffTimer)
    this.diffTimer = setTimeout(() => {
      this.computeDiffs()
    }, 350)
  }

  async saveFile(side: 'left' | 'right') {
    const path = side === 'left' ? this.leftPath : this.rightPath
    const content = side === 'left' ? this.leftContent : this.rightContent
    this.saving = true
    try {
      const res = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'write', filePath: path, content },
      )
      if (res.success) {
        if (side === 'left') this.leftDirty = false
        else this.rightDirty = false
      } else {
        alert('Save failed: ' + (res.error || 'Unknown error'))
      }
    } catch (e: any) {
      alert('Save failed: ' + e.message)
    } finally {
      this.saving = false
    }
  }

  /* ── Diff computation ── */
  private computeDiffs() {
    if (this.isBinary) {
      this.diffBlocks = []
      return
    }

    const changes: ChangeObject<string>[] = diffLines(
      this.leftContent,
      this.rightContent,
    )
    this.lineDiffMap = []

    let i = 0
    while (i < changes.length) {
      const change = changes[i]
      const lines = change.value.split('\n')
      if (lines[lines.length - 1] === '') lines.pop()

      if (change.removed) {
        const next = changes[i + 1]
        if (next?.added) {
          const addedLines = next.value.split('\n')
          if (addedLines[addedLines.length - 1] === '') addedLines.pop()
          const maxLen = Math.max(lines.length, addedLines.length)
          for (let j = 0; j < maxLen; j++) {
            this.lineDiffMap.push({
              left: lines[j] ?? '',
              right: addedLines[j] ?? '',
              changed: true,
            })
          }
          i += 2
          continue
        } else {
          lines.forEach((l) =>
            this.lineDiffMap.push({ left: l, right: '', changed: true }),
          )
        }
      } else if (change.added) {
        lines.forEach((l) =>
          this.lineDiffMap.push({ left: '', right: l, changed: true }),
        )
      } else {
        lines.forEach((l) =>
          this.lineDiffMap.push({ left: l, right: l, changed: false }),
        )
      }
      i++
    }

    /* Build diff blocks (contiguous changed rows) */
    const blocks: DiffBlock[] = []
    let r = 0
    while (r < this.lineDiffMap.length) {
      if (this.lineDiffMap[r].changed) {
        let end = r
        while (
          end + 1 < this.lineDiffMap.length &&
          this.lineDiffMap[end + 1].changed
        )
          end++
        blocks.push({ start: r, end })
        r = end + 1
      } else {
        r++
      }
    }
    this.diffBlocks = blocks

    /* Build file-line → map-row mappings and changed-line sets */
    const lMap: number[] = [],
      rMap: number[] = []
    const lChanged = new Set<number>(),
      rChanged = new Set<number>()

    for (let row = 0; row < this.lineDiffMap.length; row++) {
      const entry = this.lineDiffMap[row]
      if (!entry.changed) {
        lMap.push(row)
        rMap.push(row)
      } else {
        if (entry.left !== '') {
          lChanged.add(lMap.length)
          lMap.push(row)
        }
        if (entry.right !== '') {
          rChanged.add(rMap.length)
          rMap.push(row)
        }
      }
    }

    this.leftLineToMapRow = lMap
    this.rightLineToMapRow = rMap
    this.leftChangedLines = lChanged
    this.rightChangedLines = rChanged
  }

  /* ── Copy diff block ── */
  private currentBlock(): DiffBlock | null {
    return this.diffBlocks[this.currentDiff] ?? null
  }

  private linesInBlock(lineToMap: number[], block: DiffBlock): Set<number> {
    const s = new Set<number>()
    lineToMap.forEach((row, i) => {
      if (row >= block.start && row <= block.end) s.add(i)
    })
    return s
  }

  private reconstructSide(
    map: { left: string; right: string; changed: boolean }[],
    side: 'left' | 'right',
  ): string {
    const lines: string[] = []
    for (const row of map) {
      const v = row[side]
      if (!row.changed || v !== '') lines.push(v)
    }
    return lines.join('\n')
  }

  private copyLeftToRight() {
    const block = this.currentBlock()
    if (!block) return
    const newMap = this.lineDiffMap.map((row, i) =>
      i >= block.start && i <= block.end ? { ...row, right: row.left } : row,
    )
    this.rightContent = this.reconstructSide(newMap, 'right')
    this.rightDirty = true
  }

  private copyRightToLeft() {
    const block = this.currentBlock()
    if (!block) return
    const newMap = this.lineDiffMap.map((row, i) =>
      i >= block.start && i <= block.end ? { ...row, left: row.right } : row,
    )
    this.leftContent = this.reconstructSide(newMap, 'left')
    this.leftDirty = true
  }

  /* ── Navigation ── */
  nextDiff() {
    if (this.currentDiff < this.diffBlocks.length - 1)
      this.scrollToDiff(this.currentDiff + 1)
  }
  prevDiff() {
    if (this.currentDiff > 0) this.scrollToDiff(this.currentDiff - 1)
  }

  scrollToDiff(index: number) {
    this.currentDiff = index
    this.requestUpdate()
    this.updateComplete.then(() => {
      const block = this.diffBlocks[index]
      if (!block) return

      const firstLeft = this.leftLineToMapRow.findIndex(
        (r) => r >= block.start && r <= block.end,
      )
      const firstRight = this.rightLineToMapRow.findIndex(
        (r) => r >= block.start && r <= block.end,
      )
      const lineH = this.getLineHeight()
      const lScroll =
        firstLeft >= 0 ? Math.max(0, (firstLeft - 2) * lineH) : null
      const rScroll =
        firstRight >= 0 ? Math.max(0, (firstRight - 2) * lineH) : null

      this.isSyncing = true
      const lTA = this.renderRoot.querySelector(
        '.pane-ta[data-side="left"]',
      ) as HTMLElement
      const rTA = this.renderRoot.querySelector(
        '.pane-ta[data-side="right"]',
      ) as HTMLElement
      const lG = this.renderRoot.querySelector(
        '.gutter[data-side="left"]',
      ) as HTMLElement
      const rG = this.renderRoot.querySelector(
        '.gutter[data-side="right"]',
      ) as HTMLElement
      if (lTA && lScroll !== null) lTA.scrollTop = lScroll
      if (rTA && rScroll !== null) rTA.scrollTop = rScroll
      if (lG && lScroll !== null) lG.scrollTop = lScroll
      if (rG && rScroll !== null) rG.scrollTop = rScroll
      requestAnimationFrame(() => {
        this.isSyncing = false
      })
    })
  }

  private getLineHeight(): number {
    const el = this.renderRoot.querySelector('.gutter-line')
    return el ? (el as HTMLElement).getBoundingClientRect().height : 21
  }

  /* ── Scroll sync ── */
  private onPaneScroll = (e: Event, side: 'left' | 'right') => {
    if (this.isSyncing) return
    this.isSyncing = true
    const ta = e.target as HTMLElement
    const st = ta.scrollTop
    const other = side === 'left' ? 'right' : 'left'
    const gutter = this.renderRoot.querySelector(
      `.gutter[data-side="${side}"]`,
    ) as HTMLElement
    const otherTA = this.renderRoot.querySelector(
      `.pane-ta[data-side="${other}"]`,
    ) as HTMLElement
    const otherGut = this.renderRoot.querySelector(
      `.gutter[data-side="${other}"]`,
    ) as HTMLElement
    if (gutter) gutter.scrollTop = st
    if (otherTA) otherTA.scrollTop = st
    if (otherGut) otherGut.scrollTop = st
    requestAnimationFrame(() => {
      this.isSyncing = false
    })
  }

  /* ── Keyboard ── */
  onKeyDown = (e: KeyboardEvent) => {
    const isTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA'
    // Allow left/right arrow copy in edit mode even in textarea
    if (this.editMode && e.key === 'ArrowRight') {
      e.preventDefault()
      this.copyLeftToRight()
      return
    }
    if (this.editMode && e.key === 'ArrowLeft') {
      e.preventDefault()
      this.copyRightToLeft()
      return
    }
    if (isTextarea) return
    if (e.key === 'Escape') this.close()
    if (e.key === 'n' || e.key === 'ArrowDown') {
      e.preventDefault()
      this.nextDiff()
    }
    if (e.key === 'p' || e.key === 'ArrowUp') {
      e.preventDefault()
      this.prevDiff()
    }
    if (e.key === 'u') this.viewMode = 'unified'
    if (e.key === 's') this.viewMode = 'side'
    if (e.key === 'e') {
      e.preventDefault()
      e.stopPropagation()
      this.editMode = !this.editMode
    }
  }

  close() {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    )
  }

  /* ── Helpers ── */
  containsNullBytes(content: string): boolean {
    return content.substring(0, 8192).includes('\0')
  }

  /* ── Render: gutter ── */
  private renderGutter(side: 'left' | 'right') {
    const content = side === 'left' ? this.leftContent : this.rightContent
    const changed =
      side === 'left' ? this.leftChangedLines : this.rightChangedLines
    const block = this.currentBlock()
    const lineToMap =
      side === 'left' ? this.leftLineToMapRow : this.rightLineToMapRow
    const currentSet = block
      ? this.linesInBlock(lineToMap, block)
      : new Set<number>()
    const lineCount = content ? content.split('\n').length : 0

    return html`
      <div class="gutter" data-side="${side}">
        ${Array.from(
          { length: lineCount },
          (_, i) => html`
            <div
              class="gutter-line ${changed.has(i)
                ? 'diff'
                : ''} ${currentSet.has(i) ? 'current' : ''}"
            >
              ${i + 1}
            </div>
          `,
        )}
      </div>
    `
  }

  /* ── Render: side view ── */
  private renderSide() {
    const hasDiff = this.diffBlocks.length > 0

    return html`
      <div class="side-view">
        <div class="pane">
          ${this.renderGutter('left')}
          <textarea
            class="pane-ta"
            data-side="left"
            .value=${live(this.leftContent)}
            ?readonly=${!this.editMode}
            @input=${(e: Event) => {
              this.leftContent = (e.target as HTMLTextAreaElement).value
              this.leftDirty = true
            }}
            @scroll=${(e: Event) => this.onPaneScroll(e, 'left')}
            @keydown=${this.onKeyDown}
            spellcheck="false"
          ></textarea>
        </div>

        <div class="copy-col">
          <button
            class="arrow-btn"
            title="Copy current diff left → right (L→R)"
            ?disabled=${!hasDiff}
            @click=${this.copyLeftToRight}
          >
            →
          </button>
          <button
            class="arrow-btn"
            title="Copy current diff right → left (R→L)"
            ?disabled=${!hasDiff}
            @click=${this.copyRightToLeft}
          >
            ←
          </button>
        </div>

        <div class="pane">
          ${this.renderGutter('right')}
          <textarea
            class="pane-ta"
            data-side="right"
            .value=${live(this.rightContent)}
            ?readonly=${!this.editMode}
            @input=${(e: Event) => {
              this.rightContent = (e.target as HTMLTextAreaElement).value
              this.rightDirty = true
            }}
            @scroll=${(e: Event) => this.onPaneScroll(e, 'right')}
            @keydown=${this.onKeyDown}
            spellcheck="false"
          ></textarea>
        </div>
      </div>
    `
  }

  private renderUnified() {
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
            return html`<div>${line}</div>`
          })
        })}
      </div>
    `
  }

  /* ── Main render ── */
  render() {
    const hasDiff = this.diffBlocks.length > 0
    const canPrev = hasDiff && this.currentDiff > 0
    const canNext = hasDiff && this.currentDiff < this.diffBlocks.length - 1

    return html`
      <simple-dialog
        .open=${true}
        title="📊 File compare"
        width="95%"
        @dialog-close=${this.close}
      >
        <div class="root">
          <div class="toolbar">
            <button
              class="btn ${this.viewMode === 'side' ? 'active' : ''}"
              @click=${() => (this.viewMode = 'side')}
            >
              Side (S)
            </button>
            <button
              class="btn ${this.viewMode === 'unified' ? 'active' : ''}"
              @click=${() => (this.viewMode = 'unified')}
            >
              Unified (U)
            </button>

            <div class="toolbar-sep"></div>

            <button
              class="btn"
              ?disabled=${!canPrev}
              @click=${this.prevDiff}
              title="Previous diff (P/↑)"
            >
              ⬆
            </button>
            <button
              class="btn"
              ?disabled=${!canNext}
              @click=${this.nextDiff}
              title="Next diff (N/↓)"
            >
              ⬇
            </button>
            <span style="color:#94a3b8;font-size:0.8rem;min-width:3rem">
              ${hasDiff
                ? `${this.currentDiff + 1} / ${this.diffBlocks.length}`
                : 'no diffs'}
            </span>

            <div class="toolbar-sep"></div>
            ${this.viewMode === 'side'
              ? html`
                  <button
                    class="btn ${this.editMode ? 'edit active' : ''}"
                    @click=${() => {
                      this.editMode = !this.editMode
                    }}
                  >
                    ${this.editMode ? '✏️ Editing' : '👁 View'}
                  </button>
                `
              : ''}
            ${this.leftDirty
              ? html` <div class="toolbar-sep"></div>
                  <button
                    class="btn save"
                    ?disabled=${this.saving}
                    @click=${() => this.saveFile('left')}
                  >
                    💾 save left${this.saving ? '…' : ''}
                  </button>`
              : ''}
            ${this.rightDirty
              ? html` ${!this.leftDirty
                    ? html`<div class="toolbar-sep"></div>`
                    : ''}
                  <button
                    class="btn save"
                    ?disabled=${this.saving}
                    @click=${() => this.saveFile('right')}
                  >
                    💾 save right${this.saving ? '…' : ''}
                  </button>`
              : ''}
          </div>

          ${this.loading
            ? html`<div style="padding:2rem;color:#0ea5e9">Loading…</div>`
            : this.error
              ? html`<div style="padding:2rem;color:#ef4444">
                  ${this.error}
                </div>`
              : this.isBinary
                ? html`<div style="padding:2rem;color:#94a3b8">
                    Binary files — cannot compare as text.<br />
                    Left: ${this.leftContent.length} bytes &nbsp;|&nbsp; Right:
                    ${this.rightContent.length} bytes
                  </div>`
                : this.viewMode === 'side'
                  ? this.renderSide()
                  : this.renderUnified()}
        </div>

        <div slot="footer">
          <span style="color:#64748b;font-size:0.75rem;">
            ${this.leftDirty || this.rightDirty ? '● unsaved  ·  ' : ''} N/↓
            next · P/↑ prev · S side · U unified · E edit · → copy L▶R · ← copy
            R▶L
          </span>
          <button class="btn" @click=${this.close}>Close (Esc)</button>
        </div>
      </simple-dialog>
    `
  }
}

customElements.define('file-compare', FileCompare)
