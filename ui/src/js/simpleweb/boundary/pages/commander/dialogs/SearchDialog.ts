import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

interface SearchResult {
  path: string
  name: string
  isDirectory: boolean
  matchLine?: number
  matchContext?: string
}

@customElement('search-dialog')
export class SearchDialog extends LitElement {
  static styles = css`
    .search-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
    }
    .search-input-row {
      display: flex;
      gap: 0.5rem;
    }
    .search-input {
      flex: 1;
      padding: 0.75rem;
      background: #0f172a;
      border: 2px solid #475569;
      color: #e2e8f0;
      font-size: 1rem;
      border-radius: 4px;
    }
    .search-input:focus {
      outline: none;
      border-color: #0ea5e9;
    }
    .search-options {
      display: flex;
      gap: 1.5rem;
      flex-wrap: wrap;
    }
    .option-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .option-group label {
      color: #cbd5e1;
      font-size: 0.9rem;
      cursor: pointer;
    }
    input[type="checkbox"],
    input[type="radio"] {
      accent-color: #0ea5e9;
      width: 1rem;
      height: 1rem;
      cursor: pointer;
    }
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 0.9rem;
    }
    .btn-search {
      background: #0ea5e9;
      color: #fff;
    }
    .btn-search:hover {
      background: #0284c7;
    }
    .btn-search:disabled {
      background: #475569;
      cursor: not-allowed;
    }
    .results-container {
      max-height: 400px;
      overflow-y: auto;
      border: 1px solid #475569;
      border-radius: 4px;
      background: #0f172a;
    }
    .results-header {
      padding: 0.75rem;
      background: #1e293b;
      border-bottom: 1px solid #475569;
      color: #94a3b8;
      font-size: 0.85rem;
      display: flex;
      justify-content: space-between;
    }
    .result-item {
      padding: 0.75rem;
      border-bottom: 1px solid #334155;
      cursor: pointer;
      transition: background-color 0.15s;
    }
    .result-item:hover {
      background: #1e293b;
    }
    .result-item.focused {
      background: #0ea5e9;
    }
    .result-item:last-child {
      border-bottom: none;
    }
    .result-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #f1f5f9;
      font-weight: 500;
    }
    .result-path {
      color: #64748b;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .result-context {
      color: #94a3b8;
      font-size: 0.8rem;
      margin-top: 0.25rem;
      font-family: monospace;
      background: #1e293b;
      padding: 0.25rem 0.5rem;
      border-radius: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .line-number {
      color: #0ea5e9;
      font-size: 0.75rem;
    }
    .no-results {
      padding: 2rem;
      text-align: center;
      color: #64748b;
    }
    .searching {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      color: #94a3b8;
    }
    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #475569;
      border-top-color: #0ea5e9;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .search-path {
      color: #64748b;
      font-size: 0.85rem;
      padding: 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dialog-buttons {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      justify-content: flex-end;
    }
    .btn-cancel {
      background: #475569;
      color: #fff;
    }
    .btn-cancel:hover {
      background: #64748b;
    }
  `

  @property({ type: String }) searchPath = ''
  @property({ type: Boolean }) searching = false

  @state() private filenamePattern = '*.*'
  @state() private contentText = ''
  @state() private recursive = true
  @state() private caseSensitive = false
  @state() private results: SearchResult[] = []
  @state() private filesScanned = 0
  @state() private currentFile = ''
  @state() private hasSearched = false
  @state() private truncated = false
  @state() private focusedIndex = -1

