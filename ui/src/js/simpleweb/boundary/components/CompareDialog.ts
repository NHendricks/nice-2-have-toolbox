import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
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
      table-layout: fixed;
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
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
      overflow: hidden;
    }

    .compare-table td.status-col {
      text-align: center;
      font-size: 1.2rem;
    }

    .file-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
    }

    .file-name span:nth-child(2) {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      min-width: 0;
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
      font-family: 'JetBrains Mono', monospace;
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

  @property({ type: Object })
  progress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  @property({ type: Boolean })
  hideIdentical = true

  @property({ type: Boolean })
  hideDirectories = false

  @property({ type: Boolean })
  showLeft = true

  @property({ type: Boolean })
  showRight = true

  @property({ type: Boolean })
  showDifferent = true

  @property({ type: String })
  regexFilter = ''

  @property({ type: Boolean })
  regexFilterActive = false

  @property({ type: Boolean })
  showRegexDialog = false

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

  getFilteredCounts() {
    if (!this.result) {
      return {
        totalLeft: 0,
        totalRight: 0,
        onlyInLeft: 0,
        onlyInRight: 0,
        different: 0,
        identical: 0,
      }
    }

    let totalLeft = 0
    let totalRight = 0
    let onlyInLeft = 0
    let onlyInRight = 0
    let different = 0
    let identical = 0

    this.result.onlyInLeft.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (!this.matchesRegexFilter(item.path)) return
      totalLeft++
      if (this.showLeft) onlyInLeft++
    })

    this.result.onlyInRight.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (!this.matchesRegexFilter(item.path)) return
      totalRight++
      if (this.showRight) onlyInRight++
    })

    this.result.different.forEach((item: any) => {
      if (
        this.hideDirectories &&
        (item.leftIsDirectory || item.rightIsDirectory)
      )
        return
      if (!this.matchesRegexFilter(item.path)) return
      totalLeft++
      totalRight++
      if (this.showDifferent) different++
    })

    this.result.identical.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (!this.matchesRegexFilter(item.path)) return
      totalLeft++
      totalRight++
      if (!this.hideIdentical) identical++
    })

    return {
      totalLeft,
      totalRight,
      onlyInLeft,
      onlyInRight,
      different,
      identical,
    }
  }

  getFilteredItems() {
    if (!this.result) return []

    const items: any[] = []

    this.result.onlyInLeft.forEach((item: any) => {
      if (this.hideDirectories && item.isDirectory) return
      if (!this.showLeft) return
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
      if (!this.showRight) return
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
      if (!this.showDifferent) return
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
      this.dispatchEvent(
        new CustomEvent('compare-files', {
          bubbles: true,
          composed: true,
          detail: { leftPath: item.leftFile.path, rightPath: item.rightFile.path },
        }),
      )
    }
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
        .title=${`🔍 compare ${this.recursive ? '(recursive)' : '(current dir only)'}`}
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
                    Comparing
                    directories${this.recursive ? ' (recursive)' : ''}...
                  </div>
                  ${this.progress
                    ? html`
                        <div
                          style="margin-top: 1rem; padding: 1rem; background: #1e293b; border-radius: 8px; border: 2px solid #0ea5e9; width: 400px;"
                        >
                          <div
                            style="width: 100%; height: 20px; background: #0f172a; border-radius: 4px; overflow: hidden; margin-bottom: 0.75rem;"
                          >
                            <div
                              style="height: 100%; background: linear-gradient(90deg, #0ea5e9, #06b6d4); transition: width 0.3s ease; width: ${this
                                .progress.percentage}%;"
                            ></div>
                          </div>
                          <div
                            style="color: #cbd5e1; font-size: 0.85rem; text-align: center;"
                          >
                            📁 ${this.progress.current} / ${this.progress.total}
                            files
                          </div>
                          <div
                            style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
                          >
                            ${this.progress.fileName}
                          </div>
                        </div>
                      `
                    : ''}
                </div>
              `
            : ''}
          <!-- Filter Section -->
          <div class="filter-section">
            <span class="filter-label">🔎</span>

            <label
              class=${this.hideIdentical ? 'active' : ''}
              title="Hide identical"
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
              title="Hide directories"
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

            <label
              class=${this.showLeft ? 'active' : ''}
              title="Show left only"
            >
              <input
                type="checkbox"
                .checked=${this.showLeft}
                @change=${(e: Event) =>
                  (this.showLeft = (e.target as HTMLInputElement).checked)}
              />
              ⬅
            </label>

            <label
              class=${this.showRight ? 'active' : ''}
              title="Show right only"
            >
              <input
                type="checkbox"
                .checked=${this.showRight}
                @change=${(e: Event) =>
                  (this.showRight = (e.target as HTMLInputElement).checked)}
              />
              ⮕
            </label>

            <label
              class=${this.showDifferent ? 'active' : ''}
              title="Show different"
            >
              <input
                type="checkbox"
                .checked=${this.showDifferent}
                @change=${(e: Event) =>
                  (this.showDifferent = (e.target as HTMLInputElement).checked)}
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

          ${(() => {
            const filtered = this.getFilteredCounts()

            return html`
              <div class="summary-section">
                <div class="summary-item status-left-only">
                  <div class="summary-label">Left only</div>
                  <div class="summary-value">${filtered.onlyInLeft}</div>
                </div>
                <div class="summary-item status-right-only">
                  <div class="summary-label">Right only</div>
                  <div class="summary-value">${filtered.onlyInRight}</div>
                </div>
                <div class="summary-item status-different">
                  <div class="summary-label">Different</div>
                  <div class="summary-value">${filtered.different}</div>
                </div>
                <div class="summary-item status-identical">
                  <div class="summary-label">Identical</div>
                  <div class="summary-value">${filtered.identical}</div>
                </div>
              </div>
            `
          })()}
          <!-- Table & Summary Section same as your original code -->
          ${hasDifferences
            ? html`
                <div class="table-wrapper">
                  <table class="compare-table">
                    <thead>
                      <tr>
                        <th>Left</th>
                        <th class="status-col">Status</th>
                        <th>Right</th>
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
                              ? 'Click to compare'
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
                                    >not present</span
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
                                    >not present</span
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
                              No entries match the current filters
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
                  <div class="success-title">Directories are identical!</div>
                  <div class="success-subtitle">
                    ${summary.identical} identical
                    ${summary.identical === 1 ? 'item' : 'items'}
                  </div>
                </div>
              `}
        </div>

        <div slot="footer" class="dialog-buttons">
          <button
            class="btn-cancel"
            @click=${this.toggleRecursive}
            style="margin-right: auto;"
          >
            ${this.recursive ? '📂' : '📁'} Mode:
            ${this.recursive ? 'Recursive' : 'Current'}
          </button>
          <button class="btn-confirm" @click=${this.recompare}>
            🔄 Compare Again
          </button>
          <button class="btn-cancel" @click=${this.close}>Close (ESC)</button>
        </div>
      </simple-dialog>

      ${this.showRegexDialog
        ? html`
            <simple-dialog
              .open=${true}
              .title=${'🔍 Regex Filter'}
              .width=${'550px'}
              @dialog-close=${() => (this.showRegexDialog = false)}
            >
              <div
                style="padding: 1rem; display: flex; flex-direction: column; gap: 1rem;"
              >
                <div>
                  <label
                    style="display: block; margin-bottom: 0.5rem; color: #94a3b8;"
                    >Examples:</label
                  >
                  <select
                    style="width: 100%; padding: 0.6rem; background: #1e293b; border: 2px solid #475569; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 0.9rem; border-radius: 4px; cursor: pointer;"
                    @change=${(e: Event) => {
                      const value = (e.target as HTMLSelectElement).value
                      if (value) {
                        this.regexFilter = value
                      }
                      ;(e.target as HTMLSelectElement).selectedIndex = 0
                    }}
                  >
                    <option value="">-- Select an example --</option>
                    <optgroup label="File Extensions">
                      <option value="\\.txt$">Text files (.txt)</option>
                      <option value="\\.(jpe?g|png|gif)$">
                        Images (.jpg, .png, .gif)
                      </option>
                      <option value="\\.(docx?|xlsx?|pptx?)$">
                        Office files (.doc, .xls, .ppt)
                      </option>
                      <option value="\\.pdf$">PDF files (.pdf)</option>
                      <option value="\\.(zip|rar|7z)$">
                        Archives (.zip, .rar, .7z)
                      </option>
                      <option value="\\.(js|ts)$">
                        JavaScript/TypeScript (.js, .ts)
                      </option>
                      <option value="\\.(css|scss|less)$">
                        Stylesheets (.css, .scss)
                      </option>
                      <option value="\\.(json|xml|yaml)$">
                        Config files (.json, .xml, .yaml)
                      </option>
                    </optgroup>
                    <optgroup label="Name Patterns">
                      <option value="^\\.">Hidden files (start with .)</option>
                      <option value="^[Rr]eadme">
                        Files starting with "readme"
                      </option>
                      <option value="(backup|bak|old)">
                        Backup files (backup, bak, old)
                      </option>
                      <option value="(test|spec)">
                        Test files (test, spec)
                      </option>
                      <option value="^_">Files starting with underscore</option>
                      <option value="\\.(tmp|temp|swp)$">
                        Temporary files (.tmp, .temp, .swp)
                      </option>
                    </optgroup>
                    <optgroup label="Exclude Patterns (use with caution)">
                      <option value="^(?!.*node_modules)">
                        Exclude node_modules
                      </option>
                      <option value="^(?!.*\\.git)">Exclude .git</option>
                    </optgroup>
                  </select>
                </div>

                <div>
                  <label
                    style="display: block; margin-bottom: 0.5rem; color: #94a3b8;"
                    >Custom pattern:</label
                  >
                  <input
                    type="text"
                    class="regex-input ${this.regexFilter &&
                    !this.isValidRegex()
                      ? 'error'
                      : ''}"
                    placeholder="Enter regex pattern..."
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
                      : '#475569'}; color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 1rem; border-radius: 4px; box-sizing: border-box;"
                  />
                  ${this.regexFilter && !this.isValidRegex()
                    ? html`<div
                        style="color: #ef4444; font-size: 0.85rem; margin-top: 0.5rem;"
                      >
                        ⚠️ Invalid regex expression
                      </div>`
                    : ''}
                </div>

                <details
                  style="background: #1e293b; border-radius: 4px; padding: 0.75rem;"
                >
                  <summary
                    style="cursor: pointer; color: #fbbf24; font-weight: bold;"
                  >
                    📖 Quick Reference
                  </summary>
                  <div
                    style="margin-top: 0.75rem; font-size: 0.85rem; color: #cbd5e1; display: grid; grid-template-columns: auto 1fr; gap: 0.25rem 1rem;"
                  >
                    <code style="color: #0ea5e9;">.</code
                    ><span>Any character</span>
                    <code style="color: #0ea5e9;">*</code
                    ><span>Zero or more</span>
                    <code style="color: #0ea5e9;">+</code
                    ><span>One or more</span>
                    <code style="color: #0ea5e9;">?</code><span>Optional</span>
                    <code style="color: #0ea5e9;">^</code
                    ><span>Start of string</span>
                    <code style="color: #0ea5e9;">$</code
                    ><span>End of string</span>
                    <code style="color: #0ea5e9;">\\.</code
                    ><span>Literal dot</span>
                    <code style="color: #0ea5e9;">a|b</code><span>a OR b</span>
                    <code style="color: #0ea5e9;">[abc]</code
                    ><span>Any of a, b, c</span>
                    <code style="color: #0ea5e9;">[^abc]</code
                    ><span>Not a, b, c</span>
                  </div>
                </details>
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
                  Disable
                </button>
                <button
                  class="btn-cancel"
                  @click=${() => (this.showRegexDialog = false)}
                >
                  Cancel (ESC)
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
                  Apply (ENTER)
                </button>
              </div>
            </simple-dialog>
          `
        : ''}
    `
  }
}

customElements.define('compare-dialog', CompareDialog)
