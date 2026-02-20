import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { scannerPreferencesService } from './docmanager/ScannerPreferencesService.js'

// bring in the commander viewer component and type so we can reuse it here
import type { ViewerFile } from './commander/commander.types.js'
import './commander/dialogs/index.js'

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
  constructor() {
    super()
    this.showDuplex = true
  }

  private messageTimeout: any = null

  @state() private documents: Document[] = []
  @state() private scanners: Scanner[] = []
  @state() private loading = false
  @state() private scanning = false
  @state() private saving = false
  @state() private message = ''
  @state() private scanDirectory = ''
  @state() private fileName = ''
  @state() private selectedScannerId = ''
  @state() private resolution = '300'
  @state() private format = 'pdf'
  @state() private multiPage = true
  @state() private duplex = false
  @state() private showDuplex = false
  @state() private autoSetFileName = false
  @state() private showPreviewDialog = false
  @state() private previewFiles: string[] = []
  @state() private previewDataUrls: string[] = []
  @state() private previewTempDir = ''
  @state() private viewerFile: ViewerFile | null = null

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

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 0;
    }

    .checkbox-group input[type='checkbox'] {
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .checkbox-group label {
      margin: 0;
      cursor: pointer;
      font-weight: 500;
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

    .preview-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .preview-dialog {
      background: white;
      border-radius: 12px;
      width: 90%;
      max-width: 1100px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);
    }

    .preview-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 16px 24px;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
      font-size: 1.1em;
    }

    .preview-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .preview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .preview-item {
      position: relative;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #f8f9fa;
      transition: border-color 0.2s;
    }

    .preview-item:hover {
      border-color: #667eea;
    }

    .preview-item img {
      width: 100%;
      height: 250px;
      object-fit: contain;
      background: white;
      display: block;
    }

    .preview-item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #e0e0e0;
    }

    .preview-item-label {
      font-size: 0.85em;
      color: #555;
      font-weight: 600;
    }

    .preview-delete-btn {
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 10px;
      cursor: pointer;
      font-size: 0.8em;
      font-weight: 600;
      margin: 0;
    }

    .preview-delete-btn:hover {
      background: #c82333;
      transform: none;
      box-shadow: none;
    }

    /* make preview thumbnails clickable for viewing */
    .preview-item {
      cursor: pointer;
    }

    .preview-footer {
      padding: 16px 24px;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    }

    .preview-footer .page-count {
      font-size: 0.95em;
      color: #555;
      font-weight: 600;
    }

    .preview-footer-buttons {
      display: flex;
      gap: 10px;
    }

    .preview-footer button {
      margin: 0;
    }
  `

  connectedCallback() {
    super.connectedCallback()
    this.loadPreferences()
    this.loadDocuments()
    this.loadScanners()

    // Set up IPC listener for scanner page events
    this.setupScannerEventListener()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Clean up IPC listener
    this.removeScannerEventListener()
  }

  private setupScannerEventListener() {
    // Listen for real-time page scan events
    // Note: preload.js strips the event parameter, so we only get data
    ;(window as any).electron?.ipcRenderer?.on?.(
      'scanner-page-scanned',
      (data: {
        pageNumber: number
        fileName: string
        fileSize: number
        filePath: string
        preview: string
      }) => {
        console.log('[DocManager] Received scanner-page-scanned event:', data)

        // Add the page to preview arrays in real-time
        this.previewFiles = [...this.previewFiles, data.filePath]
        this.previewDataUrls = [...this.previewDataUrls, data.preview]

        this.showMessage(
          `Page ${data.pageNumber} scanned (${Math.round(data.fileSize / 1024)} KB)`,
          'success',
        )
      },
    )
  }

  private removeScannerEventListener() {
    ;(window as any).electron?.ipcRenderer?.removeAllListeners?.(
      'scanner-page-scanned',
    )
  }

  /**
   * Load saved preferences from service
   */
  loadPreferences() {
    this.resolution = scannerPreferencesService.getResolution()
    this.format = scannerPreferencesService.getFormat()
    this.multiPage = scannerPreferencesService.getMultiPage()
    this.duplex = scannerPreferencesService.getDuplex()
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

        // Try to restore last used scanner from preferences service
        const lastScannerId = scannerPreferencesService.getLastScannerId()

        if (this.scanners.length > 0 && !this.selectedScannerId) {
          // Check if last used scanner is still available
          if (
            lastScannerId &&
            this.scanners.some((s) => s.id === lastScannerId)
          ) {
            this.selectedScannerId = lastScannerId
            console.log('Restored last used scanner:', lastScannerId)
          } else {
            // Fall back to first scanner
            this.selectedScannerId = this.scanners[0].id || ''
          }
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

  handleResolutionChange(e: any) {
    this.resolution = e.target.value
    scannerPreferencesService.setResolution(this.resolution)
  }

  handleFormatChange(e: any) {
    this.format = e.target.value
    scannerPreferencesService.setFormat(this.format)
  }

  handleMultiPageChange(e: any) {
    this.multiPage = e.target.checked
    scannerPreferencesService.setMultiPage(this.multiPage)
  }

  handleDuplexChange(e: any) {
    this.duplex = e.target.checked
    scannerPreferencesService.setDuplex(this.duplex)
  }

  handleAutoSetFileNameChange(e: any) {
    this.autoSetFileName = e.target.checked
  }

  handleScannerChange(e: any) {
    this.selectedScannerId = e.target.value
    scannerPreferencesService.setLastScannerId(this.selectedScannerId)
  }

  async scanDocument() {
    // Prevent multiple simultaneous scans with a more robust check
    if (this.scanning) {
      console.log('Scan already in progress, ignoring duplicate call')
      return
    }

    // Set scanning flag immediately and synchronously
    this.scanning = true

    try {
      this.previewFiles = []
      this.previewDataUrls = []
      this.previewTempDir = ''
      this.showPreviewDialog = true
      this.showMessage('Scanning... Please wait.', 'info')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'scan-preview',
          scannerId: this.selectedScannerId,
          resolution: this.resolution,
          multiPage: this.multiPage,
          duplex: this.duplex,
          autoSetFileName: this.autoSetFileName,
        },
      )
      const result = response.data || response

      if (result.success) {
        this.previewFiles = result.files || []
        this.previewDataUrls = result.previews || []
        this.previewTempDir = result.tempDir || ''
        this.showMessage(
          `Scanned ${result.pageCount} page(s) - review and remove unwanted pages before saving.`,
          'success',
        )

        scannerPreferencesService.updatePreferences({
          lastScannerId: this.selectedScannerId,
          resolution: this.resolution,
          format: this.format,
          multiPage: this.multiPage,
          duplex: this.duplex,
        })
      } else {
        this.showPreviewDialog = false
        this.showMessage(
          'Scan failed: ' + (result.error || result.message || 'Unknown error'),
          'error',
        )
        if (result.help) {
          this.showMessage(result.help, 'info')
        }
      }
    } catch (error: any) {
      this.showPreviewDialog = false
      this.showMessage('Error during scan: ' + error.message, 'error')
    } finally {
      this.scanning = false
    }
  }

  async scanMorePages() {
    if (this.scanning) return

    this.scanning = true
    // Snapshot the count before scanning; live events will append during the scan,
    // and we need to discard those in favour of the authoritative result.files list.
    const prevCount = this.previewFiles.length
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'scan-preview',
          scannerId: this.selectedScannerId,
          resolution: this.resolution,
          multiPage: this.multiPage,
          duplex: this.duplex,
          autoSetFileName: this.autoSetFileName,
        },
      )
      const result = response.data || response

      if (result.success) {
        // Slice back to pre-scan state then append authoritative result lists,
        // discarding any live-event entries that arrived during the scan.
        this.previewFiles = [
          ...this.previewFiles.slice(0, prevCount),
          ...(result.files || []),
        ]
        this.previewDataUrls = [
          ...this.previewDataUrls.slice(0, prevCount),
          ...(result.previews || []),
        ]
        this.showMessage(
          `Added ${result.pageCount} more page(s) — ${this.previewFiles.length} total.`,
          'success',
        )
      } else {
        this.showMessage(
          'Scan failed: ' + (result.error || result.message || 'Unknown error'),
          'error',
        )
        if (result.help) this.showMessage(result.help, 'info')
      }
    } catch (error: any) {
      this.showMessage('Error scanning more pages: ' + error.message, 'error')
    } finally {
      this.scanning = false
    }
  }

  async removePreviewPage(index: number) {
    const file = this.previewFiles[index]
    if (!file) return

    try {
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'cleanup-scan',
          files: JSON.stringify([file]),
        },
      )
    } catch (e) {
      // Ignore cleanup errors
    }

    this.previewFiles = this.previewFiles.filter((_, i) => i !== index)
    this.previewDataUrls = this.previewDataUrls.filter((_, i) => i !== index)
  }

  /**
   * Show the built‑in commander image viewer for the given preview page
   */
  private openViewer(index: number) {
    const path = this.previewFiles[index] || ''
    const content = this.previewDataUrls[index] || ''
    this.viewerFile = { path, content, size: 0, isImage: true }
  }

  private closeViewer() {
    this.viewerFile = null
  }

  async finalizeScan() {
    if (this.previewFiles.length === 0) {
      this.showMessage('No pages to save.', 'error')
      return
    }

    let statusUpdateInterval: any = null

    try {
      this.scanning = true
      this.saving = true

      // Show detailed status messages
      this.showMessage('📄 Generating PDF from images...', 'info', true)

      // Start a timer to show progress during OCR if enabled
      const ocrMessages = [
        '🔍 OCR scanning page 1...',
        '🔍 Recognizing text... (analyzing page)',
        '🔍 Processing text data...',
        '🔍 Finalizing OCR results...',
      ]
      let messageIndex = 0

      if (this.autoSetFileName) {
        // Add a small delay to show the PDF generation message
        await new Promise((resolve) => setTimeout(resolve, 800))

        // Start rotating through OCR messages
        statusUpdateInterval = setInterval(() => {
          this.showMessage(
            ocrMessages[messageIndex % ocrMessages.length],
            'info',
            true,
          )
          messageIndex++
        }, 2000) // Update message every 2 seconds
      }

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'finalize-scan',
          files: JSON.stringify(this.previewFiles),
          outputPath: this.scanDirectory,
          fileName: this.fileName,
          format: this.format,
          autoSetFileName: this.autoSetFileName,
        },
      )
      const result = response.data || response

      if (result.success) {
        this.showMessage(
          `✅ Document saved successfully! ${result.pageCount} page(s) saved.`,
          'success',
        )
        this.fileName = ''
        this.showPreviewDialog = false
        this.previewFiles = []
        this.previewDataUrls = []
        this.previewTempDir = ''
        await this.loadDocuments()
      } else {
        this.showMessage(
          'Save failed: ' + (result.error || 'Unknown error'),
          'error',
        )
      }
    } catch (error: any) {
      this.showMessage('Error saving document: ' + error.message, 'error')
    } finally {
      // Clear the status update interval
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval)
      }
      this.scanning = false
      this.saving = false
    }
  }

  async cancelPreview() {
    // Kill the active scanner process first
    try {
      await (window as any).electron.ipcRenderer.invoke('cancel-scanner')
    } catch (e) {
      // Ignore
    }

    // Clean up any temp files
    try {
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'scanner',
        {
          action: 'cleanup-scan',
          files: JSON.stringify(this.previewFiles),
          tempDir: this.previewTempDir,
        },
      )
    } catch (e) {
      // Ignore cleanup errors
    }

    this.showPreviewDialog = false
    this.previewFiles = []
    this.previewDataUrls = []
    this.previewTempDir = ''
    this.showMessage('Scan cancelled.', 'info')
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

  showMessage(
    text: string,
    type: 'success' | 'error' | 'info' = 'info',
    keepUntilNextMessage: boolean = false,
  ) {
    // Clear any existing timeout
    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout)
      this.messageTimeout = null
    }

    this.message = text

    // Only auto-clear if not keeping until next message
    if (!keepUntilNextMessage) {
      this.messageTimeout = setTimeout(() => {
        this.message = ''
        this.messageTimeout = null
      }, 5000)
    }
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

        <!-- Scan Controls -->
        <div class="card">
          <h2>🎯 Scan Settings</h2>
          <div class="scan-controls">
            <div class="form-group">
              <label>Select Scanner</label>
              <select @change="${this.handleScannerChange}">
                ${this.scanners.length === 0
                  ? html`<option value="">No scanners found</option>`
                  : this.scanners.map(
                      (scanner) => html`
                        <option
                          value="${scanner.id || ''}"
                          ?selected="${scanner.id === this.selectedScannerId}"
                        >
                          ${scanner.name}
                        </option>
                      `,
                    )}
              </select>
            </div>
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
              <select @change="${this.handleResolutionChange}">
                <option value="150" ?selected="${this.resolution === '150'}">
                  150 DPI
                </option>
                <option value="300" ?selected="${this.resolution === '300'}">
                  300 DPI
                </option>
                <option value="600" ?selected="${this.resolution === '600'}">
                  600 DPI
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Format</label>
              <select @change="${this.handleFormatChange}">
                <option value="pdf" ?selected="${this.format === 'pdf'}">
                  PDF
                </option>
                <option value="png" ?selected="${this.format === 'png'}">
                  PNG
                </option>
                <option value="jpg" ?selected="${this.format === 'jpg'}">
                  JPG
                </option>
              </select>
            </div>
          </div>

          <div style="display: flex; gap: 20px; margin-top: 10px;">
            <div class="checkbox-group">
              <input
                type="checkbox"
                id="multiPage"
                .checked="${this.multiPage}"
                @change="${this.handleMultiPageChange}"
              />
              <label for="multiPage"
                >Scan all pages (ADF - Automatic Document Feeder)</label
              >
            </div>
            ${this.showDuplex
              ? html`<div class="checkbox-group">
                  <input
                    type="checkbox"
                    id="duplex"
                    .checked="${this.duplex}"
                    @change="${this.handleDuplexChange}"
                  />
                  <label for="duplex">Scan both sides (duplex)</label>
                </div>`
              : ''}
            <div class="checkbox-group">
              <input
                type="checkbox"
                id="autoSetFileName"
                .checked="${this.autoSetFileName}"
                @change="${this.handleAutoSetFileNameChange}"
              />
              <label for="autoSetFileName">OCR Scan for first page</label>
            </div>
          </div>

          <div class="button-group">
            <button
              @click="${this.scanDocument}"
              ?disabled="${this.scanning || this.scanners.length === 0}"
              class="secondary"
            >
              ${this.scanning ? '⏳ Scanning...' : '📷 Start Scan'}
            </button>
            <button @click="${this.loadScanners}" ?disabled="${this.loading}">
              🔄 Refresh Scanners
            </button>
            ${this.showPreviewDialog
              ? html`
                  <button @click="${this.cancelPreview}" class="danger">
                    Cancel
                  </button>
                `
              : ''}
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

        ${this.showPreviewDialog ? this.renderPreviewDialog() : ''}
        ${this.viewerFile
          ? html`<viewer-dialog
              .file=${this.viewerFile}
              @close=${this.closeViewer}
            ></viewer-dialog>`
          : ''}
      </div>
    `
  }

  private renderPreviewDialog() {
    const isInitialScanning = this.scanning && this.previewDataUrls.length === 0
    const isScanningWithPages = this.scanning && this.previewDataUrls.length > 0

    return html`
      <div class="preview-overlay">
        <div class="preview-dialog">
          <div class="preview-header">
            <span
              >${this.saving
                ? '⏳ Saving document...'
                : isInitialScanning
                  ? 'Scanning...'
                  : isScanningWithPages
                    ? '📄 Scanning in progress...'
                    : 'Scanned Pages - Review & Remove'}</span
            >
          </div>
          <div class="preview-body">
            ${this.saving
              ? html`
                  <div
                    style="background: #e3f2fd; color: #1565c0; padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;"
                  >
                    <div
                      class="spinner"
                      style="width: 20px; height: 20px; border-width: 3px;"
                    ></div>
                    <span><strong>${this.message}</strong></span>
                  </div>
                `
              : isScanningWithPages
                ? html`
                    <div
                      style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; margin-bottom: 15px; display: flex; align-items: center; gap: 10px;"
                    >
                      <div
                        class="spinner"
                        style="width: 20px; height: 20px; border-width: 3px;"
                      ></div>
                      <span
                        ><strong>Scanning in progress...</strong> Pages will
                        appear here as they're scanned.</span
                      >
                    </div>
                  `
                : ''}
            ${isInitialScanning
              ? html`
                  <div class="loading">
                    <div class="spinner"></div>
                    <span>Scanning documents... Please wait.</span>
                  </div>
                `
              : this.saving
                ? html`
                    <div class="loading">
                      <div class="spinner"></div>
                      <p
                        style="margin-top: 20px; text-align: center; color: #555;"
                      >
                        ${this.message}
                      </p>
                    </div>
                  `
                : this.previewDataUrls.length > 0
                  ? html`
                      <div class="preview-grid">
                        ${this.previewDataUrls.map(
                          (dataUrl, index) => html`
                            <div
                              class="preview-item"
                              @click="${() => this.openViewer(index)}"
                            >
                              <img src="${dataUrl}" alt="Page ${index + 1}" />
                              <div class="preview-item-footer">
                                <span class="preview-item-label"
                                  >Page ${index + 1}</span
                                >
                                <button
                                  class="preview-delete-btn"
                                  @click="${() =>
                                    this.removePreviewPage(index)}"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          `,
                        )}
                      </div>
                    `
                  : html`<div class="empty-state">
                      <p>All pages removed.</p>
                    </div>`}
          </div>
          <div class="preview-footer">
            <span class="page-count"
              >${this.previewDataUrls.length} page(s)</span
            >
            <div class="preview-footer-buttons">
              <button @click="${this.cancelPreview}">Cancel</button>
              <button
                @click="${this.scanMorePages}"
                ?disabled="${this.scanning}"
              >
                ${isScanningWithPages ? 'Scanning...' : 'Scan More'}
              </button>
              <button
                class="secondary"
                @click="${this.finalizeScan}"
                ?disabled="${this.previewFiles.length === 0 || this.scanning}"
              >
                ${this.saving
                  ? 'Saving...'
                  : `Save as ${this.format.toUpperCase()}`}
              </button>
            </div>
          </div>
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
