import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import './FileCompare'
import './SimpleDialog'

export class CompareDialog extends LitElement {
  static styles = css`
    .compare-content {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .summary-section {
      background: #1e293b;
      padding: 1rem;
      border-radius: 8px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }

    .summary-item {
      text-align: center;
    }

    .summary-label {
      color: #94a3b8;
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }

    .summary-value {
      font-size: 1.5rem;
      font-weight: bold;
    }

    /* ---- Filter Section (Icon only) ---- */
    .filter-section {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
    }

    .filter-label {
      color: #fbbf24;
      font-weight: bold;
    }

    .filter-section label {
      display: flex;
      align-items: center;
      cursor: pointer;
      font-size: 1.3rem;
      opacity: 0.35;
      transition:
        opacity 0.15s ease,
        transform 0.1s ease;
    }

    .filter-section label.active {
      opacity: 1;
    }

    .filter-section label:hover {
      transform: scale(1.1);
    }

    .filter-section input {
      display: none;
    }

    /* ---- Table Styles ---- */
    .compare-table {
      width: 100%;
      border-collapse: collapse;
      background: #0f172a;
      border-radius: 8px;
      overflow: hidden;
    }

    .compare-table thead {
      background: #1e293b;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    .compare-table th {
      padding: 0.75rem;
      text-align: left;
      color: #fbbf24;
      font-weight: bold;
      border-bottom: 2px solid #475569;
    }

    .compare-table th.status-col {
      width: 80px;
      text-align: center;
    }

    .compare-table tbody tr {
      border-bottom: 1px solid #334155;
    }

    .compare-table tbody tr:hover {
      background: #1e293b;
    }

    .compare-table tbody tr.clickable {
      cursor: pointer;
    }

    .compare-table tbody tr.clickable:hover {
      background: #1e4d5b;
    }

    .compare-table td {
      padding: 0.5rem 0.75rem;
      color: #cbd5e1;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }

    .compare-table td.status-col {
      text-align: center;
      font-size: 1.2rem;
    }

    .file-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-size {
      color: #64748b;
      font-size: 0.85rem;
      margin-left: 0.5rem;
    }

    .status-identical {
      color: #10b981;
    }

    .status-different {
      color: #ef4444;
    }

    .status-left-only {
      color: #3b82f6;
    }

    .status-right-only {
      color: #f59e0b;
    }

    .empty-cell {
      color: #475569;
      font-style: italic;
    }

    .table-wrapper {
      max-height: 500px;
      overflow-y: auto;
      border: 1px solid #334155;
      border-radius: 8px;
    }

    .success-message {
      background: #064e3b;
      padding: 1.5rem;
      border-radius: 8px;
      border: 2px solid #10b981;
      text-align: center;
    }

    .success-icon {
      font-size: 3rem;
      margin-bottom: 0.5rem;
    }

    .success-title {
      font-size: 1.2rem;
      font-weight: bold;
      color: #10b981;
    }

    .success-subtitle {
      color: #94a3b8;
      margin-top: 0.5rem;
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

    .btn-confirm {
      background: #059669;
      color: #fff;
    }

    .btn-confirm:hover {
      background: #047857;
    }

    .btn-cancel {
      background: #475569;
      color: #fff;
    }

    .btn-cancel:hover {
      background: #64748b;
    }

    .waiting-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.95);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10;
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

    .waiting-text {
      color: #0ea5e9;
      font-size: 1.2rem;
      font-weight: bold;
    }

    .regex-input-wrapper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex: 1;
      min-width: 200px;
    }

    .regex-input {
      flex: 1;
      padding: 0.4rem 0.6rem;
      background: #0f172a;
      border: 2px solid #475569;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      border-radius: 4px;
      transition: border-color 0.2s;
    }

    .regex-input:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .regex-input.error {
      border-color: #ef4444;
    }

    .regex-button {
      padding: 0.4rem 0.8rem;
      background: #475569;
      border: none;
      color: #fff;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: bold;
      transition: background 0.2s;
    }

    .regex-button:hover {
      background: #64748b;
    }

    .regex-button.active {
      background: #0ea5e9;
    }
  `

  @property({ type: Object })
  result: any = null

  @property({ type: Boolean })
  recursive = false

  @property({ type: Boolean })
  isWaiting = false

  @property({ type: Boolean })
  hideIdentical = false

  @property({ type: Boolean })
  hideDirectories = false

  @property({ type: Boolean })
  showOnlyLeft = false

  @property({ type: Boolean })
  showOnlyRight = false

  @property({ type: Boolean })
  showOnlyDifferent = false

  @property({ type: String })
  regexFilter = ''

  @property({ type: Boolean })
  regexFilterActive = false

  @property({ type: Boolean })
  showRegexDialog = false

