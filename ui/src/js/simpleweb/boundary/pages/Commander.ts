import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../components/CompareDialog'

// Import from refactored modules
import { commanderStyles } from './commander/commander.styles.js'
import type { FileItem, PaneState } from './commander/commander.types.js'
import { HistoryService } from './commander/services/HistoryService.js'
import { KeyboardHandler } from './commander/services/KeyboardHandler.js'
import { PaneManager } from './commander/services/PaneManager.js'
import { FILE_ICONS } from './commander/utils/file-utils.js'

// Import dialog components
import './commander/dialogs/index.js'

export class Commander extends LitElement {
  static styles = commanderStyles

  // Service instances
  private historyService = new HistoryService()
  private paneManager!: PaneManager
  private keyboardHandler!: KeyboardHandler

  // Use imported FILE_ICONS
  fileIcons = FILE_ICONS

  getFileIcon(item: FileItem): string {
    if (item.isDirectory) return '📁'
    const ext = item.name.split('.').pop()?.toLowerCase()
    return (ext && this.fileIcons[ext]) ?? '📄'
  }

  @property({ type: Object })
  leftPane: PaneState = {
    currentPath: '/',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
    filter: '',
    filterActive: false,
    sortBy: 'name',
    sortDirection: 'asc',
  }

  @property({ type: Object })
  rightPane: PaneState = {
    currentPath: '/',
    items: [],
    selectedIndices: new Set(),
    focusedIndex: 0,
    filter: '',
    filterActive: false,
    sortBy: 'name',
    sortDirection: 'asc',
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
  compareRecursive = true

  @property({ type: Boolean })
  compareWaiting = false

  @property({ type: Object })
  compareProgress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  @property({ type: Object })
  quickLaunchDialog: { command: string } | null = null

  @property({ type: Object })
  renameDialog: { filePath: string; oldName: string; newName: string } | null =
    null

  @property({ type: Object })
  zipDialog: { files: string[]; zipFileName: string } | null = null

  @property({ type: Object })
  zipProgress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  @property({ type: Object })
  copyProgress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  // Directory history for back/forward navigation (max 5 entries per pane)
  @property({ type: Array })
  leftHistory: string[] = []

  @property({ type: Number })
  leftHistoryIndex = -1

  @property({ type: Array })
  rightHistory: string[] = []

  @property({ type: Number })
  rightHistoryIndex = -1

  async connectedCallback() {
    super.connectedCallback()

    // Initialize PaneManager with current pane states
    this.paneManager = new PaneManager(this.leftPane, this.rightPane)

    // Load paths from localStorage using PaneManager
    const savedPaths = this.paneManager.loadPanePaths()

    if (savedPaths.left) {
      this.leftPane.currentPath = savedPaths.left
    }
    if (savedPaths.right) {
      this.rightPane.currentPath = savedPaths.right
    }

    // Update PaneManager with loaded paths
    this.paneManager.setPane('left', this.leftPane)
    this.paneManager.setPane('right', this.rightPane)

    // Initialize KeyboardHandler
    this.keyboardHandler = new KeyboardHandler(this)
    this.keyboardHandler.attach()

    // Load initial directories
    await this.loadDirectory('left', this.leftPane.currentPath)
    await this.loadDirectory('right', this.rightPane.currentPath)

    // Load available drives
    await this.loadDrives()

    // Load favorite paths from localStorage
    this.loadFavorites()

    // Add IPC listener for zip progress
    ;(window as any).electron.ipcRenderer.on('zip-progress', (data: any) => {
      this.zipProgress = data
      // Force UI update
      this.requestUpdate()
    })

    // Add IPC listener for copy progress
    ;(window as any).electron.ipcRenderer.on('copy-progress', (data: any) => {
      this.copyProgress = data
      // Force UI update
      this.requestUpdate()
    })

    // Add IPC listener for compare progress
    ;(window as any).electron.ipcRenderer.on(
      'compare-progress',
      (data: any) => {
        this.compareProgress = data
        // Force UI update
        this.requestUpdate()
      },
    )
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
      const response = await (
        await import('./commander/services/FileService.js')
      ).FileService.loadDrives()

      if (response.success && response.data) {
        this.availableDrives = response.data.drives
      }
    } catch (error: any) {
      console.error('Failed to load drives:', error)
    }
  }

