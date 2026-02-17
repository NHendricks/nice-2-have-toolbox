import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

interface Document {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
}

interface Scanner {
  id?: string
  name: string
  type?: string
  manufacturer?: string
  description?: string
  note?: string
}

@customElement('nh-docmanager')
export class DocManager extends LitElement {
  @state() private documents: Document[] = []
  @state() private scanners: Scanner[] = []
  @state() private loading = false
  @state() private scanning = false
  @state() private message = ''
  @state() private scanDirectory = ''
  @state() private fileName = ''
  @state() private selectedScannerId = ''
  @state() private resolution = '300'
  @state() private colorMode = 'color'
  @state() private format = 'pdf'

  static styles = css`
    :host {
      display: block;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: white;
      margin-bottom: 10px;
      font-size: 2.5em;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    }

    .subtitle {
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 30px;
      font-size: 1.2em;
    }

    .card {
      background: white;
      border-radius: 12px;
      padding: 25px;
      margin-bottom: 25px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      transition:
        transform 0.2s,
        box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
    }

    .card h2 {
      margin-top: 0;
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .scan-controls {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    label {
      font-weight: 600;
      margin-bottom: 5px;
      color: #555;
      font-size: 0.9em;
    }

    input,
    select {
      padding: 10px;
      border: 2px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      transition: border-color 0.3s;
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: #667eea;
    }

    button {
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 600;
      transition:
        transform 0.2s,
        box-shadow 0.2s;
      margin-right: 10px;
      margin-top: 10px;
    }

    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    button:active {
      transform: translateY(0);
    }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      transform: none;
    }

    button.secondary {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    button.danger {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }

    .message {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 15px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .message.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .documents-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 15px;
      margin-top: 20px;
    }

    .document-item {
      background: #f8f9fa;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      padding: 15px;
      transition: all 0.2s;
    }

    .document-item:hover {
      border-color: #667eea;
      background: #f0f2ff;
      transform: translateY(-2px);
    }

    .document-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      word-break: break-all;
    }

    .document-info {
      font-size: 0.85em;
      color: #666;
      margin-bottom: 5px;
    }

    .document-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .document-actions button {
      padding: 6px 12px;
      font-size: 12px;
      margin: 0;
    }

    .scanner-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .scanner-item {
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }

    .scanner-name {
      font-weight: 600;
      color: #333;
    }

    .scanner-info {
      font-size: 0.9em;
      color: #666;
      margin-top: 5px;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #667eea;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin-right: 15px;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .empty-state-icon {
      font-size: 4em;
      margin-bottom: 15px;
      opacity: 0.5;
    }

    .button-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this.loadDocuments()
    this.loadScanners()
  }

  async loadScanners() {
    try {
      this.loading = true
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        { action: 'list-scanners' },
      )
      const result = response.data || response

      if (result.success) {
        this.scanners = result.scanners || []
        // Auto-select first scanner if available
        if (this.scanners.length > 0 && !this.selectedScannerId) {
          this.selectedScannerId = this.scanners[0].id || ''
        }
        if (result.message) {
          this.showMessage(result.message, 'info')
        }
      } else {
        this.showMessage(
          'Failed to load scanners: ' + (result.error || 'Unknown error'),
          'error',
        )
      }
    } catch (error: any) {
      this.showMessage('Error loading scanners: ' + error.message, 'error')
    } finally {
      this.loading = false
    }
  }

  async loadDocuments() {
    try {
      this.loading = true
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        { action: 'list-documents', outputPath: this.scanDirectory },
      )
      const result = response.data || response

      if (result.success) {
        this.documents = result.documents || []
        if (!this.scanDirectory && result.directory) {
          this.scanDirectory = result.directory
        }
      } else {
        this.showMessage(
          'Failed to load documents: ' + (result.error || 'Unknown error'),
          'error',
        )
      }
    } catch (error: any) {
      this.showMessage('Error loading documents: ' + error.message, 'error')
    } finally {
      this.loading = false
    }
  }

  async scanDocument() {
    if (this.scanning) return

    try {
      this.scanning = true
      this.showMessage('Starting scan... Please wait.', 'info')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'scan',
          outputPath: this.scanDirectory,
          fileName: this.fileName,
          scannerId: this.selectedScannerId,
          resolution: this.resolution,
          colorMode: this.colorMode,
          format: this.format,
        },
      )
      const result = response.data || response

      if (result.success) {
        this.showMessage(
          'Document scanned successfully! ' + result.message,
          'success',
        )
        this.fileName = '' // Reset filename
        await this.loadDocuments() // Refresh document list
      } else {
        this.showMessage(
          'Scan failed: ' + (result.error || result.message || 'Unknown error'),
          'error',
        )
        if (result.help) {
          this.showMessage(result.help, 'info')
        }
      }
    } catch (error: any) {
      this.showMessage('Error during scan: ' + error.message, 'error')
    } finally {
      this.scanning = false
    }
  }

  async openDocument(doc: Document) {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'open-document',
          outputPath: this.scanDirectory,
          fileName: doc.name,
        },
      )
      const result = response.data || response

      if (!result.success) {
        this.showMessage(
          'Failed to open document: ' + (result.error || 'Unknown error'),
          'error',
        )
      }
    } catch (error: any) {
      this.showMessage('Error opening document: ' + error.message, 'error')
    }
  }

  async deleteDocument(doc: Document) {
    if (!confirm(`Are you sure you want to delete "${doc.name}"?`)) {
      return
    }

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'delete-document',
          outputPath: this.scanDirectory,
          fileName: doc.name,
        },
      )
      const result = response.data || response

      if (result.success) {
        this.showMessage('Document deleted successfully', 'success')
        await this.loadDocuments()
      } else {
        this.showMessage(
          'Failed to delete document: ' + (result.error || 'Unknown error'),
          'error',
        )
      }
    } catch (error: any) {
      this.showMessage('Error deleting document: ' + error.message, 'error')
    }
  }

  showMessage(text: string, type: 'success' | 'error' | 'info' = 'info') {
    this.message = text
    setTimeout(() => {
      this.message = ''
    }, 5000)
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  render() {
    return html`
      <div class="container">
        <h1>📄 DocManager</h1>
        <p class="subtitle">Scan, manage and organize your documents</p>

