import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../components/CompareDialog'
import '../components/SimpleDialog'
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
  filter: string
  filterActive: boolean
}

export class Commander extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Courier New', monospace;
      color: #fff;
      background: #000;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      box-sizing: border-box;
    }

    .commander-container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100vh;
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
      cursor: pointer;
    }

    .pane-header:hover {
      background: #5a6f86;
    }

    .pane.active .pane-header {
      background: #0e5ae9;
      color: #fff;
    }

    .pane.active .pane-header:hover {
      background: #0284c7;
    }

    .path-display {
      font-size: 0.9rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Drive Selector */
    .drive-selector {
      width: 400px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
    }

    .drive-list {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: auto;
      flex: 1;
    }

    .drive-item {
      padding: 1rem;
      background: #0f172a;
      border: 2px solid #475569;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: all 0.2s;
    }

    .drive-item:hover {
      background: #1e293b;
      border-color: #0ea5e9;
      transform: translateX(4px);
    }

    .drive-item.focused {
      background: #1e293b;
      border-color: #0ea5e9;
      outline: 2px solid #0ea5e9;
      transform: translateX(4px);
    }

    .drive-icon {
      font-size: 2rem;
    }

    .drive-info {
      flex: 1;
    }

    .drive-label {
      font-size: 1.1rem;
      font-weight: bold;
      color: #fbbf24;
    }

    .drive-path {
      font-size: 0.85rem;
      color: #94a3b8;
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
      padding: 0rem 0rem;
      cursor: pointer;
      display: grid;
      grid-template-columns: 20px 1fr auto;
      gap: 0.8rem;
      align-items: center;
      border-radius: 4px;
      white-space: nowrap;
      font-size: 0.8rem;
    }

    .file-item:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .file-item.focused {
      background: #475569;
      outline: 2px solid #0ea5e9;
    }

    .file-item.selected {
      color: #fbbf24;
    }

    .file-item.selected.focused {
      color: #fbbf24;
    }

    .file-item.selected .file-name,
    .file-item.selected.focused .file-name {
      color: #fbbf24;
    }

    .file-name {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .file-name.directory {
      /* color: #fbbf24; */
      color: rgb(117 233 106);
    }

    .file-size {
      font-size: 0.85rem;
      color: #94a3b8;
      text-align: right;
    }

    .filter-bar {
      padding: 0.5rem 1rem;
      background: #1e293b;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .filter-input {
      flex: 1;
      padding: 0.5rem;
      background: #0f172a;
      border: 2px solid #0ea5e9;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      border-radius: 4px;
    }

    .filter-input:focus {
      outline: none;
      border-color: #fbbf24;
    }

    .filter-label {
      color: #0ea5e9;
      font-size: 0.85rem;
      font-weight: bold;
    }

    .function-bar {
      background: #1e293b;
      border-top: 2px solid #334155;
      padding: 0.5rem;
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      justify-content: space-between;
    }

    .function-key,
    .function-key-top {
      flex: 1;
      background: #475569;
      border: 1px solid #64748b;
      padding: 0.05rem;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      max-width: 7em;
    }

    .function-key-top {
      margin-right: 4em;
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
      overflow: hidden;
      text-overflow: ellipsis;
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

    .dialog-content.image-viewer {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      background: #000;
    }

    .dialog-content.image-viewer img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .dialog-footer {
      background: #334155;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    /* Help Dialog */
    .help-dialog {
      width: 700px;
      max-height: 80vh;
    }

    .help-content {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .help-section {
      margin-bottom: 1.5rem;
    }

    .help-section h3 {
      color: #fbbf24;
      margin: 0 0 0.75rem 0;
      font-size: 1.1rem;
      border-bottom: 2px solid #475569;
      padding-bottom: 0.5rem;
    }

    .help-item {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #334155;
    }

    .help-key {
      color: #0ea5e9;
      font-weight: bold;
      font-family: 'Courier New', monospace;
    }

    .help-description {
      color: #cbd5e1;
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

    @media (max-width: 768px) {
      .panes-container {
        grid-template-columns: 1fr;
      }
    }
  `

  @property({ type: Object })
  leftPane: PaneState = {
    currentPath: '/',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
    filter: '',
    filterActive: false,
  }

  @property({ type: Object })
  rightPane: PaneState = {
    currentPath: '/',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
    filter: '',
    filterActive: false,
  }

  @property({ type: String })
  activePane: 'left' | 'right' = 'left'

  @property({ type: String })
  statusMessage = 'Ready'

  @property({ type: String })
  statusType: 'normal' | 'success' | 'error' = 'normal'

  @property({ type: Object })
  viewerFile: {
    path: string
    content: string
    size: number
    isImage: boolean
  } | null = null

  @property({ type: Object })
  operationDialog: {
    type: 'copy' | 'move'
    files: string[]
    destination: string
  } | null = null

  @property({ type: Array })
  availableDrives: any[] = []

  @property({ type: Array })
  favoritePaths: string[] = []

  @property({ type: Boolean })
  showDriveSelector = false

  @property({ type: Number })
  driveSelectorFocusedIndex = 0

  @property({ type: Boolean })
  showHelp = false

  @property({ type: Object })
  deleteDialog: { files: string[] } | null = null

  @property({ type: Object })
  commandDialog: { command: string; workingDir: string } | null = null

  @property({ type: Object })
  compareDialog: {
    result: any
    recursive: boolean
  } | null = null

  @property({ type: Boolean })
  compareRecursive = false

  @property({ type: Boolean })
  compareWaiting = false

  async connectedCallback() {
    super.connectedCallback()

    // Force the menu into portrait mode
    const menu = document.querySelector('responsive-menu') as any
    if (menu) {
      menu.forcePortrait = true
    }

    // Add CSS class to body to remove landscape padding
    document.body.classList.add('force-portrait')

    // Load paths from localStorage
    const savedLeftPath = localStorage.getItem('commander-left-path')
    const savedRightPath = localStorage.getItem('commander-right-path')

    if (savedLeftPath) {
      this.leftPane.currentPath = savedLeftPath
    }
    if (savedRightPath) {
      this.rightPane.currentPath = savedRightPath
    }

    // Load initial directories
    await this.loadDirectory('left', this.leftPane.currentPath)
    await this.loadDirectory('right', this.rightPane.currentPath)

    // Load available drives
    await this.loadDrives()

    // Load favorite paths from localStorage
    this.loadFavorites()

    // Add global keyboard listeners
    window.addEventListener('keydown', this.handleGlobalKeydown.bind(this))
  }

  loadFavorites() {
    const saved = localStorage.getItem('commander-favorites')
    if (saved) {
      try {
        this.favoritePaths = JSON.parse(saved)
      } catch (error) {
        console.error('Failed to load favorites:', error)
        this.favoritePaths = []
      }
    }
  }

  saveFavorites() {
    localStorage.setItem(
      'commander-favorites',
      JSON.stringify(this.favoritePaths),
    )
  }

  toggleFavorite(path: string) {
    const index = this.favoritePaths.indexOf(path)
    if (index >= 0) {
      // Remove from favorites
      this.favoritePaths = this.favoritePaths.filter((_, i) => i !== index)
      this.setStatus(`Removed from favorites: ${path}`, 'success')
    } else {
      // Add to favorites
      this.favoritePaths = [...this.favoritePaths, path]
      this.setStatus(`Added to favorites: ${path}`, 'success')
    }
    this.saveFavorites()
  }

  isFavorite(path: string): boolean {
    return this.favoritePaths.includes(path)
  }

  async loadDrives() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'drives',
        },
      )

      if (response.success && response.data) {
        this.availableDrives = response.data.drives
      }
    } catch (error: any) {
      console.error('Failed to load drives:', error)
    }
  }

  async handlePathClick(pane?: 'left' | 'right') {
    if (this.availableDrives.length > 0) {
      // Set active pane if specified
      if (pane) {
        this.activePane = pane
      }
      this.showDriveSelector = true
      this.driveSelectorFocusedIndex = 0
    }
  }

  async selectDrive(drivePath: string) {
    this.showDriveSelector = false
    await this.navigateToDirectory(drivePath)
  }

  closeDriveSelector() {
    this.showDriveSelector = false
  }

  getDriveSelectorItems() {
    // Combine favorites and drives into a single list
    const items: { path: string; type: 'favorite' | 'drive' }[] = []

    this.favoritePaths.forEach((path) => {
      items.push({ path, type: 'favorite' })
    })

    this.availableDrives.forEach((drive) => {
      items.push({ path: drive.path, type: 'drive' })
    })

    return items
  }

  moveDriveSelectorFocus(delta: number) {
    const items = this.getDriveSelectorItems()
    if (items.length === 0) return

    const newIndex = Math.max(
      0,
      Math.min(items.length - 1, this.driveSelectorFocusedIndex + delta),
    )

    this.driveSelectorFocusedIndex = newIndex
    this.scrollDriveItemIntoView(newIndex)
  }

  scrollDriveItemIntoView(index: number) {
    setTimeout(() => {
      const driveItems = this.shadowRoot?.querySelectorAll('.drive-item')
      if (driveItems && driveItems[index]) {
        driveItems[index].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }, 0)
  }

  selectFocusedDrive() {
    const items = this.getDriveSelectorItems()
    if (items.length === 0 || this.driveSelectorFocusedIndex >= items.length)
      return

    const selectedItem = items[this.driveSelectorFocusedIndex]
    this.selectDrive(selectedItem.path)
  }

  openHelp() {
    this.showHelp = true
  }

  closeHelp() {
    this.showHelp = false
  }

  disconnectedCallback() {
    super.disconnectedCallback()

    // Reset the menu to normal orientation behavior
    const menu = document.querySelector('responsive-menu') as any
    if (menu) {
      menu.forcePortrait = false
    }

    // Remove CSS class from body
    document.body.classList.remove('force-portrait')

    window.removeEventListener('keydown', this.handleGlobalKeydown.bind(this))
  }

  async loadDirectory(
    pane: 'left' | 'right',
    path: string,
    previousPath?: string,
  ) {
    try {
      this.setStatus('Loading directory...', 'normal')
      console.log(`Loading directory for ${pane}: ${path}`)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'list',
          folderPath: path,
        },
      )

      console.log('Response:', response)

      if (response.success && response.data) {
        const data = response.data

        // Check if the data itself indicates an error
        if (data.success === false) {
          // Directory doesn't exist - go up one level and retry
          console.log('Directory does not exist, going up one level...')
          const parentPath = this.getParentPath(path)

          // If we're already at the root or parent is the same as current, stop
          if (parentPath === path) {
            this.setStatus(`Error: No valid directory found`, 'error')
            console.error('Already at root, cannot go higher')
            return
          }

          // Recursively try the parent directory
          await this.loadDirectory(pane, parentPath, previousPath)
          return
        }
        const items: FileItem[] = []

        // Add parent directory entry if not at root
        const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
        const isRoot = normalizedPath.match(/^[a-z]:\/?\s*$/)

        if (!isRoot) {
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

        // Add directories first, then files (with safety checks)
        if (data.directories && Array.isArray(data.directories)) {
          items.push(...data.directories)
        }
        if (data.files && Array.isArray(data.files)) {
          items.push(...data.files)
        }

        console.log(`Loaded ${items.length} items for ${pane}`)

        // Find the index of the previous directory
        let focusedIndex = 0
        if (previousPath) {
          // Extract just the directory name from the previous path
          const prevName = previousPath
            .split(/[/\\]/)
            .filter((p) => p)
            .pop()
          if (prevName) {
            const index = items.findIndex((item) => item.name === prevName)
            if (index !== -1) {
              focusedIndex = index
            }
          }
        }

        if (pane === 'left') {
          this.leftPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: focusedIndex,
            filter: this.leftPane.filter,
            filterActive: this.leftPane.filterActive,
          }
          // Save to localStorage
          localStorage.setItem('commander-left-path', data.path)
        } else {
          this.rightPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: focusedIndex,
            filter: this.rightPane.filter,
            filterActive: this.rightPane.filterActive,
          }
          // Save to localStorage
          localStorage.setItem('commander-right-path', data.path)
        }

        // Display status with safety checks
        const dirCount = data.summary?.totalDirectories ?? 0
        const fileCount = data.summary?.totalFiles ?? 0
        this.setStatus(`${dirCount} folders, ${fileCount} files`, 'success')
      } else {
        // Request failed - go up one level and retry
        console.log('Failed to load directory, going up one level...')
        const parentPath = this.getParentPath(path)

        // If we're already at the root or parent is the same as current, stop
        if (parentPath === path) {
          this.setStatus(`Error: ${response.error}`, 'error')
          console.error('Load directory error:', response.error)
          return
        }

        // Recursively try the parent directory
        await this.loadDirectory(pane, parentPath, previousPath)
      }
    } catch (error: any) {
      // Exception occurred - go up one level and retry
      console.log('Exception loading directory, going up one level...')
      const parentPath = this.getParentPath(path)

      // If we're already at the root or parent is the same as current, stop
      if (parentPath === path) {
        this.setStatus(`Error: ${error.message}`, 'error')
        console.error('Load directory exception:', error)
        return
      }

      // Recursively try the parent directory
      try {
        await this.loadDirectory(pane, parentPath, previousPath)
      } catch (retryError: any) {
        this.setStatus(`Error: ${retryError.message}`, 'error')
        console.error('Failed to load parent directory:', retryError)
      }
    }
  }

  getParentPath(currentPath: string): string {
    // Detect OS: Windows paths have drive letters (e.g., "C:\"), Unix paths start with "/"
    const isWindows = /^[a-zA-Z]:[\\\/]/.test(currentPath)
    const separator = isWindows ? '\\' : '/'

    // Normalize separators for consistency
    const normalized = isWindows
      ? currentPath.replace(/\//g, '\\')
      : currentPath.replace(/\\/g, '/')

    // Check if we're at root
    if (isWindows) {
      // Windows root: "d:\" or "d:"
      if (normalized.match(/^[a-zA-Z]:\\?$/)) {
        return normalized
      }
    } else {
      // Unix root: "/"
      if (normalized === '/') {
        return '/'
      }
    }

    // Remove trailing separator if present (but not if it's the root)
    const minLength = isWindows ? 3 : 1
    const cleanPath =
      normalized.endsWith(separator) && normalized.length > minLength
        ? normalized.slice(0, -1)
        : normalized

    // Find last separator
    const lastSeparator = cleanPath.lastIndexOf(separator)
    if (lastSeparator === -1) {
      return normalized
    }

    // Return everything up to the last separator
    const parentPath = cleanPath.substring(0, lastSeparator)

    // Handle edge cases
    if (isWindows) {
      // If parent path is just drive letter, add backslash
      if (parentPath.match(/^[a-zA-Z]:$/)) {
        return parentPath + '\\'
      }
    } else {
      // If parent path is empty, return root
      if (parentPath === '') {
        return '/'
      }
    }

    return parentPath || normalized
  }

  setStatus(message: string, type: 'normal' | 'success' | 'error') {
    this.statusMessage = message
    this.statusType = type

    if (type !== 'normal') {
      setTimeout(() => {
        this.statusMessage = 'Ready'
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
    console.log('Double-click on item:', item)

    // Check if this is a ZIP file - treat it like a directory
    const isZipFile =
      !item.isDirectory && item.name.toLowerCase().endsWith('.zip')

    if (item.isDirectory || isZipFile) {
      console.log('Navigating to directory/ZIP:', item.path)
      await this.navigateToDirectory(item.path)
    } else {
      console.log('Viewing file:', item.path)
      await this.viewFile(item.path)
    }
  }

  async navigateToDirectory(path: string) {
    console.log('navigateToDirectory called with:', path)
    const currentPath = this.getActivePane().currentPath
    await this.loadDirectory(this.activePane, path, currentPath)
  }

  isImageFile(filePath: string): boolean {
    const imageExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.bmp',
      '.webp',
      '.svg',
      '.ico',
    ]
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return imageExtensions.includes(ext)
  }

  async viewFile(filePath: string) {
    try {
      this.setStatus('Loading file...', 'normal')

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
          isImage: response.data.isImage || false,
        }
        this.setStatus(
          response.data.isImage ? 'Image loaded' : 'File loaded',
          'success',
        )
      } else {
        this.setStatus(`Error: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
    }
  }

  closeViewer() {
    this.viewerFile = null
  }

  viewNextImage() {
    if (!this.viewerFile) return

    const pane = this.getActivePane()
    const currentPath = this.viewerFile.path

    // Find current file index
    const currentIndex = pane.items.findIndex(
      (item) => item.path === currentPath,
    )
    if (currentIndex === -1) return

    // Find next image file
    for (let i = currentIndex + 1; i < pane.items.length; i++) {
      const item = pane.items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        this.viewFile(item.path)
        // Update focused index
        this.updateActivePane({ focusedIndex: i })
        return
      }
    }

    // Wrap around to beginning
    for (let i = 0; i < currentIndex; i++) {
      const item = pane.items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        this.viewFile(item.path)
        // Update focused index
        this.updateActivePane({ focusedIndex: i })
        return
      }
    }
  }

  viewPreviousImage() {
    if (!this.viewerFile) return

    const pane = this.getActivePane()
    const currentPath = this.viewerFile.path

    // Find current file index
    const currentIndex = pane.items.findIndex(
      (item) => item.path === currentPath,
    )
    if (currentIndex === -1) return

    // Find previous image file
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = pane.items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        this.viewFile(item.path)
        // Update focused index
        this.updateActivePane({ focusedIndex: i })
        return
      }
    }

    // Wrap around to end
    for (let i = pane.items.length - 1; i > currentIndex; i--) {
      const item = pane.items[i]
      if (item.isFile && this.isImageFile(item.path)) {
        this.viewFile(item.path)
        // Update focused index
        this.updateActivePane({ focusedIndex: i })
        return
      }
    }
  }

  handleGlobalKeydown(event: KeyboardEvent) {
    // Ignore if typing in an input field (let input handle its own events)
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    // Handle ESC for dialogs first
    if (event.key === 'Escape') {
      event.preventDefault()
      if (this.showHelp) {
        this.closeHelp()
        return
      }
      if (this.viewerFile) {
        this.closeViewer()
        return
      }
      if (this.operationDialog) {
        this.cancelOperation()
        return
      }
      if (this.deleteDialog) {
        this.cancelDelete()
        return
      }
      if (this.showDriveSelector) {
        this.closeDriveSelector()
        return
      }
      if (this.commandDialog) {
        this.cancelCommand()
        return
      }
      // Clear filter if active
      const pane = this.getActivePane()
      if (pane.filterActive) {
        this.updateActivePane({ filter: '', filterActive: false })
        return
      }
    }

    // Handle ENTER for delete dialog
    if (event.key === 'Enter' && this.deleteDialog) {
      event.preventDefault()
      this.executeDelete()
      return
    }

    // Handle keyboard navigation in drive selector
    if (this.showDriveSelector) {
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        this.moveDriveSelectorFocus(-1)
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.moveDriveSelectorFocus(1)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        this.selectFocusedDrive()
        return
      }
      // ESC is already handled above
      return
    }

    // Handle arrow keys in image viewer
    if (this.viewerFile && this.viewerFile.isImage) {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        this.viewNextImage()
        return
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        this.viewPreviousImage()
        return
      }
    }

    const pane = this.getActivePane()

    // Handle Alt+1 and Alt+2 for drive selection, Alt+F for filter
    if (event.altKey) {
      if (event.key === '1') {
        event.preventDefault()
        this.handlePathClick('left')
        return
      } else if (event.key === '2') {
        event.preventDefault()
        this.handlePathClick('right')
        return
      } else if (event.key.toLowerCase() === 'f') {
        event.preventDefault()
        const pane = this.getActivePane()
        this.updateActivePane({ filterActive: !pane.filterActive })
        // Focus the filter input after a short delay
        if (!pane.filterActive) {
          setTimeout(() => {
            const filterInput = this.shadowRoot?.querySelector(
              '.pane.active .filter-input',
            ) as HTMLInputElement
            if (filterInput) {
              filterInput.focus()
            }
          }, 100)
        }
        return
      }
    }

    switch (event.key) {
      case 'F1':
        event.preventDefault()
        this.openHelp()
        break

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

      case 'F8':
        event.preventDefault()
        this.handleF8()
        break

      case 'F9':
        event.preventDefault()
        this.handleF9()
        break

      case 'F10':
        event.preventDefault()
        this.handleF10()
        break

      case 'Enter':
        // Don't handle Enter if a dialog is open
        if (this.operationDialog || this.showHelp || this.showDriveSelector) {
          return
        }
        event.preventDefault()
        this.handleEnter()
        break

      case 'ArrowUp':
        if (event.ctrlKey) {
          event.preventDefault()
          this.moveFocus(-1, true)
        } else {
          event.preventDefault()
          this.moveFocus(-1, false)
        }
        break

      case 'ArrowDown':
        if (event.ctrlKey) {
          event.preventDefault()
          this.moveFocus(1, true)
        } else {
          event.preventDefault()
          this.moveFocus(1, false)
        }
        break

      case 'ArrowLeft':
        if (event.ctrlKey) {
          event.preventDefault()
          // Ctrl+Left: Switch left panel to right panel's directory
          const targetPath = this.rightPane.currentPath
          const previousActive = this.activePane
          this.activePane = 'left'
          this.navigateToDirectory(targetPath).then(() => {
            this.activePane = previousActive
          })
        }
        break

      case 'ArrowRight':
        if (event.ctrlKey) {
          event.preventDefault()
          // Ctrl+Right: Switch right panel to left panel's directory
          const targetPath = this.leftPane.currentPath
          const previousActive = this.activePane
          this.activePane = 'right'
          this.navigateToDirectory(targetPath).then(() => {
            this.activePane = previousActive
          })
        }
        break

      case 'PageUp':
        event.preventDefault()
        this.moveFocus(-20, event.ctrlKey)
        break

      case 'PageDown':
        event.preventDefault()
        this.moveFocus(20, event.ctrlKey)
        break

      case 'Home': // Pos1
        event.preventDefault()
        this.moveFocus(-Infinity, event.ctrlKey)
        break

      case 'End': // Ende
        event.preventDefault()
        this.moveFocus(Infinity, event.ctrlKey)
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
      this.setStatus('No files selected', 'error')
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
      this.setStatus('No files selected', 'error')
    }
  }

  async handleEnter() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    // Check if this is a ZIP file - treat it like a directory
    const isZipFile =
      item && !item.isDirectory && item.name.toLowerCase().endsWith('.zip')

    if (item.isDirectory || isZipFile) {
      await this.navigateToDirectory(item.path)
    } else if (item.isFile) {
      // Execute the file
      await this.executeFile(item.path)
    }
  }

  async executeFile(filePath: string) {
    try {
      this.setStatus(`Executing: ${filePath}`, 'normal')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'execute-file',
          filePath: filePath,
        },
      )

      if (response.success) {
        this.setStatus(`Executed: ${filePath}`, 'success')
      } else {
        this.setStatus(`Error executing: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      console.error('Execute file error:', error)
    }
  }

  moveFocus(delta: number, withSelection: boolean) {
    const pane = this.getActivePane()
    const newSelected = new Set(pane.selectedIndices)

    if (withSelection) {
      // Toggle the CURRENT focused item first
      if (newSelected.has(pane.focusedIndex)) {
        newSelected.delete(pane.focusedIndex)
      } else {
        newSelected.add(pane.focusedIndex)
      }
    }

    const newIndex = Math.max(
      0,
      Math.min(pane.items.length - 1, pane.focusedIndex + delta),
    )

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
        // Allow both files and directories
        if (item && item.name !== '..') {
          files.push(item.path)
        }
      })
    } else {
      // If nothing selected, use focused item
      const item = pane.items[pane.focusedIndex]
      // Allow both files and directories, but not parent directory
      if (item && item.name !== '..') {
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
        `${type === 'copy' ? 'Copying' : 'Moving'} ${files.length} file(s)...`,
        'normal',
      )

      let successCount = 0
      for (const file of files) {
        const fileName = file.split(/[/\\]/).pop() || 'file'
        // Use the appropriate separator based on the OS
        const separator = destination.includes('\\') ? '\\' : '/'
        const destPath = destination + separator + fileName

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
          this.setStatus(`Error with ${fileName}: ${response.error}`, 'error')
          break
        }
      }

      if (successCount === files.length) {
        this.setStatus(
          `${successCount} file(s) successfully ${type === 'copy' ? 'copied' : 'moved'}`,
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
      this.setStatus(`Error: ${error.message}`, 'error')
    }
  }

  cancelOperation() {
    this.operationDialog = null
  }

  handleF8() {
    const selectedFiles = this.getSelectedFiles()
    if (selectedFiles.length > 0) {
      this.deleteDialog = { files: selectedFiles }
    } else {
      this.setStatus('no files selected', 'error')
    }
  }

  async executeDelete() {
    if (!this.deleteDialog) return

    const { files } = this.deleteDialog

    try {
      this.setStatus(`Deleting ${files.length} file(s)...`, 'normal')

      let successCount = 0
      for (const file of files) {
        const fileName = file.split(/[/\\]/).pop() || 'file'

        const response = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: 'delete',
            sourcePath: file,
          },
        )

        if (response.success) {
          successCount++
        } else {
          this.setStatus(`Error with ${fileName}: ${response.error}`, 'error')
          break
        }
      }

      if (successCount === files.length) {
        this.setStatus(
          `${successCount} file(s) successfully deleted`,
          'success',
        )

        // Refresh active pane
        await this.loadDirectory(
          this.activePane,
          this.getActivePane().currentPath,
        )
      }

      this.deleteDialog = null
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
    }
  }

  cancelDelete() {
    this.deleteDialog = null
  }

  handleF9() {
    const pane = this.getActivePane()
    this.commandDialog = {
      command: '',
      workingDir: pane.currentPath,
    }
  }

  async handleF10() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..') {
      this.setStatus('No valid file selected', 'error')
      return
    }

    try {
      // Use IPC to write to clipboard
      const response = await (window as any).electron.ipcRenderer.invoke(
        'clipboard-write-text',
        item.path,
      )

      if (response.success) {
        this.setStatus(`Path copied: ${item.path}`, 'success')
      } else {
        this.setStatus(`Error copying: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Error copying: ${error.message}`, 'error')
      console.error('Clipboard error:', error)
    }
  }

  updateCommand(value: string) {
    if (this.commandDialog) {
      this.commandDialog = {
        ...this.commandDialog,
        command: value,
      }
    }
  }

  async executeCommand() {
    if (!this.commandDialog || !this.commandDialog.command.trim()) return

    const { command, workingDir } = this.commandDialog

    try {
      this.setStatus(`Executing command: ${command}`, 'normal')

      // Use Node.js child_process via IPC to execute command
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'execute-command',
          command: command,
          workingDir: workingDir,
        },
      )

      if (response.success && response.data) {
        // Show output in viewer
        this.viewerFile = {
          path: `Command: ${command}`,
          content: response.data.output || 'Command executed successfully.',
          size: 0,
          isImage: false,
        }
        this.setStatus('Command executed successfully', 'success')
      } else {
        this.setStatus(`Error: ${response.error || 'Unknown error'}`, 'error')
      }

      this.commandDialog = null

      // Refresh active pane in case files changed
      await this.loadDirectory(
        this.activePane,
        this.getActivePane().currentPath,
      )
    } catch (error: any) {
      this.setStatus(`Fehler: ${error.message}`, 'error')
      this.commandDialog = null
    }
  }

  cancelCommand() {
    this.commandDialog = null
  }

  async handleCompare() {
    try {
      this.setStatus(
        `Comparing directories${this.compareRecursive ? ' (recursive)' : ''}...`,
        'normal',
      )

      // Set waiting state
      this.compareWaiting = true

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'compare',
          leftPath: this.leftPane.currentPath,
          rightPath: this.rightPane.currentPath,
          recursive: this.compareRecursive,
        },
      )

      // Clear waiting state
      this.compareWaiting = false

      if (response.success && response.data) {
        this.compareDialog = {
          result: response.data,
          recursive: this.compareRecursive,
        }
        this.setStatus('Vergleich abgeschlossen', 'success')
      } else {
        this.setStatus(`Fehler: ${response.error}`, 'error')
      }
    } catch (error: any) {
      // Clear waiting state on error
      this.compareWaiting = false
      this.setStatus(`Fehler: ${error.message}`, 'error')
    }
  }

  closeCompare() {
    this.compareDialog = null
  }

  async toggleCompareRecursive() {
    this.compareRecursive = !this.compareRecursive
    this.setStatus(
      `Rekursiver Vergleich: ${this.compareRecursive ? 'An' : 'Aus'}`,
      'success',
    )

    // If dialog is open, automatically start new comparison
    if (this.compareDialog) {
      await this.handleCompare()
    }
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
          <span class="toolbar-title">📁 Nice2Have Commander</span>
          <div
            class="function-key-top"
            @click=${() => this.handleCompare()}
            style="min-width: 100px; background: ${this.compareRecursive
              ? '#0ea5e9'
              : '#475569'};"
            title="compare"
          >
            <span class="function-key-label">📂 : 📂</span>
          </div>
          <div
            class="function-key-top"
            @click=${() => this.openHelp()}
            style="margin-left: auto; min-width: 80px;"
          >
            <span class="function-key-label">F1</span>
          </div>
        </div>

        <div class="panes-container">
          ${this.renderPane('left', this.leftPane)}
          ${this.renderPane('right', this.rightPane)}
        </div>

        <div class="function-bar">
          <div class="function-key" @click=${() => this.handleF3()}>
            <span class="function-key-label">F3</span>
            <span class="function-key-action">view</span>
          </div>
          <div class="function-key" @click=${() => this.handleF5()}>
            <span class="function-key-label">F5</span>
            <span class="function-key-action">copy</span>
          </div>
          <div class="function-key" @click=${() => this.handleF6()}>
            <span class="function-key-label">F6</span>
            <span class="function-key-action">move</span>
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
            <span class="function-key-action">refresh</span>
          </div>
          <div class="function-key" @click=${() => this.handleF8()}>
            <span class="function-key-label">F8</span>
            <span class="function-key-action">delete</span>
          </div>
          <div class="function-key" @click=${() => this.handleF9()}>
            <span class="function-key-label">F9</span>
            <span class="function-key-action">cmd</span>
          </div>
          <div class="function-key" @click=${() => this.handleF10()}>
            <span class="function-key-label">F10</span>
            <span class="function-key-action">📋 path</span>
          </div>
        </div>

        <div class="status-bar ${this.statusType}">${this.statusMessage}</div>

        ${this.viewerFile ? this.renderViewer() : ''}
        ${this.operationDialog ? this.renderOperationDialog() : ''}
        ${this.deleteDialog ? this.renderDeleteDialog() : ''}
        ${this.commandDialog ? this.renderCommandDialog() : ''}
        ${this.compareDialog
          ? html`<compare-dialog
              .result=${this.compareDialog.result}
              .recursive=${this.compareDialog.recursive}
              .isWaiting=${this.compareWaiting}
              @close=${this.closeCompare}
              @toggle-recursive=${this.toggleCompareRecursive}
              @recompare=${this.handleCompare}
            ></compare-dialog>`
          : ''}
        ${this.showDriveSelector ? this.renderDriveSelector() : ''}
        ${this.showHelp ? this.renderHelp() : ''}
      </div>
    `
  }

  renderHelp() {
    return html`
      <simple-dialog
        .open=${this.showHelp}
        .title=${'❓ shortcuts'}
        .width=${'700px'}
        .maxHeight=${'80vh'}
        @dialog-close=${this.closeHelp}
      >
        <div class="help-content">
          <div class="help-section">
            <h3>navigate</h3>
            <div class="help-item">
              <div class="help-key">↑ / ↓</div>
              <div class="help-description">move focus</div>
            </div>
            <div class="help-item">
              <div class="help-key">Enter</div>
              <div class="help-description">open directory</div>
            </div>
            <div class="help-item">
              <div class="help-key">Tab</div>
              <div class="help-description">switch panels</div>
            </div>
            <div class="help-item">
              <div class="help-key">Alt+1 / Alt+2</div>
              <div class="help-description">select drive</div>
            </div>
          </div>
          <div class="help-section">
            <h3>files</h3>
            <div class="help-item">
              <div class="help-key">F3</div>
              <div class="help-description">file/image</div>
            </div>
            <div class="help-item">
              <div class="help-key">← / →</div>
              <div class="help-description">navigate</div>
            </div>
            <div class="help-item">
              <div class="help-key">double click</div>
              <div class="help-description">open file / folder</div>
            </div>
          </div>
          <div class="help-section">
            <h3>select</h3>
            <div class="help-item">
              <div class="help-key">ctrl+click</div>
              <div class="help-description">(de)select</div>
            </div>
            <div class="help-item">
              <div class="help-key">ctrl+↑ / ctrl+↓</div>
              <div class="help-description">(de)select</div>
            </div>
            <div class="help-item">
              <div class="help-key">ctrl+space</div>
              <div class="help-description">(de)select)</div>
            </div>
          </div>
          <div class="help-section">
            <h3>functions</h3>
            <div class="help-item">
              <div class="help-key">F5</div>
              <div class="help-description">copy</div>
            </div>
            <div class="help-item">
              <div class="help-key">F6</div>
              <div class="help-description">move</div>
            </div>
            <div class="help-item">
              <div class="help-key">F7</div>
              <div class="help-description">refresh</div>
            </div>
          </div>
          <div class="help-section">
            <h3>other</h3>
            <div class="help-item">
              <div class="help-key">ALT+f</div>
              <div class="help-description">filter files</div>
            </div>
            <div class="help-item">
              <div class="help-key">F1</div>
              <div class="help-description">show help</div>
            </div>
            <div class="help-item">
              <div class="help-key">ESC</div>
              <div class="help-description">close</div>
            </div>
          </div>
        </div>
      </simple-dialog>
    `
  }

  renderDriveSelector() {
    const currentPath = this.getActivePane().currentPath
    const isCurrentFavorite = this.isFavorite(currentPath)

    return html`
      <div class="dialog-overlay" @click=${this.closeDriveSelector}>
        <div
          class="dialog drive-selector"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dialog-header">
            <span class="dialog-title">💾 Laufwerk & Favoriten wählen</span>
            <button class="dialog-close" @click=${this.closeDriveSelector}>
              ESC
            </button>
          </div>

          <div class="drive-list">
            <!-- Favorites Section -->
            ${this.favoritePaths.length > 0
              ? html`
                  <div
                    style="padding: 0.5rem 0; color: #fbbf24; font-weight: bold; border-bottom: 1px solid #475569;"
                  >
                    ⭐ Favoriten
                  </div>
                  ${this.favoritePaths.map(
                    (favPath, index) => html`
                      <div
                        class="drive-item ${this.driveSelectorFocusedIndex ===
                        index
                          ? 'focused'
                          : ''}"
                        style="position: relative;"
                      >
                        <span class="drive-icon">⭐</span>
                        <div
                          class="drive-info"
                          @click=${() => this.selectDrive(favPath)}
                          style="cursor: pointer;"
                        >
                          <div class="drive-label">
                            ${favPath.split(/[/\\]/).pop() || favPath}
                          </div>
                          <div class="drive-path">${favPath}</div>
                        </div>
                        <button
                          @click=${(e: Event) => {
                            e.stopPropagation()
                            this.toggleFavorite(favPath)
                          }}
                          style="background: #dc2626; border: none; color: white; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 1.2rem;"
                          title="Aus Favoriten entfernen"
                        >
                          🗑️
                        </button>
                      </div>
                    `,
                  )}
                  <div
                    style="padding: 0.5rem 0; color: #fbbf24; font-weight: bold; border-bottom: 1px solid #475569; margin-top: 0.5rem;"
                  >
                    💾 Laufwerke
                  </div>
                `
              : ''}

            <!-- Drives Section -->
            ${this.availableDrives.map(
              (drive, index) => html`
                <div
                  class="drive-item ${this.driveSelectorFocusedIndex ===
                  this.favoritePaths.length + index
                    ? 'focused'
                    : ''}"
                  @click=${() => this.selectDrive(drive.path)}
                >
                  <span class="drive-icon">💾</span>
                  <div class="drive-info">
                    <div class="drive-label">${drive.label}</div>
                    <div class="drive-path">${drive.path}</div>
                  </div>
                </div>
              `,
            )}
          </div>

          <!-- Add Favorite Button at Bottom -->
          ${!isCurrentFavorite
            ? html`
                <div
                  class="dialog-footer"
                  style="padding: 1rem; border-top: 2px solid #475569;"
                >
                  <button
                    class="btn-confirm"
                    style="width: 100%; padding: 0.75rem;"
                    @click=${(e: Event) => {
                      e.stopPropagation()
                      this.toggleFavorite(currentPath)
                    }}
                  >
                    ☆ Aktuelles Verzeichnis zu Favoriten hinzufügen
                    <br />
                    <span style="font-size: 0.85rem; opacity: 0.8;"
                      >${currentPath}</span
                    >
                  </button>
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }

  renderPane(side: 'left' | 'right', pane: PaneState) {
    const isActive = this.activePane === side

    // Filter items based on filter text
    const filteredItems =
      pane.filterActive && pane.filter
        ? pane.items.filter((item) =>
            item.name.toLowerCase().includes(pane.filter.toLowerCase()),
          )
        : pane.items

    return html`
      <div
        class="pane ${isActive ? 'active' : ''}"
        @click=${() => this.handlePaneClick(side)}
      >
        <div
          class="pane-header"
          @click=${(e: Event) => {
            e.stopPropagation()
            this.handlePaneClick(side)
            this.handlePathClick()
          }}
        >
          <span class="path-display">${pane.currentPath}</span>
          <span class="item-count">
            ${filteredItems.length}${pane.filterActive && pane.filter
              ? ` / ${pane.items.length}`
              : ''}
            Items
          </span>
        </div>

        ${pane.filterActive
          ? html`
              <div class="filter-bar">
                <span class="filter-label">🔍 Filter:</span>
                <input
                  type="text"
                  class="filter-input"
                  placeholder="Type to filter files..."
                  .value=${pane.filter}
                  @input=${(e: Event) => {
                    if (this.activePane === side) {
                      this.updateActivePane({
                        filter: (e.target as HTMLInputElement).value,
                      })
                    }
                  }}
                  @click=${(e: Event) => e.stopPropagation()}
                />
              </div>
            `
          : ''}

        <div class="file-list">
          ${filteredItems.map(
            (item, index) => html`
              <div
                class="file-item ${pane.focusedIndex === index
                  ? 'focused'
                  : ''} ${pane.selectedIndices.has(index) ? 'selected' : ''}"
                @click=${(e: MouseEvent) => this.handleItemClick(index, e)}
                @dblclick=${() => this.handleItemDoubleClick(index)}
              >
                <span class="file-icon"
                  >${item.isDirectory
                    ? '📁'
                    : item.name.toLowerCase().endsWith('.zip')
                      ? '📦'
                      : '📄'}</span
                >
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
            <span class="dialog-title">${this.viewerFile.path}</span>
            <button class="dialog-close" @click=${this.closeViewer}>ESC</button>
          </div>
          <div
            class="dialog-content ${this.viewerFile.isImage
              ? 'image-viewer'
              : ''}"
          >
            ${this.viewerFile.isImage
              ? html`<img
                  src="${this.viewerFile.content}"
                  alt="Image preview"
                />`
              : this.viewerFile.content}
          </div>
          <div class="dialog-footer">
            ${this.viewerFile.isImage
              ? `Bild: ${this.viewerFile.path.split(/[/\\]/).pop()}`
              : `Größe: ${this.formatFileSize(this.viewerFile.size)}`}
            | press ESC to close
          </div>
        </div>
      </div>
    `
  }

  renderOperationDialog() {
    if (!this.operationDialog) return ''

    const { type, files, destination } = this.operationDialog
    const operation = type === 'copy' ? 'copy' : 'move'

    // Auto-focus input field when dialog opens
    setTimeout(() => {
      const input = this.shadowRoot?.querySelector(
        '.input-field input',
      ) as HTMLInputElement
      if (input) {
        input.focus()
        input.select()
      }
    }, 100)

    return html`
      <simple-dialog
        .open=${true}
        .title=${operation}
        .width=${'600px'}
        @dialog-close=${this.cancelOperation}
      >
        <div style="padding: 1rem;">
          <div class="input-field">
            <label
              >${type === 'copy' ? 'copy' : 'move'} ${files.length} files
              to:</label
            >
            <input
              type="text"
              .value=${destination}
              @input=${(e: Event) =>
                this.updateDestination((e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  this.executeOperation()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                  this.cancelOperation()
                }
              }}
            />
          </div>
          <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">
            ${files.map((f) => html`<div>• ${f.split(/[/\\]/).pop()}</div>`)}
          </div>
        </div>
        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.cancelOperation}>
            cancel (ESC)
          </button>
          <button class="btn-confirm" @click=${this.executeOperation}>
            ${operation} (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }

  renderDeleteDialog() {
    if (!this.deleteDialog) return ''

    const { files } = this.deleteDialog

    // Auto-focus the delete button when dialog opens
    setTimeout(() => {
      const deleteBtn = this.shadowRoot?.querySelector(
        '.btn-confirm',
      ) as HTMLButtonElement
      if (deleteBtn) {
        deleteBtn.focus()
      }
    }, 100)

    return html`
      <simple-dialog
        .open=${true}
        .title=${'🗑️ confirm'}
        .width=${'600px'}
        @dialog-close=${this.cancelDelete}
      >
        <div style="padding: 1rem;">
          <div style="margin-bottom: 1rem; color: #fbbf24; font-weight: bold;">
            ⚠️ really delete ${files.length} files?
          </div>
          <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">
            ${files.map((f) => html`<div>• ${f.split(/[/\\]/).pop()}</div>`)}
          </div>
        </div>
        <div slot="footer" class="dialog-buttons">
          <button
            class="btn-cancel"
            @click=${this.cancelDelete}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                this.cancelDelete()
              }
            }}
          >
            cancel (ESC)
          </button>
          <button
            class="btn-confirm"
            @click=${this.executeDelete}
            @keydown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                this.executeDelete()
              }
            }}
            style="background: #dc2626;"
          >
            confirm (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }

  renderCommandDialog() {
    if (!this.commandDialog) return ''

    const { command, workingDir } = this.commandDialog

    // Auto-focus input field when dialog opens
    setTimeout(() => {
      const input = this.shadowRoot?.querySelector(
        '.input-field input',
      ) as HTMLInputElement
      if (input) {
        input.focus()
      }
    }, 100)

    return html`
      <simple-dialog
        .open=${true}
        .title=${'⚡ execute'}
        .width=${'600px'}
        @dialog-close=${this.cancelCommand}
      >
        <div style="padding: 1rem;">
          <div class="input-field">
            <label>execute in: ${workingDir}</label>
            <input
              type="text"
              .value=${command}
              placeholder="z.B. dir, ls, git status..."
              @input=${(e: Event) =>
                this.updateCommand((e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  e.stopPropagation()
                  this.executeCommand()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  e.stopPropagation()
                  this.cancelCommand()
                }
              }}
            />
          </div>
        </div>
        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.cancelCommand}>
            cancel (ESC)
          </button>
          <button class="btn-confirm" @click=${this.executeCommand}>
            execute (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }
}

customElements.define('simple-commander', Commander)