  async handlePathClick(pane?: 'left' | 'right') {
    // Always show the dialog to allow managing favorites
    // even if there's only one drive (common on Mac)
    if (pane) {
      this.activePane = pane
    }
    this.showDriveSelector = true
    this.driveSelectorFocusedIndex = 0
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

    // Detach keyboard handler
    if (this.keyboardHandler) {
      this.keyboardHandler.detach()
    }
  }

  async loadDirectory(
    pane: 'left' | 'right',
    path: string,
    previousPath?: string,
  ) {
    try {
      this.setStatus('Loading directory...', 'normal')
      console.log(`Loading directory for ${pane}: ${path}`)

      const { FileService } = await import(
        './commander/services/FileService.js'
      )
      const response = await FileService.loadDirectory(path)

      console.log('Response:', response)

      if (response.success && response.data) {
        const data = response.data
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
            sortBy: this.leftPane.sortBy,
            sortDirection: this.leftPane.sortDirection,
          }
          // Update PaneManager and save to localStorage
          this.paneManager.setPane('left', this.leftPane)
          this.paneManager.savePanePaths()
        } else {
          this.rightPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: focusedIndex,
            filter: this.rightPane.filter,
            filterActive: this.rightPane.filterActive,
            sortBy: this.rightPane.sortBy,
            sortDirection: this.rightPane.sortDirection,
          }
          // Update PaneManager and save to localStorage
          this.paneManager.setPane('right', this.rightPane)
          this.paneManager.savePanePaths()
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
    // Sync activePane with PaneManager
    this.paneManager.setActivePane(this.activePane)
    return this.paneManager.getActivePane()
  }

  getInactivePane(): PaneState {
    // Sync activePane with PaneManager
    this.paneManager.setActivePane(this.activePane)
    return this.paneManager.getInactivePane()
  }