  @property({ type: Object })
  fileCompareData: { leftPath: string; rightPath: string } | null = null

  formatFileSize(bytes: number): string {
    if (bytes === 0) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  isValidRegex(): boolean {
    if (!this.regexFilter) return true
    try {
      new RegExp(this.regexFilter)
      return true
    } catch (e) {
      return false
    }
  }

  toggleRegexFilter() {
    if (this.regexFilter && this.isValidRegex()) {
      this.regexFilterActive = !this.regexFilterActive
    } else if (!this.regexFilter) {
      this.regexFilterActive = false
    }
  }

  matchesRegexFilter(filename: string): boolean {
    if (!this.regexFilterActive || !this.regexFilter) return true
    try {
      const regex = new RegExp(this.regexFilter)
      return regex.test(filename)
    } catch (e) {
      return true
    }
  }

  getFilteredItems() {
    if (!this.result) return []

    const items: any[] = []

    this.result.onlyInLeft.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (this.showOnlyRight || this.showOnlyDifferent) return
      if (!this.matchesRegexFilter(item.path)) return
      items.push({
        name: item.path,
        leftFile: item,
        rightFile: null,
        status: 'left-only',
        statusSymbol: '←',
        statusClass: 'status-left-only',
      })
    })

    this.result.onlyInRight.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (this.showOnlyLeft || this.showOnlyDifferent) return
      if (!this.matchesRegexFilter(item.path)) return
      items.push({
        name: item.path,
        leftFile: null,
        rightFile: item,
        status: 'right-only',
        statusSymbol: '→',
        statusClass: 'status-right-only',
      })
    })

    this.result.different.forEach((item: any) => {
      if (
        this.hideDirectories &&
        (item.leftIsDirectory || item.rightIsDirectory)
      )
        return
      if (this.showOnlyLeft || this.showOnlyRight) return
      if (!this.matchesRegexFilter(item.path)) return
      items.push({
        name: item.path,
        leftFile: {
          path: item.leftPath,
          size: item.leftSize,
          modified: item.leftModified,
          isDirectory: item.leftIsDirectory,
        },
        rightFile: {
          path: item.rightPath,
          size: item.rightSize,
          modified: item.rightModified,
          isDirectory: item.rightIsDirectory,
        },
        status: 'different',
        statusSymbol: '≠',
        statusClass: 'status-different',
        reason: item.reason,
      })
    })

    if (!this.hideIdentical) {
      this.result.identical.forEach((item: any) => {
        if (this.hideDirectories && item.isDirectory) return
        if (this.showOnlyLeft || this.showOnlyRight || this.showOnlyDifferent)
          return
        if (!this.matchesRegexFilter(item.path)) return
        items.push({
          name: item.path,
          leftFile: {
            path: item.leftPath,
            size: item.size,
            modified: item.modified,
            isDirectory: item.isDirectory,
          },
          rightFile: {
            path: item.rightPath,
            size: item.size,
            modified: item.modified,
            isDirectory: item.isDirectory,
          },
          status: 'identical',
          statusSymbol: '=',
          statusClass: 'status-identical',
        })
      })
    }

    items.sort((a, b) => a.name.localeCompare(b.name))

    return items
  }

  toggleRecursive() {
    this.dispatchEvent(
      new CustomEvent('toggle-recursive', { bubbles: true, composed: true }),
    )
  }

  recompare() {
    this.dispatchEvent(
      new CustomEvent('recompare', { bubbles: true, composed: true }),
    )
  }

  close() {
    this.dispatchEvent(
      new CustomEvent('close', { bubbles: true, composed: true }),
    )
  }

  compareFiles(item: any) {
    // Only compare if both files exist and are not directories
    if (
      item.status === 'different' &&
      item.leftFile &&
      item.rightFile &&
      !item.leftFile.isDirectory &&
      !item.rightFile.isDirectory
    ) {
      this.fileCompareData = {
        leftPath: item.leftFile.path,
        rightPath: item.rightFile.path,
      }
    }
  }

  closeFileCompare() {
    this.fileCompareData = null
  }

  render() {
    if (!this.result) return html``

    const { summary } = this.result
    const filteredItems = this.getFilteredItems()
    const hasDifferences =
      summary.onlyInLeft > 0 || summary.onlyInRight > 0 || summary.different > 0

    return html`
      <simple-dialog
        .open=${true}
        .title=${`🔍 Verzeichnisvergleich ${this.recursive ? '(Rekursiv)' : '(Aktuell)'}`}
        .width=${'95%'}
        .maxHeight=${'90vh'}
        @dialog-close=${this.close}
      >
        <div class="compare-content" style="position: relative;">
          ${this.isWaiting
            ? html`
                <div class="waiting-overlay">
                  <div class="spinner"></div>
                  <div class="waiting-text">
                    Vergleiche
                    Verzeichnisse${this.recursive ? ' (rekursiv)' : ''}...
                  </div>
                </div>
              `
            : ''}
          <!-- Filter Section -->
          <div class="filter-section">
            <span class="filter-label">🔎</span>

            <label
              class=${this.hideIdentical ? 'active' : ''}
              title="Identische ausblenden"
            >
              <input
                type="checkbox"
                .checked=${this.hideIdentical}
                @change=${(e: Event) =>
                  (this.hideIdentical = (e.target as HTMLInputElement).checked)}
              />
              ≡
            </label>

            <label
              class=${this.hideDirectories ? 'active' : ''}
              title="Verzeichnisse ausblenden"
            >
              <input
                type="checkbox"
                .checked=${this.hideDirectories}
                @change=${(e: Event) =>
                  (this.hideDirectories = (
                    e.target as HTMLInputElement
                  ).checked)}
              />
              📁
            </label>

            <label class=${this.showOnlyLeft ? 'active' : ''} title="Nur links">
              <input
                type="checkbox"
                .checked=${this.showOnlyLeft}
                @change=${(e: Event) =>
                  (this.showOnlyLeft = (e.target as HTMLInputElement).checked)}
              />
              ⬅
            </label>

            <label
              class=${this.showOnlyRight ? 'active' : ''}
              title="Nur rechts"
            >
              <input
                type="checkbox"
                .checked=${this.showOnlyRight}
                @change=${(e: Event) =>
                  (this.showOnlyRight = (e.target as HTMLInputElement).checked)}
              />
              ➡
            </label>

            <label
              class=${this.showOnlyDifferent ? 'active' : ''}
              title="Nur unterschiedliche"
            >
              <input
                type="checkbox"
                .checked=${this.showOnlyDifferent}
                @change=${(e: Event) =>
                  (this.showOnlyDifferent = (
                    e.target as HTMLInputElement
                  ).checked)}
              />
              ≠
            </label>

            <label
              class=${this.regexFilterActive ? 'active' : ''}
              title="Regex Filter"
              @click=${() => (this.showRegexDialog = true)}
              style="cursor: pointer;"
            >
              <input type="checkbox" .checked=${this.regexFilterActive} />
              .*
            </label>
          </div>

          <!-- Table & Summary Section same as your original code -->
          ${hasDifferences
            ? html`
                <div class="table-wrapper">
                  <table class="compare-table">
                    <thead>
                      <tr>
                        <th>Links</th>
                        <th class="status-col">Status</th>
                        <th>Rechts</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredItems.map(
                        (item) => html`
                          <tr
                            class="${item.status === 'different' &&
                            item.leftFile &&
                            item.rightFile &&
                            !item.leftFile.isDirectory &&
                            !item.rightFile.isDirectory
                              ? 'clickable'
                              : ''}"
                            @click=${() => this.compareFiles(item)}
                            title="${item.status === 'different' &&
                            item.leftFile &&
                            item.rightFile &&
                            !item.leftFile.isDirectory &&
                            !item.rightFile.isDirectory
                              ? 'Klicken zum Vergleichen'
                              : ''}"
                          >
                            <td>
                              ${item.leftFile
                                ? html`
                                    <div class="file-name">
                                      <span
                                        >${item.leftFile.isDirectory
                                          ? '📁'
                                          : '📄'}</span
                                      >
                                      <span>${item.name}</span>
                                      ${!item.leftFile.isDirectory
                                        ? html`<span class="file-size"
                                            >${this.formatFileSize(
                                              item.leftFile.size,
                                            )}</span
                                          >`
                                        : ''}
                                    </div>
                                  `
                                : html`<span class="empty-cell"
                                    >nicht vorhanden</span
                                  >`}
                            </td>
                            <td class="status-col ${item.statusClass}">
                              ${item.statusSymbol}
                            </td>
                            <td>
                              ${item.rightFile
                                ? html`
                                    <div class="file-name">
                                      <span
                                        >${item.rightFile.isDirectory
                                          ? '📁'
                                          : '📄'}</span
                                      >
                                      <span>${item.name}</span>
                                      ${!item.rightFile.isDirectory
                                        ? html`<span class="file-size"
                                            >${this.formatFileSize(
                                              item.rightFile.size,
                                            )}</span
                                          >`
                                        : ''}
                                    </div>
                                  `
                                : html`<span class="empty-cell"
                                    >nicht vorhanden</span
                                  >`}
                            </td>
                          </tr>
                        `,
                      )}
                      ${filteredItems.length === 0
                        ? html`<tr>
                            <td
                              colspan="3"
                              style="text-align:center; padding:2rem; color:#94a3b8;"
                            >
                              Keine Einträge entsprechen den aktuellen Filtern
                            </td>
                          </tr>`
                        : ''}
                    </tbody>
                  </table>
                </div>
              `
            : html`
                <div class="success-message">
                  <div class="success-icon">✅</div>
                  <div class="success-title">Verzeichnisse sind identisch!</div>
                  <div class="success-subtitle">
                    ${summary.identical} identische
                    ${summary.identical === 1 ? 'Element' : 'Elemente'}
                  </div>
                </div>
              `}
          <div class="summary-section">
            <div class="summary-item">
              <div class="summary-label">Links gesamt</div>
              <div class="summary-value">${summary.totalLeft}</div>
            </div>
            <div class="summary-item">
              <div class="summary-label">Rechts gesamt</div>
              <div class="summary-value">${summary.totalRight}</div>
            </div>
            <div class="summary-item status-left-only">
              <div class="summary-label">Nur links</div>
              <div class="summary-value">${summary.onlyInLeft}</div>
            </div>
            <div class="summary-item status-right-only">
              <div class="summary-label">Nur rechts</div>
              <div class="summary-value">${summary.onlyInRight}</div>
            </div>
            <div class="summary-item status-different">
              <div class="summary-label">Unterschiedlich</div>
              <div class="summary-value">${summary.different}</div>
            </div>
            <div class="summary-item status-identical">
              <div class="summary-label">Identisch</div>
              <div class="summary-value">${summary.identical}</div>
            </div>
          </div>
        </div>

        <div slot="footer" class="dialog-buttons">
          <button
            class="btn-cancel"
            @click=${this.toggleRecursive}
            style="margin-right: auto;"
          >
            ${this.recursive ? '📂' : '📁'} Modus:
            ${this.recursive ? 'Rekursiv' : 'Aktuell'}
          </button>
          <button class="btn-confirm" @click=${this.recompare}>
            🔄 Erneut vergleichen
          </button>
          <button class="btn-cancel" @click=${this.close}>
            Schließen (ESC)
          </button>
        </div>
      </simple-dialog>

      ${this.showRegexDialog
        ? html`
            <simple-dialog
              .open=${true}
              .title=${'🔍 Regex Filter'}
              .width=${'500px'}
              @dialog-close=${() => (this.showRegexDialog = false)}
            >
              <div style="padding: 1rem;">
                <div class="input-field">
                  <label>Regex Muster (z.B. \\.txt$ für txt-Dateien):</label>
                  <input
                    type="text"
                    class="regex-input ${this.regexFilter &&
                    !this.isValidRegex()
                      ? 'error'
                      : ''}"
                    placeholder="z.B. \\.txt$ oder ^test"
                    .value=${this.regexFilter}
                    @input=${(e: Event) =>
                      (this.regexFilter = (e.target as HTMLInputElement).value)}
                    @keydown=${(e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (this.regexFilter && this.isValidRegex()) {
                          this.regexFilterActive = true
                          this.showRegexDialog = false
                        }
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        this.showRegexDialog = false
                      }
                    }}
                    style="width: 100%; padding: 0.75rem; background: #0f172a; border: 2px solid ${this
                      .regexFilter && !this.isValidRegex()
                      ? '#ef4444'
                      : '#475569'}; color: #fff; font-family: 'Courier New', monospace; font-size: 1rem; border-radius: 4px; box-sizing: border-box;"
                  />
                  ${this.regexFilter && !this.isValidRegex()
                    ? html`<div
                        style="color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem;"
                      >
                        ⚠️ Ungültiger Regex-Ausdruck
                      </div>`
                    : ''}
                </div>
              </div>
              <div slot="footer" class="dialog-buttons">
                <button
                  class="btn-cancel"
                  @click=${() => {
                    this.regexFilter = ''
                    this.regexFilterActive = false
                    this.showRegexDialog = false
                  }}
                >
                  Deaktivieren
                </button>
                <button
                  class="btn-cancel"
                  @click=${() => (this.showRegexDialog = false)}
                >
                  Abbrechen (ESC)
                </button>
                <button
                  class="btn-confirm"
                  @click=${() => {
                    if (this.regexFilter && this.isValidRegex()) {
                      this.regexFilterActive = true
                      this.showRegexDialog = false
                    }
                  }}
                  ?disabled=${!this.regexFilter || !this.isValidRegex()}
                >
                  Anwenden (ENTER)
                </button>
              </div>
            </simple-dialog>
          `
        : ''}
      ${this.fileCompareData
        ? html`
            <file-compare
              .leftPath=${this.fileCompareData.leftPath}
              .rightPath=${this.fileCompareData.rightPath}
              @close=${this.closeFileCompare}
            ></file-compare>
          `
        : ''}
    `
  }
}

customElements.define('compare-dialog', CompareDialog)
