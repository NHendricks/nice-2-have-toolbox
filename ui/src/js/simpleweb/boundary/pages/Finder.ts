import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../navigation/ResponsiveMenu'

interface FilterState {
  account: string
  dateFrom: string
  dateTo: string
  amountFrom: string
  amountTo: string
  globalSearch1: string
  globalSearch2: string
}

interface FinderResult {
  headers: string[]
  rows: any[][]
  summary: {
    totalRows: number
    sum: number
    yearSums: Record<string, number>
  }
}

export class Finder extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      color: #333;
      background: #f5f5f5;
      min-height: 100vh;
    }

    .content {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 0.5rem;
      color: #1e293b;
    }

    .subtitle {
      color: #64748b;
      margin-bottom: 2rem;
    }

    .config-section {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: bold;
      color: #475569;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #475569;
      font-size: 0.9rem;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 4px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .form-group input.error {
      border-color: #dc2626;
      background-color: #fee;
    }

    .form-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    @media (max-width: 1200px) {
      .filter-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 768px) {
      .filter-grid {
        grid-template-columns: 1fr;
      }
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .filter-label {
      font-weight: 600;
      color: #475569;
      font-size: 0.9rem;
    }

    .filter-input {
      padding: 0.5rem;
      border: 2px solid #e2e8f0;
      border-radius: 4px;
      font-size: 0.9rem;
      transition: border-color 0.2s;
    }

    .filter-input:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .filter-input.global {
      background-color: #dcfce7;
      border-color: #86efac;
    }

    .filter-input.global:focus {
      border-color: #22c55e;
    }

    .range-inputs {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .range-label {
      font-size: 0.8rem;
      color: #64748b;
      font-weight: normal;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: #0ea5e9;
      color: white;
    }

    .btn-primary:hover {
      background: #0284c7;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(14, 165, 233, 0.3);
    }

    .btn-secondary {
      background: #64748b;
      color: white;
    }

    .btn-secondary:hover {
      background: #475569;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    .results-section {
      background: white;
      border-radius: 8px;
      padding: 1.5rem;
      margin-top: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e2e8f0;
    }

    .summary-box {
      background: #f1f5f9;
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    .summary-label {
      font-weight: 600;
      color: #475569;
    }

    .summary-value {
      color: #0ea5e9;
      font-weight: bold;
    }

    .table-container {
      overflow-x: auto;
      margin-top: 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }

    th {
      background: #0ea5e9;
      color: white;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 1;
    }

    td {
      padding: 0.75rem;
      border-bottom: 1px solid #e2e8f0;
    }

    tr:hover {
      background: #f8fafc;
    }

    .no-results {
      text-align: center;
      padding: 3rem;
      color: #94a3b8;
      font-size: 1.1rem;
    }

    .status-message {
      padding: 1rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-message.info {
      background: #dbeafe;
      color: #1e40af;
      border: 1px solid #93c5fd;
    }

    .status-message.success {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }

    .status-message.error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }

    .info-box {
      background: #eff6ff;
      border-left: 4px solid #0ea5e9;
      padding: 1rem;
      margin-bottom: 1.5rem;
      border-radius: 4px;
    }

    .info-box-title {
      font-weight: 600;
      color: #0369a1;
      margin-bottom: 0.5rem;
    }

    .info-box-text {
      color: #0c4a6e;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    .year-sums {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 0.75rem;
      margin-top: 1rem;
    }

    .year-sum-card {
      background: white;
      border: 2px solid #e2e8f0;
      border-radius: 4px;
      padding: 0.75rem;
      text-align: center;
    }

    .year-sum-year {
      font-weight: 600;
      color: #475569;
      font-size: 0.9rem;
      margin-bottom: 0.25rem;
    }

    .year-sum-value {
      color: #0ea5e9;
      font-weight: bold;
      font-size: 1.1rem;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      gap: 1rem;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
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
  `

  @property({ type: String })
  selectedFile = ''

  @property({ type: Object })
  filters: FilterState = {
    account: '',
    dateFrom: '',
    dateTo: '',
    amountFrom: '',
    amountTo: '',
    globalSearch1: '',
    globalSearch2: '',
  }

  @property({ type: Object })
  results: FinderResult | null = null

  @property({ type: Boolean })
  isLoading = false

  @property({ type: String })
  statusMessage = ''

  @property({ type: String })
  statusType: 'info' | 'success' | 'error' | '' = ''

  async handleFileSelect() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openFile'],
          filters: [
            {
              name: 'Bank Statement Files',
              extensions: ['xml', 'XML', 'txt', 'TXT', 'csv', 'CSV'],
            },
            { name: 'All Files', extensions: ['*'] },
          ],
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths &&
        response.filePaths.length > 0
      ) {
        this.selectedFile = response.filePaths[0]
        this.setStatus('File selected successfully', 'success')
      } else if (response.error) {
        this.setStatus(`Error: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Error selecting file: ${error.message}`, 'error')
    }
  }

  updateFilter(field: keyof FilterState, value: string) {
    this.filters = {
      ...this.filters,
      [field]: value,
    }
  }

  validateAmountInput(value: string): boolean {
    if (!value.trim()) return true
    // Allow negative numbers and decimals: -100.01, 100, -100, 100.5
    const amountRegex = /^-?\d+(\.\d{1,2})?$/
    return amountRegex.test(value)
  }

  clearFilters() {
    this.filters = {
      account: '',
      dateFrom: '',
      dateTo: '',
      amountFrom: '',
      amountTo: '',
      globalSearch1: '',
      globalSearch2: '',
    }
    this.setStatus('Filters cleared', 'info')
  }

  async analyzeFile() {
    if (!this.selectedFile) {
      this.setStatus('Please select a file first', 'error')
      return
    }

    // Validate amount inputs
    if (
      !this.validateAmountInput(this.filters.amountFrom) ||
      !this.validateAmountInput(this.filters.amountTo)
    ) {
      this.setStatus(
        'Invalid amount format. Use format: -100.01 or 100',
        'error',
      )
      return
    }

    this.isLoading = true
    this.setStatus('Analyzing file...', 'info')

    try {
      // Call backend proficash command to parse the file (format auto-detected)
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'proficash',
        {
          filePath: this.selectedFile,
        },
      )

      if (response.success && response.data) {
        const data = response.data

        this.results = {
          headers: data.headers,
          rows: data.rows,
          summary: data.summary,
        }

        this.setStatus(
          `Analysis complete: ${data.summary.totalRows} entries found`,
          'success',
        )
      } else {
        this.setStatus(
          `Error: ${response.error || 'Failed to parse file'}`,
          'error',
        )
      }
    } catch (error: any) {
      this.setStatus(`Error analyzing file: ${error.message}`, 'error')
    } finally {
      this.isLoading = false
    }
  }

  setStatus(message: string, type: 'info' | 'success' | 'error' | '' = 'info') {
    this.statusMessage = message
    this.statusType = type

    if (type !== '') {
      setTimeout(() => {
        this.statusMessage = ''
        this.statusType = ''
      }, 5000)
    }
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  render() {
    return html`
      <div class="content">
        <h1>🔍 ProfiCash Finder</h1>
        <p class="subtitle">
          Analyze and filter ProfiCash export files with powerful search
          capabilities
        </p>

        ${this.statusMessage
          ? html`
              <div class="status-message ${this.statusType}">
                <span
                  >${this.statusType === 'success'
                    ? '✓'
                    : this.statusType === 'error'
                      ? '⚠'
                      : 'ℹ'}</span
                >
                <span>${this.statusMessage}</span>
              </div>
            `
          : ''}

        <div class="info-box">
          <div class="info-box-title">📝 How to use</div>
          <div class="info-box-text">
            1. Export your ProfiCash data using:
            <strong
              >"Datei - Ausfuehren Export - Umsaetze und Salden - feste
              Satzlänge 768"</strong
            ><br />
            2. Select the exported file below<br />
            3. Apply filters to narrow down your search (optional)<br />
            4. Click "Analyze" to view results with sum calculations
          </div>
        </div>

        <!-- File Selection Section -->
        <div class="config-section">
          <div class="section-title">📁 File Configuration</div>

          <div class="form-group">
            <label for="file-select"
              >Selected File (Format Auto-Detected)</label
            >
            <div style="display: flex; gap: 0.5rem;">
              <input
                type="text"
                id="file-select"
                .value=${this.selectedFile}
                placeholder="No file selected... (Supports: CAMT.053 XML, fixed-length TXT)"
                readonly
                style="flex: 1;"
              />
              <button
                class="btn btn-secondary"
                @click=${this.handleFileSelect}
                style="padding: 0.75rem 1rem;"
              >
                Browse...
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Section -->
        <div class="config-section">
          <div class="section-title">🔍 Filters</div>

          <div class="filter-grid">
            <!-- Account Filter -->
            <div class="filter-group">
              <label class="filter-label">Konto (Account)</label>
              <input
                type="text"
                class="filter-input"
                placeholder="Filter by account..."
                .value=${this.filters.account}
                @input=${(e: Event) =>
                  this.updateFilter(
                    'account',
                    (e.target as HTMLInputElement).value,
                  )}
              />
            </div>

            <!-- Date Range Filter -->
            <div class="filter-group">
              <label class="filter-label">Datum (Date)</label>
              <div class="range-inputs">
                <input
                  type="date"
                  class="filter-input"
                  placeholder="From..."
                  .value=${this.filters.dateFrom}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'dateFrom',
                      (e.target as HTMLInputElement).value,
                    )}
                />
                <input
                  type="date"
                  class="filter-input"
                  placeholder="To..."
                  .value=${this.filters.dateTo}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'dateTo',
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </div>
            </div>

            <!-- Amount Range Filter -->
            <div class="filter-group">
              <label class="filter-label">Betrag (Amount)</label>
              <div class="range-inputs">
                <input
                  type="text"
                  class="filter-input ${!this.validateAmountInput(
                    this.filters.amountFrom,
                  )
                    ? 'error'
                    : ''}"
                  placeholder="From (e.g., -100.01)..."
                  .value=${this.filters.amountFrom}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'amountFrom',
                      (e.target as HTMLInputElement).value,
                    )}
                />
                <input
                  type="text"
                  class="filter-input ${!this.validateAmountInput(
                    this.filters.amountTo,
                  )
                    ? 'error'
                    : ''}"
                  placeholder="To (e.g., 100)..."
                  .value=${this.filters.amountTo}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'amountTo',
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </div>
            </div>

            <!-- Global Search Filter -->
            <div class="filter-group">
              <label class="filter-label">Globale Suche (Global Search)</label>
              <div class="range-inputs">
                <input
                  type="text"
                  class="filter-input global"
                  placeholder="Global search 1..."
                  .value=${this.filters.globalSearch1}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'globalSearch1',
                      (e.target as HTMLInputElement).value,
                    )}
                />
                <input
                  type="text"
                  class="filter-input global"
                  placeholder="Global search 2..."
                  .value=${this.filters.globalSearch2}
                  @input=${(e: Event) =>
                    this.updateFilter(
                      'globalSearch2',
                      (e.target as HTMLInputElement).value,
                    )}
                />
              </div>
            </div>
          </div>

          <div class="action-buttons">
            <button
              class="btn btn-primary"
              @click=${this.analyzeFile}
              ?disabled=${!this.selectedFile || this.isLoading}
            >
              ${this.isLoading
                ? html`<span
                    class="spinner"
                    style="width: 20px; height: 20px;"
                  ></span>`
                : '🔍'}
              ${this.isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              class="btn btn-secondary"
              @click=${this.clearFilters}
              ?disabled=${this.isLoading}
            >
              🗑️ Clear Filters
            </button>
          </div>
        </div>

        <!-- Results Section -->
        ${this.results ? this.renderResults() : this.renderEmptyState()}
      </div>
    `
  }

  applyFilters(rows: any[][]): any[][] {
    return rows.filter((row) => {
      // Account filter (column 0)
      if (this.filters.account) {
        const account = String(row[0]).toLowerCase()
        if (!account.includes(this.filters.account.toLowerCase())) {
          return false
        }
      }

      // Date range filter (column 1) - format: DD.MM.YYYY
      if (this.filters.dateFrom || this.filters.dateTo) {
        const dateStr = String(row[1])
        const [day, month, year] = dateStr.split('.')
        const rowDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
        )

        if (this.filters.dateFrom) {
          const fromDate = new Date(this.filters.dateFrom)
          if (rowDate < fromDate) {
            return false
          }
        }

        if (this.filters.dateTo) {
          const toDate = new Date(this.filters.dateTo)
          if (rowDate > toDate) {
            return false
          }
        }
      }

      // Amount filter (column 2)
      const amount = Number(row[2])

      if (
        this.filters.amountFrom &&
        this.validateAmountInput(this.filters.amountFrom)
      ) {
        const fromAmount = parseFloat(this.filters.amountFrom)
        if (amount < fromAmount) {
          return false
        }
      }

      if (
        this.filters.amountTo &&
        this.validateAmountInput(this.filters.amountTo)
      ) {
        const toAmount = parseFloat(this.filters.amountTo)
        if (amount > toAmount) {
          return false
        }
      }

      // Global search 1 - search across all columns (case-insensitive)
      if (this.filters.globalSearch1) {
        const searchTerm = this.filters.globalSearch1.toLowerCase()
        const rowText = row.map((cell) => String(cell).toLowerCase()).join(' ')
        if (!rowText.includes(searchTerm)) {
          return false
        }
      }

      // Global search 2 - search across all columns (case-insensitive)
      if (this.filters.globalSearch2) {
        const searchTerm = this.filters.globalSearch2.toLowerCase()
        const rowText = row.map((cell) => String(cell).toLowerCase()).join(' ')
        if (!rowText.includes(searchTerm)) {
          return false
        }
      }

      return true
    })
  }

  renderResults() {
    if (!this.results) return ''

    // Apply filters to the rows
    const filteredRows = this.applyFilters(this.results.rows)

    // Recalculate summary for filtered rows
    let filteredSum = 0
    const filteredYearSums: Record<string, number> = {}

    for (const row of filteredRows) {
      const amount = row[2] as number
      filteredSum += amount

      const dateStr = row[1] as string
      const year = dateStr.split('.')[2]

      if (!filteredYearSums[year]) {
        filteredYearSums[year] = 0
      }
      filteredYearSums[year] += amount
    }

    return html`
      <div class="results-section">
        <div class="results-header">
          <div class="section-title">📊 Results</div>
        </div>

        <!-- Summary Box -->
        <div class="summary-box">
          <div class="summary-item">
            <span class="summary-label">Total Entries:</span>
            <span class="summary-value">${filteredRows.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Sum:</span>
            <span class="summary-value"
              >${this.formatCurrency(filteredSum)}</span
            >
          </div>

          ${Object.keys(filteredYearSums).length > 0
            ? html`
                <div style="margin-top: 1rem;">
                  <div class="summary-label" style="margin-bottom: 0.5rem;">
                    Year Breakdown (${Object.keys(filteredYearSums).length}
                    years):
                  </div>
                  <div class="year-sums">
                    ${Object.entries(filteredYearSums)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(
                        ([year, sum]) => html`
                          <div class="year-sum-card">
                            <div class="year-sum-year">${year}</div>
                            <div class="year-sum-value">
                              ${this.formatCurrency(sum)}
                            </div>
                          </div>
                        `,
                      )}
                  </div>
                </div>
              `
            : ''}
        </div>

        <!-- Results Table -->
        ${filteredRows.length > 0
          ? html`
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      ${this.results.headers.map(
                        (header) => html`<th>${header}</th>`,
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredRows.map(
                      (row) => html`
                        <tr>
                          ${row.map((cell) => html`<td>${cell}</td>`)}
                        </tr>
                      `,
                    )}
                  </tbody>
                </table>
              </div>
            `
          : html`
              <div class="no-results">
                No matching entries found with current filters
              </div>
            `}
      </div>
    `
  }

  renderEmptyState() {
    if (this.isLoading) {
      return html`
        <div class="results-section">
          <div class="loading">
            <div class="spinner"></div>
            <span>Analyzing file...</span>
          </div>
        </div>
      `
    }

    return html`
      <div class="results-section">
        <div class="no-results">
          👆 Select a file and click "Analyze" to see results
        </div>
      </div>
    `
  }
}

customElements.define('nh-finder', Finder)