  updateActivePane(updates: Partial<PaneState>) {
    // Sync activePane with PaneManager
    this.paneManager.setActivePane(this.activePane)

    // Update through PaneManager
    const updatedPane = this.paneManager.updateActivePane(updates)

    // Sync back to reactive properties for Lit to detect changes
    if (this.activePane === 'left') {
      this.leftPane = updatedPane
    } else {
      this.rightPane = updatedPane
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

  async navigateToDirectory(path: string, addToHistory = true) {
    console.log('navigateToDirectory called with:', path)
    const currentPath = this.getActivePane().currentPath

    // Add to history if requested and path is different
    if (addToHistory && currentPath !== path) {
      this.addToHistory(currentPath)
    }

    await this.loadDirectory(this.activePane, path, currentPath)
  }

  // Add a path to the history of the active pane
  addToHistory(path: string) {
    this.historyService.addToHistory(this.activePane, path)
  }

  // Navigate back in history
  async navigateHistoryBack() {
    const result = this.historyService.navigate(this.activePane, -1)
    if (result) {
      await this.loadDirectory(this.activePane, result.path)
      this.setStatus(result.message, 'success')
    } else {
      this.setStatus('No history to go back', 'normal')
    }
  }

  // Navigate forward in history
  async navigateHistoryForward() {
    const result = this.historyService.navigate(this.activePane, 1)
    if (result) {
      await this.loadDirectory(this.activePane, result.path)
      this.setStatus(result.message, 'success')
    } else {
      this.setStatus('No history to go forward', 'normal')
    }
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

      const { FileService } = await import(
        './commander/services/FileService.js'
      )
      const response = await FileService.readFile(filePath)

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

  handleF2() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..') {
      this.setStatus('Cannot rename parent directory', 'error')
      return
    }

    this.renameDialog = {
      filePath: item.path,
      oldName: item.name,
      newName: item.name,
    }
  }

  handleF3() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]
    if (item && item.isFile) {
      this.viewFile(item.path)
    }
  }

  handleF12() {
    const selectedFiles = this.getSelectedFiles()
    if (selectedFiles.length > 0) {
      // Generate default ZIP filename based on selected file/folder
      let defaultName: string
      if (selectedFiles.length === 1) {
        // Single file/folder: use its name
        const fileName = selectedFiles[0].split(/[/\\]/).pop() || 'archive'
        // Remove extension if it has one
        let nameWithoutExt = fileName.includes('.')
          ? fileName.substring(0, fileName.lastIndexOf('.'))
          : fileName
        if (!nameWithoutExt) {
          // like .git
          nameWithoutExt = fileName
        }
        defaultName = `${nameWithoutExt}.zip`
      } else {
        // Multiple files: use timestamp
        const now = new Date()
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
        defaultName = `archive_${timestamp}.zip`
      }
      this.zipDialog = {
        files: selectedFiles,
        zipFileName: defaultName,
      }
    } else {
      this.setStatus('No files selected', 'error')
    }
  }

  updateZipFileName(value: string) {
    if (this.zipDialog) {
      this.zipDialog = {
        ...this.zipDialog,
        zipFileName: value,
      }
    }
  }

  async executeZip() {
    if (!this.zipDialog || !this.zipDialog.zipFileName.trim()) return

    const { files, zipFileName } = this.zipDialog
    const destPane = this.getInactivePane()
    const separator = destPane.currentPath.includes('\\') ? '\\' : '/'
    const zipFilePath = destPane.currentPath + separator + zipFileName

    try {
      // Reset progress
      this.zipProgress = null

      this.setStatus(`Zipping ${files.length} file(s)...`, 'normal')
      console.log('zip params:' + JSON.stringify(files))

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'zip',
          files: files,
          zipFilePath: zipFilePath,
        },
      )

      // Clear progress
      this.zipProgress = null

      if (response.success && response.data) {
        this.setStatus(
          `Successfully zipped ${response.data.filesAdded} file(s) to ${zipFileName}`,
          'success',
        )

        // Refresh inactive pane to show the new ZIP file
        await this.loadDirectory(
          this.activePane === 'left' ? 'right' : 'left',
          destPane.currentPath,
        )
      } else {
        this.setStatus(`Error zipping: ${response.error}`, 'error')
      }

      this.zipDialog = null
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      this.zipDialog = null
      this.zipProgress = null
    }
  }

  async cancelZip() {
    // Cancel any ongoing file operation
    await (window as any).electron.ipcRenderer.invoke('cancel-file-operation')

    this.zipDialog = null
    this.zipProgress = null
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

      const { FileService } = await import(
        './commander/services/FileService.js'
      )
      const response = await FileService.executeFile(filePath)

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

    // Get sorted list to navigate correctly
    let displayItems = pane.items
    if (pane.filterActive && pane.filter) {
      displayItems = displayItems.filter((item) =>
        item.name.toLowerCase().includes(pane.filter.toLowerCase()),
      )
    }
    displayItems = this.sortItems(displayItems, pane.sortBy, pane.sortDirection)

    // Find current focused item in sorted list
    const focusedItem = pane.items[pane.focusedIndex]
    const currentDisplayIndex = focusedItem
      ? displayItems.findIndex((item) => item.path === focusedItem.path)
      : 0

    // Calculate new display index
    const newDisplayIndex = Math.max(
      0,
      Math.min(displayItems.length - 1, currentDisplayIndex + delta),
    )

    // Find the new item in the sorted list
    const newItem = displayItems[newDisplayIndex]

    // Find its original index in pane.items
    const newOriginalIndex = pane.items.findIndex(
      (item) => item.path === newItem.path,
    )

    if (newOriginalIndex !== -1) {
      this.updateActivePane({
        focusedIndex: newOriginalIndex,
        selectedIndices: newSelected,
      })

      // Scroll into view (using display index)
      this.scrollItemIntoView(newDisplayIndex)
    }
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

    console.log('[UI] executeOperation started:', { type, files, destination })

    try {
      // Reset progress
      this.copyProgress = null

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

        console.log('[UI] Invoking copy operation:', {
          operation: type,
          sourcePath: file,
          destinationPath: destPath,
        })

        const response = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: type,
            sourcePath: file,
            destinationPath: destPath,
          },
        )

        console.log('[UI] Copy operation response:', response)

        if (response.success) {
          successCount++
        } else {
          this.setStatus(`Error with ${fileName}: ${response.error}`, 'error')
          break
        }
      }

      // Clear progress
      this.copyProgress = null

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
      // Clear progress on error
      this.copyProgress = null
    }
  }

  async cancelOperation() {
    // Cancel any ongoing file operation
    await (window as any).electron.ipcRenderer.invoke('cancel-file-operation')

    this.operationDialog = null
    this.copyProgress = null
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
      const { FileService } = await import(
        './commander/services/FileService.js'
      )

      for (const file of files) {
        const fileName = file.split(/[/\\]/).pop() || 'file'

        const response = await FileService.delete(file)

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

  openQuickLaunch(initialChar: string) {
    this.quickLaunchDialog = {
      command: initialChar,
    }
  }

  updateQuickLaunchCommand(value: string) {
    if (this.quickLaunchDialog) {
      this.quickLaunchDialog = {
        command: value,
      }
    }
  }

  async executeQuickLaunch() {
    if (!this.quickLaunchDialog || !this.quickLaunchDialog.command.trim())
      return

    const { command } = this.quickLaunchDialog
    const pane = this.getActivePane()

    try {
      this.setStatus(`Executing: ${command}`, 'normal')

      // Execute command in current directory
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'execute-command',
          command: command,
          workingDir: pane.currentPath,
        },
      )

      if (response.success && response.data) {
        // Show output in viewer if there's content
        if (response.data.output && response.data.output.trim()) {
          this.viewerFile = {
            path: `Command: ${command}`,
            content: response.data.output,
            size: 0,
            isImage: false,
          }
        }
        this.setStatus('Command executed successfully', 'success')
      } else {
        this.setStatus(`Error: ${response.error || 'Unknown error'}`, 'error')
      }

      this.quickLaunchDialog = null

      // Refresh active pane in case files changed
      await this.loadDirectory(this.activePane, pane.currentPath)
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      this.quickLaunchDialog = null
    }
  }

  cancelQuickLaunch() {
    this.quickLaunchDialog = null
  }

  updateRename(value: string) {
    if (this.renameDialog) {
      this.renameDialog = {
        ...this.renameDialog,
        newName: value,
      }
    }
  }

  async executeRename() {
    if (!this.renameDialog || !this.renameDialog.newName.trim()) return

    const { filePath, newName } = this.renameDialog

    try {
      this.setStatus(`Renaming file...`, 'normal')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'rename',
          sourcePath: filePath,
          destinationPath: newName,
        },
      )

      if (response.success) {
        this.setStatus(`File renamed successfully`, 'success')

        // Refresh active pane
        await this.loadDirectory(
          this.activePane,
          this.getActivePane().currentPath,
        )
      } else {
        this.setStatus(`Error renaming: ${response.error}`, 'error')
      }

      this.renameDialog = null
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      this.renameDialog = null
    }
  }

  cancelRename() {
    this.renameDialog = null
  }

  async handleCompare() {
    try {
      this.setStatus(
        `Comparing directories${this.compareRecursive ? ' (recursive)' : ''}...`,
        'normal',
      )

      // Open dialog immediately with empty result and waiting state
      this.compareWaiting = true
      this.compareProgress = null
      this.compareDialog = {
        result: {
          summary: {
            totalLeft: 0,
            totalRight: 0,
            onlyInLeft: 0,
            onlyInRight: 0,
            different: 0,
            identical: 0,
          },
          onlyInLeft: [],
          onlyInRight: [],
          different: [],
          identical: [],
        },
        recursive: this.compareRecursive,
      }

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
      this.compareProgress = null

      if (response.success && response.data) {
        this.compareDialog = {
          result: response.data,
          recursive: this.compareRecursive,
        }
        this.setStatus('Vergleich abgeschlossen', 'success')
      } else {
        this.compareDialog = null
        this.setStatus(`Fehler: ${response.error}`, 'error')
      }
    } catch (error: any) {
      // Clear waiting state on error
      this.compareWaiting = false
      this.compareProgress = null
      this.compareDialog = null
      this.setStatus(`Fehler: ${error.message}`, 'error')
    }
  }

  closeCompare() {
    this.compareDialog = null
  }

  async toggleCompareRecursive() {
    this.compareRecursive = !this.compareRecursive
    this.setStatus(
      `recursive compare: ${this.compareRecursive ? 'on' : 'off'}`,
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

  sortItems(
    items: FileItem[],
    sortBy: string,
    sortDirection: string,
  ): FileItem[] {
    // Separate parent directory (..) from other items
    const parentDir = items.find((item) => item.name === '..')
    const itemsToSort = items.filter((item) => item.name !== '..')

    const sorted = [...itemsToSort].sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, {
            numeric: true,
          })
          break
        case 'size':
          comparison = a.size - b.size
          break
        case 'modified':
          comparison =
            new Date(a.modified).getTime() - new Date(b.modified).getTime()
          break
        case 'extension':
          const extA = a.isDirectory ? '' : a.name.split('.').pop() || ''
          const extB = b.isDirectory ? '' : b.name.split('.').pop() || ''
          comparison = extA.localeCompare(extB)
          if (comparison === 0) {
            comparison = a.name.localeCompare(b.name, undefined, {
              numeric: true,
            })
          }
          break
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    // Add parent directory back at the beginning if it exists
    return parentDir ? [parentDir, ...sorted] : sorted
  }

  toggleSort(sortBy: 'name' | 'size' | 'modified' | 'extension') {
    const pane = this.getActivePane()

    if (pane.sortBy === sortBy) {
      // Toggle direction
      const newDirection = pane.sortDirection === 'asc' ? 'desc' : 'asc'
      this.updateActivePane({ sortDirection: newDirection })
    } else {
      // Change sort field
      this.updateActivePane({ sortBy, sortDirection: 'asc' })
    }

    // Save sort settings through PaneManager
    this.paneManager.setActivePane(this.activePane)
    this.paneManager.saveSortSettings(this.activePane)

    this.setStatus(
      `Sorted by ${sortBy} (${this.getActivePane().sortDirection})`,
      'success',
    )
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
          <div class="function-key" @click=${() => this.handleF12()}>
            <span class="function-key-label">F12</span>
            <span class="function-key-action">📦 zip</span>
          </div>
        </div>

        <div class="status-bar ${this.statusType}">${this.statusMessage}</div>

        ${this.viewerFile
          ? html`<viewer-dialog
              .file=${this.viewerFile}
              @close=${this.closeViewer}
            ></viewer-dialog>`
          : ''}
        ${this.operationDialog
          ? html`<operation-dialog
              .data=${this.operationDialog}
              .progress=${this.copyProgress}
              @close=${this.cancelOperation}
              @execute=${this.executeOperation}
              @update-destination=${(e: CustomEvent) =>
                this.updateDestination(e.detail)}
            ></operation-dialog>`
          : ''}
        ${this.deleteDialog
          ? html`<delete-dialog
              .files=${this.deleteDialog.files}
              @close=${this.cancelDelete}
              @execute=${this.executeDelete}
            ></delete-dialog>`
          : ''}
        ${this.commandDialog
          ? html`<command-dialog
              .command=${this.commandDialog.command}
              .workingDir=${this.commandDialog.workingDir}
              @close=${this.cancelCommand}
              @execute=${this.executeCommand}
              @update-command=${(e: CustomEvent) =>
                this.updateCommand(e.detail)}
            ></command-dialog>`
          : ''}
        ${this.quickLaunchDialog
          ? html`<quick-launch-dialog
              .command=${this.quickLaunchDialog.command}
              .workingDir=${this.getActivePane().currentPath}
              @close=${this.cancelQuickLaunch}
              @execute=${this.executeQuickLaunch}
              @update-command=${(e: CustomEvent) =>
                this.updateQuickLaunchCommand(e.detail)}
            ></quick-launch-dialog>`
          : ''}
        ${this.renameDialog
          ? html`<rename-dialog
              .oldName=${this.renameDialog.oldName}
              .newName=${this.renameDialog.newName}
              @close=${this.cancelRename}
              @execute=${this.executeRename}
              @update-name=${(e: CustomEvent) => this.updateRename(e.detail)}
            ></rename-dialog>`
          : ''}
        ${this.zipDialog
          ? html`<zip-dialog
              .files=${this.zipDialog.files}
              .zipFileName=${this.zipDialog.zipFileName}
              .destPath=${this.getInactivePane().currentPath}
              .progress=${this.zipProgress}
              @close=${this.cancelZip}
              @execute=${this.executeZip}
              @update-filename=${(e: CustomEvent) =>
                this.updateZipFileName(e.detail)}
            ></zip-dialog>`
          : ''}
        ${this.compareDialog
          ? html`<compare-dialog
              .result=${this.compareDialog.result}
              .recursive=${this.compareDialog.recursive}
              .isWaiting=${this.compareWaiting}
              .progress=${this.compareProgress}
              @close=${this.closeCompare}
              @toggle-recursive=${this.toggleCompareRecursive}
              @recompare=${this.handleCompare}
            ></compare-dialog>`
          : ''}
        ${this.showDriveSelector
          ? html`<drive-selector-dialog
              .drives=${this.availableDrives}
              .favorites=${this.favoritePaths}
              .currentPath=${this.getActivePane().currentPath}
              .focusedIndex=${this.driveSelectorFocusedIndex}
              @close=${this.closeDriveSelector}
              @select=${(e: CustomEvent) => this.selectDrive(e.detail)}
              @toggle-favorite=${(e: CustomEvent) =>
                this.toggleFavorite(e.detail)}
            ></drive-selector-dialog>`
          : ''}
        ${this.showHelp
          ? html`<help-dialog
              .open=${this.showHelp}
              @close=${this.closeHelp}
            ></help-dialog>`
          : ''}
      </div>
    `
  }

  renderPane(side: 'left' | 'right', pane: PaneState) {
    const isActive = this.activePane === side

    // Filter items based on filter text
    let filteredItems =
      pane.filterActive && pane.filter
        ? pane.items.filter((item) =>
            item.name.toLowerCase().includes(pane.filter.toLowerCase()),
          )
        : pane.items

    // Apply sorting
    filteredItems = this.sortItems(
      filteredItems,
      pane.sortBy,
      pane.sortDirection,
    )

    // Find the focused item in the sorted/filtered list
    const focusedItem = pane.items[pane.focusedIndex]
    const displayFocusedIndex = focusedItem
      ? filteredItems.findIndex((item) => item.path === focusedItem.path)
      : 0

    // Map selected indices from original items to filtered/sorted items
    const displaySelectedIndices = new Set<number>()
    pane.selectedIndices.forEach((originalIndex) => {
      const selectedItem = pane.items[originalIndex]
      if (selectedItem) {
        const displayIndex = filteredItems.findIndex(
          (item) => item.path === selectedItem.path,
        )
        if (displayIndex !== -1) {
          displaySelectedIndices.add(displayIndex)
        }
      }
    })

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

        <!-- Sort Controls -->
        <div
          style="padding: 0.25rem 0.5rem; background: #334155; border-bottom: 1px solid #475569; display: flex; gap: 0.25rem; font-size: 0.75rem;"
        >
          <button
            @click=${(e: Event) => {
              e.stopPropagation()
              if (isActive) this.toggleSort('name')
            }}
            style="padding: 0.25rem 0.5rem; background: ${pane.sortBy === 'name'
              ? '#0ea5e9'
              : '#475569'}; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
            title="Sort by name"
          >
            📝
            ${pane.sortBy === 'name'
              ? pane.sortDirection === 'asc'
                ? '↑'
                : '↓'
              : ''}
          </button>
          <button
            @click=${(e: Event) => {
              e.stopPropagation()
              if (isActive) this.toggleSort('size')
            }}
            style="padding: 0.25rem 0.5rem; background: ${pane.sortBy === 'size'
              ? '#0ea5e9'
              : '#475569'}; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
            title="Sort by size"
          >
            📊
            ${pane.sortBy === 'size'
              ? pane.sortDirection === 'asc'
                ? '↑'
                : '↓'
              : ''}
          </button>
          <button
            @click=${(e: Event) => {
              e.stopPropagation()
              if (isActive) this.toggleSort('modified')
            }}
            style="padding: 0.25rem 0.5rem; background: ${pane.sortBy ===
            'modified'
              ? '#0ea5e9'
              : '#475569'}; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
            title="Sort by modified date"
          >
            🕐
            ${pane.sortBy === 'modified'
              ? pane.sortDirection === 'asc'
                ? '↑'
                : '↓'
              : ''}
          </button>
          <button
            @click=${(e: Event) => {
              e.stopPropagation()
              if (isActive) this.toggleSort('extension')
            }}
            style="padding: 0.25rem 0.5rem; background: ${pane.sortBy ===
            'extension'
              ? '#0ea5e9'
              : '#475569'}; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
            title="Sort by extension"
          >
            🏷️
            ${pane.sortBy === 'extension'
              ? pane.sortDirection === 'asc'
                ? '↑'
                : '↓'
              : ''}
          </button>
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
            (item, displayIndex) => html`
              <div
                class="file-item ${displayFocusedIndex === displayIndex
                  ? 'focused'
                  : ''} ${displaySelectedIndices.has(displayIndex)
                  ? 'selected'
                  : ''}"
                @click=${(e: MouseEvent) => {
                  // Find original index in pane.items
                  const originalIndex = pane.items.findIndex(
                    (i) => i.path === item.path,
                  )
                  if (originalIndex !== -1) {
                    this.handleItemClick(originalIndex, e)
                  }
                }}
                @dblclick=${() => {
                  // Find original index in pane.items
                  const originalIndex = pane.items.findIndex(
                    (i) => i.path === item.path,
                  )
                  if (originalIndex !== -1) {
                    this.handleItemDoubleClick(originalIndex)
                  }
                }}
              >
                <span class="file-icon"
                  >${item.isDirectory
                    ? '📁'
                    : item.name.toLowerCase().endsWith('.zip')
                      ? '📦'
                      : this.getFileIcon(item)}</span
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
}

customElements.define('simple-commander', Commander)