  private boundWindowKeyDown = this.handleWindowKeyDown.bind(this)

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.boundWindowKeyDown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.boundWindowKeyDown)
  }

  private handleWindowKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (this.searching) {
        this.cancelSearch()
      } else {
        this.close()
      }
      return
    }

    // Arrow key navigation in results
    if (this.results.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.focusedIndex = Math.min(this.focusedIndex + 1, this.results.length - 1)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.focusedIndex = Math.max(this.focusedIndex - 1, -1)
      } else if (e.key === 'Enter' && this.focusedIndex >= 0) {
        e.preventDefault()
        this.selectResult(this.results[this.focusedIndex])
      }
    }
  }

  updateProgress(data: { filesScanned: number; currentFile: string }) {
    this.filesScanned = data.filesScanned
    this.currentFile = data.currentFile
  }

  setResults(data: {
    results: SearchResult[]
    filesScanned: number
    truncated: boolean
  }) {
    this.results = data.results
    this.filesScanned = data.filesScanned
    this.truncated = data.truncated
    this.hasSearched = true
    this.focusedIndex = -1
  }

  private handleSearch() {
    if (!this.filenamePattern.trim()) return

    this.dispatchEvent(
      new CustomEvent('search', {
        detail: {
          filenamePattern: this.filenamePattern.trim(),
          contentText: this.contentText.trim(),
          recursive: this.recursive,
          caseSensitive: this.caseSensitive,
        },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private cancelSearch() {
    this.dispatchEvent(new CustomEvent('cancel-search'))
  }

  private selectResult(result: SearchResult) {
    this.dispatchEvent(
      new CustomEvent('select-result', {
        detail: result,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  private handleInputKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !this.searching) {
      e.preventDefault()
      this.handleSearch()
    }
  }

  render() {
    return html`
      <simple-dialog
        .open=${true}
        .title=${'🔍 Find Files'}
        .width=${'700px'}
        .maxHeight=${'80vh'}
        @dialog-close=${this.close}
      >
        <div class="search-container">
          <div class="search-path" title="${this.searchPath}">
            Search in: ${this.searchPath}
          </div>

          <!-- Filename Pattern Section -->
          <div style="margin-bottom: 0.5rem;">
            <label style="color: #94a3b8; font-size: 0.85rem; display: block; margin-bottom: 0.25rem;">
              Filename pattern (use * and ? wildcards)
            </label>
            <input
              class="search-input"
              type="text"
              placeholder="*.txt, *.ts, report*.pdf..."
              .value=${this.filenamePattern}
              @input=${(e: Event) => this.filenamePattern = (e.target as HTMLInputElement).value}
              @keydown=${this.handleInputKeyDown}
              ?disabled=${this.searching}
              autofocus
            />
          </div>

          <!-- Content Search Section -->
          <div style="margin-bottom: 0.5rem;">
            <label style="color: #94a3b8; font-size: 0.85rem; display: block; margin-bottom: 0.25rem;">
              Search text in files (optional)
            </label>
            <div class="search-input-row">
              <input
                class="search-input"
                type="text"
                placeholder="Leave empty to find files by name only..."
                .value=${this.contentText}
                @input=${(e: Event) => this.contentText = (e.target as HTMLInputElement).value}
                @keydown=${this.handleInputKeyDown}
                ?disabled=${this.searching}
              />
              <button
                class="btn btn-search"
                @click=${this.handleSearch}
                ?disabled=${this.searching || !this.filenamePattern.trim()}
              >
                ${this.searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          <div class="search-options">
            <div class="option-group">
              <input
                type="checkbox"
                id="recursive"
                ?checked=${this.recursive}
                @change=${(e: Event) => this.recursive = (e.target as HTMLInputElement).checked}
                ?disabled=${this.searching}
              />
              <label for="recursive">Recursive</label>
            </div>
            <div class="option-group">
              <input
                type="checkbox"
                id="case-sensitive"
                ?checked=${this.caseSensitive}
                @change=${(e: Event) => this.caseSensitive = (e.target as HTMLInputElement).checked}
                ?disabled=${this.searching}
              />
              <label for="case-sensitive">Case sensitive</label>
            </div>
          </div>

          <div class="results-container">
            ${this.searching
              ? html`
                  <div class="searching">
                    <div class="spinner"></div>
                    <span>Scanning files... ${this.filesScanned.toLocaleString()} files</span>
                  </div>
                  ${this.currentFile
                    ? html`<div style="text-align: center; color: #64748b; font-size: 0.8rem; padding-bottom: 1rem;">${this.currentFile}</div>`
                    : ''}
                `
              : this.hasSearched
                ? html`
                    <div class="results-header">
                      <span>${this.results.length} result${this.results.length !== 1 ? 's' : ''} found</span>
                      <span>${this.filesScanned.toLocaleString()} files scanned${this.truncated ? ' (max results reached)' : ''}</span>
                    </div>
                    ${this.results.length > 0
                      ? this.results.map((result, index) => html`
                          <div
                            class="result-item ${index === this.focusedIndex ? 'focused' : ''}"
                            @click=${() => this.selectResult(result)}
                          >
                            <div class="result-name">
                              <span>${result.isDirectory ? '📁' : '📄'}</span>
                              <span>${result.name}</span>
                              ${result.matchLine ? html`<span class="line-number">Line ${result.matchLine}</span>` : ''}
                            </div>
                            <div class="result-path" title="${result.path}">${result.path}</div>
                            ${result.matchContext
                              ? html`<div class="result-context" title="${result.matchContext}">${result.matchContext}</div>`
                              : ''}
                          </div>
                        `)
                      : html`<div class="no-results">No files found matching your search</div>`}
                  `
                : html`<div class="no-results">Enter a search term and click Search</div>`}
          </div>
        </div>

        <div slot="footer" class="dialog-buttons">
          <button class="btn btn-cancel" @click=${this.searching ? this.cancelSearch : this.close}>
            ${this.searching ? 'Cancel (ESC)' : 'Close (ESC)'}
          </button>
        </div>
      </simple-dialog>
    `
  }
}
