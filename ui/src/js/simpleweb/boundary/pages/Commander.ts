import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../navigation/ResponsiveMenu'

interface FileItem {
  name: string
  path: string
  size: number
  created: Date
  modified: Date
  isDirectory: boolean
  isFile: boolean
}

interface PaneState {
  currentPath: string
  items: FileItem[]
  selectedIndices: Set<number>
  focusedIndex: number
}

export class Commander extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Courier New', monospace;
      color: #fff;
      background: #000;
      width: 100%;
      height: 100%;
      overflow: hidden;
      box-sizing: border-box;
    }

    .commander-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    .toolbar {
      background: #1e293b;
      padding: 0.5rem 1rem;
      border-bottom: 2px solid #334155;
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .toolbar-title {
      font-weight: bold;
      color: #fbbf24;
      font-size: 1.1rem;
    }

    .panes-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px;
      background: #334155;
      flex: 1;
      overflow: hidden;
    }

    .pane {
      background: #0f172a;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .pane.active {
      background: #1e293b;
    }

    .pane-header {
      background: #475569;
      padding: 0.5rem 1rem;
      font-weight: bold;
      color: #fbbf24;
      border-bottom: 1px solid #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pane.active .pane-header {
      background: #0ea5e9;
      color: #fff;
    }

    .path-display {
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .item-count {
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .file-list {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.5rem;
    }

    .file-item {
      padding: 0.4rem 0.8rem;
      cursor: pointer;
      display: grid;
      grid-template-columns: 20px 1fr auto;
      gap: 0.8rem;
      align-items: center;
      border-radius: 4px;
      white-space: nowrap;
    }

    .file-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .file-item.focused {
      background: #475569;
      outline: 2px solid #0ea5e9;
    }

    .file-item.selected {
      background: #fbbf24;
      color: #000;
    }

    .file-item.selected.focused {
      background: #f59e0b;
      color: #000;
    }

    .file-icon {
      font-size: 1rem;
    }

    .file-name {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-name.directory {
      color: #fbbf24;
      font-weight: bold;
    }

    .file-size {
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: right;
    }

    .function-bar {
      background: #1e293b;
      border-top: 2px solid #334155;
      padding: 0.5rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .function-key {
      flex: 1;
      min-width: 120px;
      background: #475569;
      border: 1px solid #64748b;
      padding: 0.5rem;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .function-key:hover {
      background: #0ea5e9;
      transform: translateY(-2px);
    }

    .function-key-label {
      display: block;
      font-size: 0.75rem;
      color: #94a3b8;
      margin-bottom: 0.2rem;
    }

    .function-key-action {
      display: block;
      font-size: 0.9rem;
      font-weight: bold;
      color: #fff;
    }

    .status-bar {
      background: #334155;
      padding: 0.5rem 1rem;
      border-top: 1px solid #475569;
      font-size: 0.85rem;
      color: #cbd5e1;
    }

    .status-bar.success {
      background: #059669;
    }

    .status-bar.error {
      background: #dc2626;
    }

    /* File Viewer Dialog */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #1e293b;
      border: 2px solid #0ea5e9;
      border-radius: 8px;
      width: 90%;
      height: 80%;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .dialog-header {
      background: #0ea5e9;
      padding: 1rem;
      font-weight: bold;
      color: #fff;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-title {
      font-size: 1.1rem;
    }

    .dialog-close {
      background: #dc2626;
      border: none;
      color: #fff;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }

    .dialog-close:hover {
      background: #b91c1c;
    }

    .dialog-content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
      background: #0f172a;
      color: #e2e8f0;
      font-family: 'Courier New', monospace;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .dialog-footer {
      background: #334155;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* Copy/Move Dialog */
    .input-dialog {
      width: 600px;
      height: auto;
    }

    .input-field {
      margin: 1rem;
    }

    .input-field label {
      display: block;
      margin-bottom: 0.5rem;
      color: #cbd5e1;
    }

    .input-field input {
      width: 100%;
      padding: 0.75rem;
      background: #0f172a;
      border: 2px solid #475569;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      border-radius: 4px;
    }

    .input-field input:focus {
      outline: none;
      border-color: #0ea5e9;
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

    @media (max-width: 1024px) {
      .panes-container {
        grid-template-columns: 1fr;
      }
    }
  `

  @property({ type: Object })
  leftPane: PaneState = {
    currentPath: 'd:\\',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
  }

  @property({ type: Object })
  rightPane: PaneState = {
    currentPath: 'd:\\',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
  }

  @property({ type: String })
  activePane: 'left' | 'right' = 'left'

  @property({ type: String })
  statusMessage = 'Bereit'

  @property({ type: String })
  statusType: 'normal' | 'success' | 'error' = 'normal'

  @property({ type: Object })
  viewerFile: { path: string; content: string; size: number } | null = null

  @property({ type: Object })
  operationDialog: {
    type: 'copy' | 'move'
    files: string[]
    destination: string
  } | null = null

  async connectedCallback() {
    super.connectedCallback()
    // Load initial directories
    await this.loadDirectory('left', this.leftPane.currentPath)
    await this.loadDirectory('right', this.rightPane.currentPath)

    // Add global keyboard listeners
    window.addEventListener('keydown', this.handleGlobalKeydown.bind(this))
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('keydown', this.handleGlobalKeydown.bind(this))
  }

  async loadDirectory(pane: 'left' | 'right', path: string) {
    try {
      this.setStatus('Lade Verzeichnis...', 'normal')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'list',
          folderPath: path,
        },
      )

      if (response.success && response.data) {
        const data = response.data
        const items: FileItem[] = []

        // Add parent directory entry if not at root
        if (path !== 'd:\\' && path !== '/') {
          items.push({
            name: '..',
            path: this.getParentPath(path),
            size: 0,
            created: new Date(),
            modified: new Date(),
            isDirectory: true,
            isFile: false,
          })
        }

        // Add directories first, then files
        items.push(...data.directories)
        items.push(...data.files)

        if (pane === 'left') {
          this.leftPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: 0,
          }
        } else {
          this.rightPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: 0,
          }
        }

        this.setStatus(
          `${data.summary.totalDirectories} Ordner, ${data.summary.totalFiles} Dateien`,
          'success',
        )
      } else {
        this.setStatus(`Fehler: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Fehler: ${error.message}`, 'error')
    }
  }

  getParentPath(currentPath: string): string {
    const normalized = currentPath.replace(/\\/g, '/')
    const parts = normalized.split('/').filter((p) => p)
    if (parts.length <= 1) return 'd:\\'
    parts.pop()
    return parts.join('\\') || 'd:\\'
  }

  setStatus(message: string, type: 'normal' | 'success' | 'error') {
    this.statusMessage = message
    this.statusType = type

    if (type !== 'normal') {
      setTimeout(() => {
        this.statusMessage = 'Bereit'
        this.statusType = 'normal'
      }, 3000)
    }
  }

  getActivePane(): PaneState {
    return this.activePane === 'left' ? this.leftPane : this.rightPane
  }

  getInactivePane(): PaneState {
    return this.activePane === 'left' ? this.rightPane : this.leftPane
  }

  updateActivePane(updates: Partial<PaneState>) {
    if (this.activePane === 'left') {
      this.leftPane = { ...this.leftPane, ...updates }
    } else {
      this.rightPane = { ...this.rightPane, ...updates }
    }
  }

  handlePaneClick(pane: 'left' | 'right') {
    this.activePane = pane
  }

  handleItemClick(index: number, event: MouseEvent) {
    const pane = this.getActivePane()

    if (event.ctrlKey) {
      // Toggle selection
      const newSelected = new Set(pane.selectedIndices)
      if (newSelected.has(index)) {
        newSelected.delete(index)
      } else {
        newSelected.add(index)
      }
      this.updateActivePane({
        selectedIndices: newSelected,
        focusedIndex: index,
      })
    } else {
      // Just set focus, don't navigate
      this.updateActivePane({
        selectedIndices: new Set(),
        focusedIndex: index,
      })
    }
  }

  async handleItemDoubleClick(index: number) {
    const pane = this.getActivePane()
    const item = pane.items[index]

    if (item.isDirectory) {
      await this.navigateToDirectory(item.path)
    } else {
      await this.viewFile(item.path)
    }
  }

  async navigateToDirectory(path: string) {
    await this.loadDirectory(this.activePane, path)
  }

  async viewFile(filePath: string) {
    try {
      this.setStatus('Lade Datei...', 'normal')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'read',
          filePath: filePath,
        },
      )

      if (response.success && response.data) {
        this.viewerFile = {
          path: response.data.path,
          content: response.data.content,
          size: response.data.size,
        }
        this.setStatus('Datei geladen', 'success')
      } else {
        this.setStatus(`Fehler: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Fehler: ${error.message}`, 'error')
    }
  }

  closeViewer() {
    this.viewerFile = null
  }

  handleGlobalKeydown(event: KeyboardEvent) {
    // Ignore if typing in an input field
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const pane = this.getActivePane()

    switch (event.key) {
      case 'F3':
        event.preventDefault()
        this.handleF3()
        break

      case 'F5':
        event.preventDefault()
        this.handleF5()
        break

      case 'F6':
        event.preventDefault()
        this.handleF6()
        break

      case 'Enter':
        event.preventDefault()
        this.handleEnter()
        break

      case 'ArrowUp':
        event.preventDefault()
        this.moveFocus(-1, event.ctrlKey)
        break

      case 'ArrowDown':
        event.preventDefault()
        this.moveFocus(1, event.ctrlKey)
        break

      case 'Tab':
        event.preventDefault()
        this.activePane = this.activePane === 'left' ? 'right' : 'left'
        break

      case ' ':
        if (event.ctrlKey) {
          event.preventDefault()
          this.toggleSelection()
        }
        break
    }
  }

  handleF3() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]
    if (item && item.isFile) {
      this.viewFile(item.path)
    }
  }

  handleF5() {
    const selectedFiles = this.getSelectedFiles()
    if (selectedFiles.length > 0) {
      const destPane = this.getInactivePane()
      this.operationDialog = {
        type: 'copy',
        files: selectedFiles,
        destination: destPane.currentPath,
      }
    } else {
      this.setStatus('Keine Dateien ausgewählt', 'error')
    }
  }

  handleF6() {
    const selectedFiles = this.getSelectedFiles()
    if (selectedFiles.length > 0) {
      const destPane = this.getInactivePane()
      this.operationDialog = {
        type: 'move',
        files: selectedFiles,
        destination: destPane.currentPath,
      }
    } else {
      this.setStatus('Keine Dateien ausgewählt', 'error')
    }
  }

  handleEnter() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]
    if (item && item.isDirectory) {
      this.navigateToDirectory(item.path)
    }
  }

  moveFocus(delta: number, withSelection: boolean) {
    const pane = this.getActivePane()
    const newIndex = Math.max(
      0,
      Math.min(pane.items.length - 1, pane.focusedIndex + delta),
    )

    const newSelected = new Set(pane.selectedIndices)
    if (withSelection) {
      // Toggle the new focused item
      if (newSelected.has(newIndex)) {
        newSelected.delete(newIndex)
      } else {
        newSelected.add(newIndex)
      }
    }

    this.updateActivePane({
      focusedIndex: newIndex,
      selectedIndices: newSelected,
    })

    // Scroll into view
    this.scrollItemIntoView(newIndex)
  }

  toggleSelection() {
    const pane = this.getActivePane()
    const newSelected = new Set(pane.selectedIndices)

    if (newSelected.has(pane.focusedIndex)) {
      newSelected.delete(pane.focusedIndex)
    } else {
      newSelected.add(pane.focusedIndex)
    }

    this.updateActivePane({ selectedIndices: newSelected })
  }

  scrollItemIntoView(index: number) {
    setTimeout(() => {
      const paneElement = this.shadowRoot?.querySelector(
        `.pane.active .file-list`,
      )
      const itemElement = paneElement?.querySelectorAll('.file-item')[index]
      if (itemElement) {
        itemElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }, 0)
  }

  getSelectedFiles(): string[] {
    const pane = this.getActivePane()
    const files: string[] = []

    if (pane.selectedIndices.size > 0) {
      pane.selectedIndices.forEach((index) => {
        const item = pane.items[index]
        if (item && item.isFile) {
          files.push(item.path)
        }
      })
    } else {
      // If nothing selected, use focused item
      const item = pane.items[pane.focusedIndex]
      if (item && item.isFile) {
        files.push(item.path)
      }
    }

    return files
  }

  updateDestination(value: string) {
    if (this.operationDialog) {
      this.operationDialog = {
        ...this.operationDialog,
        destination: value,
      }
    }
  }

  async executeOperation() {
    if (!this.operationDialog) return

    const { type, files, destination } = this.operationDialog

    try {
      this.setStatus(
        `${type === 'copy' ? 'Kopiere' : 'Verschiebe'} ${files.length} Datei(en)...`,
        'normal',
      )

      let successCount = 0
      for (const file of files) {
        const fileName = file.split(/[/\\]/).pop() || 'file'
        const destPath = destination + '\\' + fileName

        const response = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: type,
            sourcePath: file,
            destinationPath: destPath,
          },
        )

        if (response.success) {
          successCount++
        } else {
          this.setStatus(`Fehler bei ${fileName}: ${response.error}`, 'error')
          break
        }
      }

      if (successCount === files.length) {
        this.setStatus(
          `${successCount} Datei(en) erfolgreich ${type === 'copy' ? 'kopiert' : 'verschoben'}`,
          'success',
        )

        // Refresh both panes
        await this.loadDirectory(
          this.activePane,
          this.getActivePane().currentPath,
        )
        await this.loadDirectory(
          this.activePane === 'left' ? 'right' : 'left',
          this.getInactivePane().currentPath,
        )
      }

      this.operationDialog = null
    } catch (error: any) {
      this.setStatus(`Fehler: ${error.message}`, 'error')
    }
  }

  cancelOperation() {
    this.operationDialog = null
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return ''
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  render() {
    return html`
      <div class="commander-container">
        <div class="toolbar">
          <span class="toolbar-title">📁 File Commander</span>
        </div>

        <div class="panes-container">
          ${this.renderPane('left', this.leftPane)}
          ${this.renderPane('right', this.rightPane)}
        </div>

        <div class="function-bar">
          <div class="function-key" @click=${() => this.handleF3()}>
            <span class="function-key-label">F3</span>
            <span class="function-key-action">Ansehen</span>
          </div>
          <div class="function-key" @click=${() => this.handleF5()}>
            <span class="function-key-label">F5</span>
            <span class="function-key-action">Kopieren</span>
          </div>
          <div class="function-key" @click=${() => this.handleF6()}>
            <span class="function-key-label">F6</span>
            <span class="function-key-action">Verschieben</span>
          </div>
          <div
            class="function-key"
            @click=${() =>
              this.loadDirectory(
                this.activePane,
                this.getActivePane().currentPath,
              )}
          >
            <span class="function-key-label">F7</span>
            <span class="function-key-action">Aktualisieren</span>
          </div>
        </div>

        <div class="status-bar ${this.statusType}">${this.statusMessage}</div>

        ${this.viewerFile ? this.renderViewer() : ''}
        ${this.operationDialog ? this.renderOperationDialog() : ''}
      </div>
    `
  }

  renderPane(side: 'left' | 'right', pane: PaneState) {
    const isActive = this.activePane === side

    return html`
      <div
        class="pane ${isActive ? 'active' : ''}"
        @click=${() => this.handlePaneClick(side)}
      >
        <div class="pane-header">
          <span class="path-display">${pane.currentPath}</span>
          <span class="item-count">${pane.items.length} Items</span>
        </div>
        <div class="file-list">
          ${pane.items.map(
            (item, index) => html`
              <div
                class="file-item ${pane.focusedIndex === index
                  ? 'focused'
                  : ''} ${pane.selectedIndices.has(index) ? 'selected' : ''}"
                @click=${(e: MouseEvent) => this.handleItemClick(index, e)}
                @dblclick=${() => this.handleItemDoubleClick(index)}
              >
                <span class="file-icon">${item.isDirectory ? '📁' : '📄'}</span>
                <span class="file-name ${item.isDirectory ? 'directory' : ''}"
                  >${item.name}</span
                >
                <span class="file-size">${this.formatFileSize(item.size)}</span>
              </div>
            `,
          )}
        </div>
      </div>
    `
  }

  renderViewer() {
    if (!this.viewerFile) return ''

    return html`
      <div class="dialog-overlay" @click=${this.closeViewer}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-header">
            <span class="dialog-title">📄 ${this.viewerFile.path}</span>
            <button class="dialog-close" @click=${this.closeViewer}>
              ESC - Schließen
            </button>
          </div>
          <div class="dialog-content">${this.viewerFile.content}</div>
          <div class="dialog-footer">
            Größe: ${this.formatFileSize(this.viewerFile.size)} | Drücke ESC zum
            Schließen
          </div>
        </div>
      </div>
    `
  }

  renderOperationDialog() {
    if (!this.operationDialog) return ''

    const { type, files, destination } = this.operationDialog
    const operation = type === 'copy' ? 'Kopieren' : 'Verschieben'

    return html`
      <div class="dialog-overlay">
        <div
          class="dialog input-dialog"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dialog-header">
            <span class="dialog-title">${operation}</span>
          </div>
          <div style="padding: 1rem;">
            <div class="input-field">
              <label
                >${files.length} Datei(en)
                ${type === 'copy' ? 'kopieren' : 'verschieben'} nach:</label
              >
              <input
                type="text"
                .value=${destination}
                @input=${(e: Event) =>
                  this.updateDestination((e.target as HTMLInputElement).value)}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    this.executeOperation()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    this.cancelOperation()
                  }
                }}
              />
            </div>
            <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">
              ${files.map((f) => html`<div>• ${f.split(/[/\\]/).pop()}</div>`)}
            </div>
          </div>
          <div class="dialog-buttons">
            <button class="btn-cancel" @click=${this.cancelOperation}>
              Abbrechen (ESC)
            </button>
            <button class="btn-confirm" @click=${this.executeOperation}>
              ${operation} (ENTER)
            </button>
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('simple-commander', Commander)