        ${this.message
          ? html`
              <div
                class="message ${this.message.includes('success')
                  ? 'success'
                  : this.message.includes('Error') ||
                      this.message.includes('Failed') ||
                      this.message.includes('failed')
                    ? 'error'
                    : 'info'}"
              >
                ${this.message}
              </div>
            `
          : ''}

        <!-- Scanner Information -->
        <div class="card">
          <h2>🖨️ Available Scanners</h2>
          ${this.loading
            ? html`
                <div class="loading">
                  <div class="spinner"></div>
                  <span>Loading scanners...</span>
                </div>
              `
            : this.scanners.length > 0
              ? html`
                  <div class="scanner-list">
                    ${this.scanners.map(
                      (scanner) => html`
                        <div class="scanner-item">
                          <div class="scanner-name">
                            ${scanner.name}
                            ${scanner.manufacturer
                              ? html` <span style="color: #999"
                                  >(${scanner.manufacturer})</span
                                >`
                              : ''}
                          </div>
                          ${scanner.description
                            ? html`<div class="scanner-info">
                                ${scanner.description}
                              </div>`
                            : ''}
                          ${scanner.note
                            ? html`<div class="scanner-info">
                                ${scanner.note}
                              </div>`
                            : ''}
                        </div>
                      `,
                    )}
                  </div>
                `
              : html`
                  <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <p>
                      No scanners detected. Make sure your scanner is connected
                      and drivers are installed.
                    </p>
                  </div>
                `}
          <div class="button-group">
            <button @click="${this.loadScanners}" ?disabled="${this.loading}">
              🔄 Refresh Scanners
            </button>
          </div>
        </div>

        <!-- Scan Controls -->
        <div class="card">
          <h2>🎯 Scan Settings</h2>
          <div class="scan-controls">
            ${this.scanners.length > 1
              ? html`
                  <div class="form-group">
                    <label>Select Scanner</label>
                    <select
                      .value="${this.selectedScannerId}"
                      @change="${(e: any) =>
                        (this.selectedScannerId = e.target.value)}"
                    >
                      ${this.scanners.map(
                        (scanner) => html`
                          <option value="${scanner.id || ''}">
                            ${scanner.name}
                          </option>
                        `,
                      )}
                    </select>
                  </div>
                `
              : ''}
            <div class="form-group">
              <label>Scan Directory</label>
              <input
                type="text"
                .value="${this.scanDirectory}"
                @input="${(e: any) => (this.scanDirectory = e.target.value)}"
                placeholder="Leave empty for default (Documents/Scans)"
              />
            </div>
            <div class="form-group">
              <label>File Name (optional)</label>
              <input
                type="text"
                .value="${this.fileName}"
                @input="${(e: any) => (this.fileName = e.target.value)}"
                placeholder="Auto-generated if empty"
              />
            </div>
            <div class="form-group">
              <label>Resolution (DPI)</label>
              <select
                .value="${this.resolution}"
                @change="${(e: any) => (this.resolution = e.target.value)}"
              >
                <option value="150">150 DPI</option>
                <option value="300">300 DPI</option>
                <option value="600">600 DPI</option>
              </select>
            </div>
            <div class="form-group">
              <label>Color Mode</label>
              <select
                .value="${this.colorMode}"
                @change="${(e: any) => (this.colorMode = e.target.value)}"
              >
                <option value="color">Color</option>
                <option value="grayscale">Grayscale</option>
                <option value="lineart">Black & White</option>
              </select>
            </div>
            <div class="form-group">
              <label>Format</label>
              <select
                .value="${this.format}"
                @change="${(e: any) => (this.format = e.target.value)}"
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>
          </div>
          <div class="button-group">
            <button
              @click="${this.scanDocument}"
              ?disabled="${this.scanning}"
              class="secondary"
            >
              ${this.scanning ? '⏳ Scanning...' : '📷 Start Scan'}
            </button>
          </div>
        </div>

        <!-- Document List -->
        <div class="card">
          <h2>📚 Scanned Documents (${this.documents.length})</h2>
          <div class="button-group">
            <button @click="${this.loadDocuments}" ?disabled="${this.loading}">
              🔄 Refresh Documents
            </button>
          </div>

          ${this.documents.length > 0
            ? html`
                <div class="documents-grid">
                  ${this.documents.map(
                    (doc) => html`
                      <div class="document-item">
                        <div class="document-name">📄 ${doc.name}</div>
                        <div class="document-info">
                          Size: ${this.formatBytes(doc.size)}
                        </div>
                        <div class="document-info">
                          Modified: ${this.formatDate(doc.modified)}
                        </div>
                        <div class="document-actions">
                          <button @click="${() => this.openDocument(doc)}">
                            👁️ Open
                          </button>
                          <button
                            @click="${() => this.deleteDocument(doc)}"
                            class="danger"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    `,
                  )}
                </div>
              `
            : html`
                <div class="empty-state">
                  <div class="empty-state-icon">📭</div>
                  <p>
                    No documents scanned yet. Start scanning to see your
                    documents here.
                  </p>
                </div>
              `}
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nh-docmanager': DocManager
  }
}
