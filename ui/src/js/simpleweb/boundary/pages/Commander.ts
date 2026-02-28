import { LitElement, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../components/CompareDialog'
import '../components/FileCompare'

// Import from refactored modules
import { commanderStyles } from './commander/commander.styles.js'
import type { FileItem, PaneState } from './commander/commander.types.js'
import { FavoritesService } from './commander/services/FavoritesService.js'
import {
  cancelOperation,
  executeDelete,
  executeFileOperation,
  executeRename,
  executeZip,
} from './commander/services/FileOperationsHandler.js'
import { HistoryService } from './commander/services/HistoryService.js'
import { KeyboardHandler } from './commander/services/KeyboardHandler.js'
import { PaneManager } from './commander/services/PaneManager.js'
import { settingsService } from './commander/services/SettingsService.js'
import { FILE_ICONS } from './commander/utils/file-utils.js'
import {
  formatCompactDate,
  formatFileSize,
} from './commander/utils/FormatUtils.js'
import {
  getParentPath,
  getPathSeparator,
  maskFtpPassword,
} from './commander/utils/PathUtils.js'
import { getNextSortState, sortItems } from './commander/utils/SortUtils.js'

// Import dialog components
import './commander/dialogs/index.js'

export class Commander extends LitElement {
  static styles = commanderStyles

  // Service instances
  private historyService = new HistoryService()
  private favoritesService = new FavoritesService()
  private paneManager!: PaneManager
  private keyboardHandler!: KeyboardHandler

  // Use imported FILE_ICONS
  fileIcons = FILE_ICONS

  getFileIcon(item: FileItem): string {
    if (item.isDirectory) return '📁'
    const ext = item.name.split('.').pop()?.toLowerCase()
    return (ext && this.fileIcons[ext]) ?? '📄'
  }

  // Delegate to imported utility
  maskFtpPassword = maskFtpPassword

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
  availableNetworkShares: any[] = []

  @property({ type: Object })
  leftDriveInfo: { freeSpace: number | null; totalSpace: number | null } = {
    freeSpace: null,
    totalSpace: null,
  }

  @property({ type: Object })
  rightDriveInfo: { freeSpace: number | null; totalSpace: number | null } = {
    freeSpace: null,
    totalSpace: null,
  }

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
  mkdirDialog: { currentPath: string; folderName: string } | null = null

  @property({ type: Object })
  fileCompareDialog: { leftPath: string; rightPath: string } | null = null

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

  @property({ type: Object })
  ftpDownloadProgress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  @property({ type: Object })
  ftpUploadProgress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  @property({ type: Object })
  deleteProgress: { message: string } | null = null

  // Clipboard state for file operations
  clipboardFiles: { files: string[]; operation: 'copy' | 'cut' } | null = null

  @property({ type: Object })
  directorySizeDialog: {
    name: string
    path: string
    isCalculating: boolean
    totalSize: number
    fileCount: number
    directoryCount: number
    currentFile: string
    isFile?: boolean
    currentSize?: number
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

  @property({ type: Object })
  contextMenu: {
    fileName: string
    isDirectory: boolean
    selectedCount: number
  } | null = null

  @property({ type: Object })
  openWithDialog: {
    fileName: string
    filePath: string
    applications: Array<{ name: string; command: string; isDefault: boolean }>
    loading: boolean
  } | null = null

  @property({ type: Object })
  textEditorDialog: {
    fileName: string
    filePath: string
    content: string
    loading: boolean
    saving: boolean
    error: string
  } | null = null

  @property({ type: Object })
  searchDialog: {
    searchPath: string
    searching: boolean
  } | null = null

  @property({ type: Boolean })
  showSettingsDialog = false

  @property({ type: Boolean })
  showFTPDialog = false

  @property({ type: String })
  pendingFtpUrl: string | null = null

  private ftpConnectionCancelled = false

  @property({ type: Boolean })
  showSMBDialog = false

  @property({ type: String })
  pendingSmbPath: string | null = null

  @property({ type: String })
  pendingSmbPane: 'left' | 'right' = 'left'

  private smbConnectionCancelled = false

  // Track internal drag operations
  private isDraggingInternal = false
  private dragSourcePath: string | null = null
  private dragPaths: string[] | null = null
  private dragLeaveHandler: ((e: DragEvent) => void) | null = null

  async connectedCallback() {
    super.connectedCallback()

    // Initialize PaneManager with current pane states
    this.paneManager = new PaneManager(this.leftPane, this.rightPane)

    // Check if we should navigate to a specific path (from DocManager or other sources)
    const navigateToPath = sessionStorage.getItem('commander-navigate-to')
    if (navigateToPath) {
      console.log(
        '[Commander] Navigating to path from sessionStorage:',
        navigateToPath,
      )
      this.leftPane.currentPath = navigateToPath
      // Clear the sessionStorage item after reading
      sessionStorage.removeItem('commander-navigate-to')
    } else {
      // Load paths from localStorage using PaneManager
      const savedPaths = this.paneManager.loadPanePaths()

      if (savedPaths.left) {
        this.leftPane.currentPath = savedPaths.left
      }
      if (savedPaths.right) {
        this.rightPane.currentPath = savedPaths.right
      }
    }

    // Update PaneManager with loaded paths
    this.paneManager.setPane('left', this.leftPane)
    this.paneManager.setPane('right', this.rightPane)

    // Initialize KeyboardHandler
    this.keyboardHandler = new KeyboardHandler(this)
    this.keyboardHandler.attach()

    // Load initial directories in parallel for faster startup
    await Promise.all([
      this.loadDirectory('left', this.leftPane.currentPath),
      this.loadDirectory('right', this.rightPane.currentPath),
    ])

    // Load available drives in background (don't block UI)
    this.loadDrives()

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

    // Add IPC listener for FTP download progress
    ;(window as any).electron.ipcRenderer.on(
      'ftp-download-progress',
      (data: any) => {
        this.ftpDownloadProgress = data
        // Force UI update
        this.requestUpdate()
      },
    )

    // Add IPC listener for FTP upload progress
    ;(window as any).electron.ipcRenderer.on(
      'ftp-upload-progress',
      (data: any) => {
        this.ftpUploadProgress = data
        // Force UI update
        this.requestUpdate()
      },
    )

    // Add IPC listener for compare progress
    ;(window as any).electron.ipcRenderer.on(
      'compare-progress',
      (data: any) => {
        this.compareProgress = data
        // Force UI update
        this.requestUpdate()
      },
    )

    // Add IPC listener for directory size progress
    ;(window as any).electron.ipcRenderer.on(
      'directory-size-progress',
      (data: any) => {
        if (this.directorySizeDialog) {
          this.directorySizeDialog = {
            ...this.directorySizeDialog,
            currentFile: data.fileName,
            fileCount: data.current,
            currentSize: data.totalSize,
          }
          // Force UI update
          this.requestUpdate()
        }
      },
    )
  }

  loadFavorites() {
    this.favoritePaths = this.favoritesService.load()
  }

  toggleFavorite(path: string) {
    const result = this.favoritesService.toggle(path)
    this.favoritePaths = this.favoritesService.getAll()
    this.setStatus(result.message, 'success')
  }

  moveFavoriteUp(path: string) {
    if (this.favoritesService.moveUp(path)) {
      this.favoritePaths = this.favoritesService.getAll()
      this.setStatus(`Moved up: ${path}`, 'success')
    }
  }

  moveFavoriteDown(path: string) {
    if (this.favoritesService.moveDown(path)) {
      this.favoritePaths = this.favoritesService.getAll()
      this.setStatus(`Moved down: ${path}`, 'success')
    }
  }

  addToFavorites(path: string) {
    if (this.favoritesService.add(path)) {
      this.favoritePaths = this.favoritesService.getAll()
      this.setStatus(`Added to favorites: ${path}`, 'success')
    }
  }

  isFavorite(path: string): boolean {
    return this.favoritesService.isFavorite(path)
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

    // Also load network shares (Windows only)
    this.loadNetworkShares()
  }

  async loadNetworkShares() {
    try {
      const response = await (
        await import('./commander/services/FileService.js')
      ).FileService.loadNetworkShares()

      if (response.success && response.shares) {
        this.availableNetworkShares = response.shares
      }
    } catch (error: any) {
      console.error('Failed to load network shares:', error)
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
      // Check if this is a network path (SMB/UNC) - show special loading message
      const isNetworkPath = path.startsWith('\\\\') || path.startsWith('//')
      if (isNetworkPath) {
        this.setStatus(
          `Connecting to ${path} (this may take up to 60 seconds)...`,
          'normal',
        )
      } else {
        this.setStatus(`Loading ${path}`, 'normal')
      }
      // Don't log paths as FTP URLs contain passwords
      // console.log(`Loading directory for ${pane}: ${path}`)

      // Check if this is an FTP path
      if (path.startsWith('ftp://')) {
        console.log('FTP path detected, calling FTP list operation')
        const ftpResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'ftp',
          { operation: 'list', ftpUrl: path },
        )

        console.log('FTP Response:', ftpResponse)

        if (ftpResponse.success && ftpResponse.data) {
          const data = ftpResponse.data
          const items: FileItem[] = []

          // Add parent directory if not at root
          // Extract path after ftp://user@host:port
          const ftpMatch = path.match(/^ftp:\/\/[^/]+(.*)$/)
          const remotePath = ftpMatch ? ftpMatch[1] : '/'
          // Show ".." if we're not at root (remotePath is more than just "/" or empty)
          if (remotePath && remotePath !== '/' && remotePath.length > 1) {
            const parentUrl =
              path.substring(0, path.lastIndexOf('/')) ||
              path.replace(/\/[^/]*\/?$/, '')
            items.push({
              name: '..',
              path: parentUrl || path.match(/^ftp:\/\/[^/]+/)?.[0] + '/',
              size: 0,
              created: new Date(),
              modified: new Date(),
              isDirectory: true,
              isFile: false,
            })
          }

          if (data.directories) items.push(...data.directories)
          if (data.files) items.push(...data.files)

          // Find the index of the previous directory (for focusing when going up)
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
              currentPath: data.path || path,
              items,
              selectedIndices: new Set(),
              focusedIndex: focusedIndex,
              filter: this.leftPane.filter,
              filterActive: this.leftPane.filterActive,
              sortBy: this.leftPane.sortBy,
              sortDirection: this.leftPane.sortDirection,
            }
            this.paneManager.setPane('left', this.leftPane)
          } else {
            this.rightPane = {
              currentPath: data.path || path,
              items,
              selectedIndices: new Set(),
              focusedIndex: focusedIndex,
              filter: this.rightPane.filter,
              filterActive: this.rightPane.filterActive,
              sortBy: this.rightPane.sortBy,
              sortDirection: this.rightPane.sortDirection,
            }
            this.paneManager.setPane('right', this.rightPane)
          }

          const dirCount =
            data.summary?.totalDirectories ?? (data.directories?.length || 0)
          const fileCount =
            data.summary?.totalFiles ?? (data.files?.length || 0)
          this.setStatus(
            `${dirCount} folders, ${fileCount} files (FTP)`,
            'success',
          )
          return
        } else {
          const errorMsg = ftpResponse.error || 'Connection failed'
          this.setStatus(`FTP Error: ${errorMsg}`, 'error')
          console.error('FTP Error:', errorMsg)
          throw new Error(errorMsg)
        }
      }

      const { FileService } =
        await import('./commander/services/FileService.js')
      const response = await FileService.loadDirectory(path)

      console.log('Response:', response)

      // Check if SMB authentication is needed (needsAuth is inside response.data due to IPC bridge wrapping)
      const innerData = response.data as any
      if (innerData?.needsAuth) {
        const isNetworkPath =
          path.startsWith('\\\\') ||
          path.startsWith('//') ||
          path.startsWith('smb://')
        if (isNetworkPath) {
          this.pendingSmbPath = innerData.uncPath || path
          this.pendingSmbPane = pane
          this.showSMBDialog = true
          this.setStatus('SMB authentication required', 'normal')
          return
        }
      }

      // IPC bridge wraps result as { success: true, data: <backend_result> }
      // Check the inner success flag for actual errors (e.g. mount failures)
      const data = response.data as any
      if (
        response.success &&
        data &&
        data.success !== false &&
        data.directories
      ) {
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
        if (Array.isArray(data.directories)) {
          items.push(...data.directories)
        }
        if (Array.isArray(data.files)) {
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
          // Fetch drive info for status display
          this.fetchDriveInfo('left', data.path)
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
          // Fetch drive info for status display
          this.fetchDriveInfo('right', data.path)
        }

        // Display status with safety checks
        const dirCount = data.summary?.totalDirectories ?? 0
        const fileCount = data.summary?.totalFiles ?? 0
        this.setStatus(`${dirCount} folders, ${fileCount} files`, 'success')
      } else {
        // Request failed - ensure pane has valid state first
        console.log('Failed to load directory:', data?.error || response.error)
        const currentPane = pane === 'left' ? this.leftPane : this.rightPane
        if (!currentPane.items || currentPane.items.length === 0) {
          // Set minimal state so UI doesn't crash
          const emptyState = {
            currentPath: path,
            items: [],
            selectedIndices: new Set<number>(),
            focusedIndex: 0,
            filter: currentPane.filter || '',
            filterActive: false,
            sortBy: currentPane.sortBy || 'name',
            sortDirection: currentPane.sortDirection || 'asc',
          }
          if (pane === 'left') {
            this.leftPane = emptyState
            this.paneManager.setPane('left', this.leftPane)
          } else {
            this.rightPane = emptyState
            this.paneManager.setPane('right', this.rightPane)
          }
        }

        // Try to go up one level
        const parentPath = this.getParentPath(path)

        // If we're already at the root or parent is the same as current, stop
        if (parentPath === path) {
          const errorMsg = data?.error || response.error || 'Unknown error'
          this.setStatus(`Error: ${errorMsg}`, 'error')
          console.error('Load directory error:', errorMsg)
          return
        }

        // Recursively try the parent directory
        await this.loadDirectory(pane, parentPath, previousPath)
      }
    } catch (error: any) {
      console.error('Exception loading directory:', error)

      // Ensure pane state is valid even after error
      const currentPane = pane === 'left' ? this.leftPane : this.rightPane
      if (!currentPane.items || currentPane.items.length === 0) {
        // Set minimal state so UI doesn't crash
        const emptyState = {
          currentPath: path,
          items: [],
          selectedIndices: new Set<number>(),
          focusedIndex: 0,
          filter: currentPane.filter || '',
          filterActive: false,
          sortBy: currentPane.sortBy || 'name',
          sortDirection: currentPane.sortDirection || 'asc',
        }
        if (pane === 'left') {
          this.leftPane = emptyState
          this.paneManager.setPane('left', this.leftPane)
        } else {
          this.rightPane = emptyState
          this.paneManager.setPane('right', this.rightPane)
        }
      }

      // Try to go up one level
      const parentPath = this.getParentPath(path)

      // If we're already at the root or parent is the same as current, stop
      if (parentPath === path) {
        this.setStatus(`Error: ${error.message}`, 'error')
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

  /**
   * Load directory with SMB authentication
   */
  async loadDirectoryWithSmbUrl(
    pane: 'left' | 'right',
    path: string,
    smbUrl: string,
  ) {
    try {
      this.setStatus(`Connecting to ${path}...`, 'normal')
      console.log(`Loading directory with SMB credentials for ${pane}: ${path}`)

      const { FileService } =
        await import('./commander/services/FileService.js')
      const response = await FileService.loadDirectory(path, smbUrl)

      console.log('SMB Response:', response)

      // IPC bridge wraps result as { success: true, data: <backend_result> }
      // Check the inner success flag for actual mount/listing errors
      const data = response.data as any
      if (!data || data.success === false) {
        throw new Error(data?.error || 'Failed to mount SMB share')
      }

      if (data.directories && data.files) {
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

        // Add directories first, then files
        if (Array.isArray(data.directories)) {
          items.push(...data.directories)
        }
        if (Array.isArray(data.files)) {
          items.push(...data.files)
        }

        console.log(`Loaded ${items.length} items for ${pane}`)

        if (pane === 'left') {
          this.leftPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: 0,
            filter: this.leftPane.filter,
            filterActive: this.leftPane.filterActive,
            sortBy: this.leftPane.sortBy,
            sortDirection: this.leftPane.sortDirection,
          }
          this.paneManager.setPane('left', this.leftPane)
          this.paneManager.savePanePaths()
          this.fetchDriveInfo('left', data.path)
        } else {
          this.rightPane = {
            currentPath: data.path,
            items,
            selectedIndices: new Set(),
            focusedIndex: 0,
            filter: this.rightPane.filter,
            filterActive: this.rightPane.filterActive,
            sortBy: this.rightPane.sortBy,
            sortDirection: this.rightPane.sortDirection,
          }
          this.paneManager.setPane('right', this.rightPane)
          this.paneManager.savePanePaths()
          this.fetchDriveInfo('right', data.path)
        }

        const dirCount = data.summary?.totalDirectories ?? 0
        const fileCount = data.summary?.totalFiles ?? 0
        this.setStatus(`${dirCount} folders, ${fileCount} files`, 'success')
      } else {
        throw new Error(data?.error || 'Failed to mount SMB share')
      }
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      console.error('Load directory with SMB error:', error)
      throw error
    }
  }

  // Delegate to imported utility
  getParentPath = getParentPath

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

  async fetchDriveInfo(pane: 'left' | 'right', path: string) {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'drive-info', drivePath: path },
      )

      // Handle both response structures: response.data.freeSpace or response.freeSpace
      const data = response.data || response
      if (
        data &&
        (data.freeSpace !== undefined || data.totalSpace !== undefined)
      ) {
        const info = {
          freeSpace: data.freeSpace ?? null,
          totalSpace: data.totalSpace ?? null,
        }
        if (pane === 'left') {
          this.leftDriveInfo = info
        } else {
          this.rightDriveInfo = info
        }
      }
    } catch (error) {
      console.error('Failed to fetch drive info:', error)
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

  getOperationProgress(): {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null {
    // Return the active progress (FTP download, FTP upload, or regular copy)
    return (
      this.ftpDownloadProgress || this.ftpUploadProgress || this.copyProgress
    )
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

    // Use Shift key for multi-select
    const isMultiSelectKey = event.shiftKey

    if (isMultiSelectKey) {
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
      // For files, determine if we should view them or show "open with" dialog
      const isImage = this.isImageFile(item.path)
      const isText = this.isTextFile(item.path)
      const size500KB = 500 * 1024

      // View directly if: image file OR text file < 500KB
      if (isImage || (isText && item.size < size500KB)) {
        console.log('Viewing file:', item.path)
        await this.viewFile(item.path)
      } else {
        // Show "open with" dialog for other files
        console.log('Showing open with dialog for:', item.path)
        await this.handleOpenWith()
      }
    }
  }

  handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    // Allow drop - show move if internal drag, copy if external
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.isDraggingInternal ? 'move' : 'copy'
    }
  }

  async handleDrop(
    e: DragEvent,
    targetPath?: string,
    dropPane?: 'left' | 'right',
  ) {
    e.preventDefault()
    e.stopPropagation()

    // Switch active pane to the drop target so the UI reflects where files land
    if (dropPane && dropPane !== this.activePane) {
      this.activePane = dropPane
    }

    // Check if this is an internal drag (within Commander) or external
    const isInternalDrag = this.isDraggingInternal

    // Use target path if provided (dropping on folder), otherwise use the pane that received the drop
    const destinationPath =
      targetPath ||
      (dropPane === 'left'
        ? this.leftPane.currentPath
        : dropPane === 'right'
          ? this.rightPane.currentPath
          : this.getActivePane().currentPath)

    const shouldMove =
      isInternalDrag &&
      this.dragSourcePath &&
      this.dragSourcePath !== destinationPath

    // Store source path before resetting for later use in refresh
    const sourcePath = this.dragSourcePath

    // Reset drag state
    this.isDraggingInternal = false
    this.dragSourcePath = null

    // Get file paths: internal web DnD uses dataTransfer data, external/macOS uses files
    const filePaths: string[] = []

    const internalData = e.dataTransfer?.getData(
      'application/x-commander-paths',
    )
    if (isInternalDrag && internalData) {
      // Internal drag on Windows/Linux: paths stored in dataTransfer
      try {
        const parsed = JSON.parse(internalData)
        filePaths.push(...parsed)
      } catch {
        console.error('[drop] Failed to parse internal drag paths')
      }
    } else {
      // External drag or macOS internal drag: read from files
      const files = e.dataTransfer?.files
      if (!files || files.length === 0) {
        console.log('[drop] No files dropped')
        return
      }
      for (const file of Array.from(files)) {
        try {
          const filePath = window.electron?.getPathForFile?.(file)
          if (filePath) {
            filePaths.push(filePath)
          }
        } catch (error) {
          console.error('[drop] Error getting path for file:', file.name, error)
        }
      }
    }

    if (filePaths.length === 0) {
      console.error('[drop] No valid file paths found')
      this.setStatus('Error: Could not get file paths', 'error')
      return
    }

    console.log(
      '[drop]',
      filePaths.length,
      'files into:',
      destinationPath,
      '| move:',
      shouldMove,
    )

    try {
      const { FileService } =
        await import('./commander/services/FileService.js')

      if (shouldMove) {
        // Move files (internal drag between panes)
        let movedCount = 0
        for (const sourcePath of filePaths) {
          const fileName = sourcePath.split(/[\\/]/).pop()
          const destPath = `${destinationPath}/${fileName}`

          // Skip if source and destination are the same
          if (sourcePath === destPath) {
            console.log(
              '[drop] Skipping - file already in destination:',
              fileName,
            )
            continue
          }

          console.log('[drop] Moving:', sourcePath, 'to:', destPath)

          const result = await FileService.move(sourcePath, destPath)
          if (!result.success) {
            console.error('[drop] Failed to move:', result.error)
            this.setStatus(
              `Failed to move ${fileName}: ${result.error}`,
              'error',
            )
            return
          }
          movedCount++
        }

        if (movedCount === 0) {
          this.setStatus('Files already in destination', 'normal')
        } else {
          this.setStatus(
            `Moved ${movedCount} file(s) to ${destinationPath}`,
            'success',
          )
        }
      } else {
        // Copy files (external drag or same directory)
        let copiedCount = 0
        for (const sourcePath of filePaths) {
          const fileName = sourcePath.split(/[\\/]/).pop()
          const destPath = `${destinationPath}/${fileName}`

          // Skip if source and destination are the same
          if (sourcePath === destPath) {
            console.log(
              '[drop] Skipping - file already in destination:',
              fileName,
            )
            continue
          }

          console.log('[drop] Copying:', sourcePath, 'to:', destPath)

          const result = await FileService.copy(sourcePath, destPath)
          if (!result.success) {
            console.error('[drop] Failed to copy:', result.error)
            this.setStatus(
              `Failed to copy ${fileName}: ${result.error}`,
              'error',
            )
            return
          }
          copiedCount++
        }

        if (copiedCount === 0) {
          this.setStatus('Files already in destination', 'normal')
        } else {
          this.setStatus(
            `Copied ${copiedCount} file(s) to ${destinationPath}`,
            'success',
          )
        }
      }

      // Refresh both panes if moving (source and destination)
      if (shouldMove && sourcePath) {
        // Refresh destination pane (where the drop happened)
        if (dropPane) {
          await this.loadDirectory(dropPane, destinationPath, destinationPath)
        } else {
          await this.loadDirectory(
            this.activePane,
            destinationPath,
            destinationPath,
          )
        }

        // Find and refresh the source pane
        const sourcePane =
          this.leftPane.currentPath === sourcePath
            ? 'left'
            : this.rightPane.currentPath === sourcePath
              ? 'right'
              : null
        if (sourcePane) {
          await this.loadDirectory(sourcePane, sourcePath, sourcePath)
        }
      } else {
        // Just refresh the destination directory
        if (dropPane) {
          await this.loadDirectory(dropPane, destinationPath, destinationPath)
        } else {
          await this.loadDirectory(
            this.activePane,
            destinationPath,
            destinationPath,
          )
        }
      }
    } catch (error: any) {
      console.error('[drop] Error:', error)
      this.setStatus(`Error: ${error.message}`, 'error')
    }
  }

  async navigateToDirectory(path: string, addToHistory = true) {
    // Don't log paths as FTP URLs contain passwords
    // console.log('navigateToDirectory called with:', path)
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

  // Navigate up one directory (Backspace)
  async navigateUp() {
    const currentPath = this.getActivePane().currentPath
    const parentPath = this.getParentPath(currentPath)

    // Don't navigate if we're already at root
    if (parentPath === currentPath) {
      return
    }

    // Navigate to parent, passing current path for focusing
    await this.navigateToDirectory(parentPath)
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

  isTextFile(filePath: string): boolean {
    const textExtensions = [
      '.txt',
      '.md',
      '.json',
      '.xml',
      '.html',
      '.htm',
      '.css',
      '.js',
      '.ts',
      '.tsx',
      '.jsx',
      '.log',
      '.csv',
      '.yaml',
      '.yml',
      '.ini',
      '.conf',
      '.config',
      '.sh',
      '.bat',
      '.cmd',
      '.ps1',
      '.py',
      '.rb',
      '.java',
      '.c',
      '.cpp',
      '.h',
      '.hpp',
      '.sql',
      '.php',
      '.go',
      '.rs',
      '.swift',
      '.kt',
      '.scala',
      '.r',
    ]
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'))
    return textExtensions.includes(ext)
  }

  async viewFile(filePath: string) {
    try {
      this.setStatus('Loading file...', 'normal')

      const { FileService } =
        await import('./commander/services/FileService.js')
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

  handleF7() {
    const pane = this.getActivePane()
    this.mkdirDialog = {
      currentPath: pane.currentPath,
      folderName: 'New Folder',
    }
  }

  async executeMkdir() {
    if (!this.mkdirDialog) return

    const { currentPath, folderName } = this.mkdirDialog

    if (!folderName.trim()) {
      this.setStatus('Folder name cannot be empty', 'error')
      return
    }

    // Call service to create directory (dynamic import to ensure runtime availability)
    const handlerModule =
      await import('./commander/services/FileOperationsHandler.js')
    const result = await handlerModule.executeMkdir(
      currentPath,
      folderName.trim(),
    )

    this.setStatus(result.message, result.success ? 'success' : 'error')

    if (result.success) {
      // Close dialog and refresh current pane
      this.mkdirDialog = null
      await this.loadDirectory(this.activePane, currentPath)

      // Focus the newly created directory if present
      const pane = this.getActivePane()
      const newDirIndex = pane.items.findIndex(
        (item) => item.name === folderName.trim() && item.isDirectory,
      )
      if (newDirIndex !== -1) {
        pane.focusedIndex = newDirIndex
        this.requestUpdate()
      }
    }
  }

  cancelMkdir() {
    this.mkdirDialog = null
  }

  updateMkdir(value: string) {
    if (this.mkdirDialog) {
      this.mkdirDialog = {
        ...this.mkdirDialog,
        folderName: value,
      }
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
    const separator = getPathSeparator(destPane.currentPath)
    const zipFilePath = destPane.currentPath + separator + zipFileName

    this.zipProgress = null
    this.setStatus(`Zipping ${files.length} file(s)...`, 'normal')

    const result = await executeZip(files, zipFilePath)
    this.zipProgress = null

    this.setStatus(result.message, result.success ? 'success' : 'error')

    if (result.success) {
      await this.loadDirectory(
        this.activePane === 'left' ? 'right' : 'left',
        destPane.currentPath,
      )
    }

    this.zipDialog = null
  }

  async cancelZip() {
    await cancelOperation()
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

      const { FileService } =
        await import('./commander/services/FileService.js')
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

  async showDirectorySize() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]
    console.log('[UI] showDirectorySize called, item:', item)

    if (!item) {
      this.setStatus('No item selected', 'error')
      return
    }

    console.log('[UI] item.isDirectory:', item.isDirectory)
    if (!item.isDirectory) {
      // For files, show the dialog with file info directly (no calculation needed)
      this.directorySizeDialog = {
        name: item.name,
        path: item.path,
        isCalculating: false,
        totalSize: item.size,
        fileCount: 1,
        directoryCount: 0,
        currentFile: '',
        isFile: true,
      }
      return
    }

    // Open dialog immediately in calculating state
    this.directorySizeDialog = {
      name: item.name,
      path: item.path,
      isCalculating: true,
      totalSize: 0,
      fileCount: 0,
      directoryCount: 0,
      currentFile: '',
      isFile: false,
    }

    try {
      const { FileService } =
        await import('./commander/services/FileService.js')
      console.log('[UI] Calling FileService.getDirectorySize with:', item.path)
      const response = await FileService.getDirectorySize(item.path)
      console.log('[UI] Full response:', JSON.stringify(response, null, 2))

      if (response.success && response.data) {
        // IPC bridge wraps backend response in 'data' property
        const totalSize = response.data.totalSize ?? 0
        const fileCount = response.data.fileCount ?? 0
        const dirCount = response.data.directoryCount ?? 0

        console.log('[UI] Extracted values:', {
          totalSize,
          fileCount,
          dirCount,
        })

        // Update dialog with results
        this.directorySizeDialog = {
          name: item.name,
          path: item.path,
          isCalculating: false,
          totalSize,
          fileCount,
          directoryCount: dirCount,
          currentFile: '',
          isFile: false,
        }
      } else {
        this.directorySizeDialog = null
        this.setStatus(`Error: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.directorySizeDialog = null
      this.setStatus(`Error: ${error.message}`, 'error')
      console.error('Directory size error:', error)
    }
  }

  moveFocus(delta: number, withSelection: boolean) {
    const pane = this.getActivePane()
    const newSelected = new Set(pane.selectedIndices)

    // Get sorted list to navigate correctly
    let displayItems = pane.items
    if (pane.filterActive && pane.filter) {
      displayItems = displayItems.filter((item) =>
        item.name.toLowerCase().includes(pane.filter.toLowerCase()),
      )
    }
    displayItems = this.sortItems(displayItems, pane.sortBy, pane.sortDirection)

    // Bail out if no items
    if (displayItems.length === 0) return

    // Find current focused item in sorted list
    const focusedItem = pane.items[pane.focusedIndex]
    let currentDisplayIndex = focusedItem
      ? displayItems.findIndex((item) => item.path === focusedItem.path)
      : 0

    // Guard: if focused item not in display list, start from 0
    if (currentDisplayIndex < 0) currentDisplayIndex = 0

    // Calculate new display index
    const newDisplayIndex = Math.max(
      0,
      Math.min(displayItems.length - 1, currentDisplayIndex + delta),
    )

    if (withSelection) {
      // For single step (Ctrl+Arrow): toggle only current item
      // For page/range (Ctrl+PageDown/Up): toggle all items in range
      const isSingleStep = Math.abs(delta) === 1

      if (isSingleStep) {
        // Toggle only the current item, then move
        const currentItem = displayItems[currentDisplayIndex]
        if (currentItem && currentItem.name !== '..') {
          const originalIndex = pane.items.findIndex(
            (it) => it.path === currentItem.path,
          )
          if (originalIndex !== -1) {
            if (newSelected.has(originalIndex)) {
              newSelected.delete(originalIndex)
            } else {
              newSelected.add(originalIndex)
            }
          }
        }
      } else {
        // Toggle all items between current and new position (inclusive)
        const startIdx = Math.min(currentDisplayIndex, newDisplayIndex)
        const endIdx = Math.max(currentDisplayIndex, newDisplayIndex)

        // Check if CURRENT item is selected to determine toggle direction
        // This provides consistent behavior when extending selection
        const currentItem = displayItems[currentDisplayIndex]
        const currentOriginalIndex = currentItem
          ? pane.items.findIndex((it) => it.path === currentItem.path)
          : -1
        const shouldSelect =
          currentOriginalIndex === -1 || !newSelected.has(currentOriginalIndex)

        for (let i = startIdx; i <= endIdx; i++) {
          const item = displayItems[i]
          if (item && item.name !== '..') {
            const originalIndex = pane.items.findIndex(
              (it) => it.path === item.path,
            )
            if (originalIndex !== -1) {
              if (shouldSelect) {
                newSelected.add(originalIndex)
              } else {
                newSelected.delete(originalIndex)
              }
            }
          }
        }
      }
    }

    // Find the new item in the sorted list
    const newItem = displayItems[newDisplayIndex]
    if (!newItem) return

    // Find its original index in pane.items
    const newOriginalIndex = pane.items.findIndex(
      (item) => item.path === newItem.path,
    )

    // Always update selection, update focus if possible
    this.updateActivePane({
      focusedIndex:
        newOriginalIndex !== -1 ? newOriginalIndex : pane.focusedIndex,
      selectedIndices: newSelected,
    })

    // Scroll into view (using display index)
    if (newOriginalIndex !== -1) {
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

  selectAll() {
    const pane = this.getActivePane()
    const newSelected = new Set<number>()

    // Select all items except ".."
    pane.items.forEach((item, index) => {
      if (item.name !== '..') {
        newSelected.add(index)
      }
    })

    this.updateActivePane({ selectedIndices: newSelected })
  }

  copyToClipboard() {
    const files = this.getSelectedFiles()
    if (files.length === 0) {
      this.setStatus('No files selected to copy', 'error')
      return
    }

    this.clipboardFiles = { files, operation: 'copy' }

    // Also write file paths to system clipboard for external apps
    const pathsText = files.join('\n')
    ;(window as any).electron.ipcRenderer.invoke(
      'clipboard-write-text',
      pathsText,
    )

    this.setStatus(`${files.length} file(s) copied to clipboard`, 'success')
  }

  cutToClipboard() {
    const files = this.getSelectedFiles()
    if (files.length === 0) {
      this.setStatus('No files selected to cut', 'error')
      return
    }

    this.clipboardFiles = { files, operation: 'cut' }

    // Also write file paths to system clipboard for external apps
    const pathsText = files.join('\n')
    ;(window as any).electron.ipcRenderer.invoke(
      'clipboard-write-text',
      pathsText,
    )

    this.setStatus(`${files.length} file(s) cut to clipboard`, 'success')
  }

  async pasteFromClipboard() {
    if (!this.clipboardFiles || this.clipboardFiles.files.length === 0) {
      this.setStatus('Clipboard is empty', 'error')
      return
    }

    const pane = this.getActivePane()
    const destination = pane.currentPath

    // Show operation dialog
    this.operationDialog = {
      type: this.clipboardFiles.operation === 'cut' ? 'move' : 'copy',
      files: this.clipboardFiles.files,
      destination,
    }

    // If it was a cut operation, clear the clipboard after pasting
    if (this.clipboardFiles.operation === 'cut') {
      // Will be cleared after operation completes
    }
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
    this.copyProgress = null
    this.ftpDownloadProgress = null
    this.ftpUploadProgress = null

    this.setStatus(
      `${type === 'copy' ? 'Copying' : 'Moving'} ${files.length} file(s)...`,
      'normal',
    )

    const result = await executeFileOperation(type, files, destination)
    this.copyProgress = null
    this.ftpDownloadProgress = null
    this.ftpUploadProgress = null

    this.setStatus(result.message, result.success ? 'success' : 'error')

    if (result.success) {
      // Clear clipboard after successful move (cut+paste)
      if (type === 'move' && this.clipboardFiles?.operation === 'cut') {
        this.clipboardFiles = null
      }

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
  }

  async cancelOperation() {
    await cancelOperation()
    this.operationDialog = null
    this.copyProgress = null
    this.ftpDownloadProgress = null
    this.ftpUploadProgress = null
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
    this.setStatus(`Deleting ${files.length} file(s)...`, 'normal')

    const result = await executeDelete(files)
    this.setStatus(result.message, result.success ? 'success' : 'error')

    if (result.success) {
      await this.loadDirectory(
        this.activePane,
        this.getActivePane().currentPath,
      )
    }

    this.deleteDialog = null
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

  async openTerminal() {
    const pane = this.getActivePane()
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'open-terminal',
        pane.currentPath,
      )
      if (response.success) {
        let msg = `Terminal opened in ${pane.currentPath}`
        if (response.n2hEnvLoaded && response.n2hEnvLoaded.length > 0) {
          msg += ` (.n2henv: ${response.n2hEnvLoaded.join(', ')})`
        }
        this.setStatus(msg, 'success')
      } else {
        this.setStatus(`Failed to open terminal: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.setStatus(`Failed to open terminal: ${error.message}`, 'error')
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

  handleF11() {
    // Get the focused item from the active pane (where cursor is)
    const activePane = this.getActivePane()
    const inactivePane = this.getInactivePane()
    const activeFocusedItem = activePane.items[activePane.focusedIndex]

    // Check if the focused item in active pane is a valid file
    if (
      !activeFocusedItem ||
      activeFocusedItem.name === '..' ||
      !activeFocusedItem.isFile
    ) {
      this.setStatus('Select a file to compare', 'error')
      return
    }

    // Try to find a file with the same name in the inactive pane
    let inactiveItem = inactivePane.items.find(
      (item) => item.isFile && item.name === activeFocusedItem.name,
    )

    // If no matching filename found, use the focused item in the inactive pane
    if (!inactiveItem) {
      inactiveItem = inactivePane.items[inactivePane.focusedIndex]

      // Check if the fallback item is a valid file
      if (!inactiveItem || inactiveItem.name === '..' || !inactiveItem.isFile) {
        this.setStatus(
          `No matching file "${activeFocusedItem.name}" found in other pane`,
          'error',
        )
        return
      }
    }

    // Determine left and right paths based on which pane is active
    const leftPath =
      this.activePane === 'left' ? activeFocusedItem.path : inactiveItem.path
    const rightPath =
      this.activePane === 'left' ? inactiveItem.path : activeFocusedItem.path

    // Open file compare dialog
    this.fileCompareDialog = {
      leftPath,
      rightPath,
    }

    const matchInfo =
      inactiveItem.name === activeFocusedItem.name
        ? '(same name)'
        : '(cursor position)'
    this.setStatus(
      `Comparing ${activeFocusedItem.name} ↔ ${inactiveItem.name} ${matchInfo}`,
      'normal',
    )
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

  async executeQuickLaunch(command: string) {
    if (!this.quickLaunchDialog || !command.trim()) return

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
    this.setStatus(`Renaming...`, 'normal')

    const result = await executeRename(filePath, newName)
    this.setStatus(result.message, result.success ? 'success' : 'error')

    if (result.success) {
      await this.loadDirectory(
        this.activePane,
        this.getActivePane().currentPath,
      )
    }

    this.renameDialog = null
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
      this.compareProgress = {
        current: 0,
        total: 0,
        percentage: 0,
        fileName: 'Preparing...',
      }
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

  openContextMenu() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..') {
      this.setStatus('No valid file selected for context menu', 'error')
      return
    }

    const selectedCount =
      pane.selectedIndices.size > 0 ? pane.selectedIndices.size : 1

    this.contextMenu = {
      fileName: item.name,
      isDirectory: item.isDirectory,
      selectedCount: selectedCount,
    }
  }

  closeContextMenu() {
    this.contextMenu = null
  }

  handleContextMenuAction(action: string) {
    switch (action) {
      case 'view':
        this.handleF3()
        break
      case 'open-with':
        this.handleOpenWith()
        break
      case 'edit':
        this.handleEditFile()
        break
      case 'rename':
        this.handleF2()
        break
      case 'copy':
        this.handleF5()
        break
      case 'move':
        this.handleF6()
        break
      case 'delete':
        this.handleF8()
        break
      case 'copy-path':
        this.handleF10()
        break
      case 'zip':
        this.handleF12()
        break
      case 'command':
        this.handleF9()
        break
      default:
        this.setStatus(`Action not implemented: ${action}`, 'error')
    }
  }

  loadCustomApplications(extension: string): Array<{
    name: string
    command: string
    isDefault: boolean
    isCustom: boolean
  }> {
    const saved = localStorage.getItem('commander-custom-apps')
    if (!saved) return []

    try {
      const customApps = JSON.parse(saved)
      const apps = customApps[extension] || []
      // Mark all custom apps with isCustom flag
      return apps.map((app: any) => ({ ...app, isCustom: true }))
    } catch (error) {
      console.error('Failed to load custom applications:', error)
      return []
    }
  }

  removeCustomApplication(extension: string, command: string) {
    const saved = localStorage.getItem('commander-custom-apps')
    if (!saved) return

    try {
      const customApps = JSON.parse(saved)
      if (customApps[extension]) {
        // Filter out the app with matching command
        customApps[extension] = customApps[extension].filter(
          (app: any) => app.command !== command,
        )

        // Remove extension key if no apps left
        if (customApps[extension].length === 0) {
          delete customApps[extension]
        }

        localStorage.setItem(
          'commander-custom-apps',
          JSON.stringify(customApps),
        )
      }
    } catch (error) {
      console.error('Failed to remove custom application:', error)
    }
  }

  saveCustomApplication(extension: string, appPath: string, appName: string) {
    const saved = localStorage.getItem('commander-custom-apps')
    let customApps: any = {}

    if (saved) {
      try {
        customApps = JSON.parse(saved)
      } catch (error) {
        console.error('Failed to parse custom applications:', error)
      }
    }

    if (!customApps[extension]) {
      customApps[extension] = []
    }

    // Check if this app is already saved
    const command = `"${appPath}" "%1"`
    const existing = customApps[extension].find(
      (app: any) => app.command === command,
    )

    if (!existing) {
      customApps[extension].push({
        name: appName,
        command: command,
        isDefault: false,
      })

      localStorage.setItem('commander-custom-apps', JSON.stringify(customApps))
    }
  }

  async handleOpenWith() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..' || item.isDirectory) {
      this.setStatus('Please select a file to open', 'error')
      return
    }

    const extension = item.name.includes('.')
      ? '.' + item.name.split('.').pop()?.toLowerCase()
      : ''

    // Show dialog with loading state
    this.openWithDialog = {
      fileName: item.name,
      filePath: item.path,
      applications: [],
      loading: true,
    }

    try {
      // Query backend for file associations
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'get-file-associations',
          filePath: item.path,
        },
      )

      if (response.success && response.data) {
        // Load custom applications for this extension
        const customApps = this.loadCustomApplications(extension)

        // Merge custom apps with discovered apps
        const allApps = [...customApps, ...(response.data.applications || [])]

        this.openWithDialog = {
          fileName: item.name,
          filePath: item.path,
          applications: allApps,
          loading: false,
        }

        if (allApps.length === 0) {
          this.setStatus('No applications found for this file type', 'normal')
        }
      } else {
        this.setStatus(`Error loading applications: ${response.error}`, 'error')
        this.openWithDialog = null
      }
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      this.openWithDialog = null
    }
  }

  closeOpenWith() {
    this.openWithDialog = null
  }

  async executeOpenWith(applicationCommand: string) {
    if (!this.openWithDialog) return

    const { filePath, fileName } = this.openWithDialog

    try {
      this.setStatus(`Opening ${fileName}...`, 'normal')

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'open-with-app',
          filePath: filePath,
          applicationCommand: applicationCommand,
        },
      )

      if (response.success) {
        this.setStatus(`Opened ${fileName}`, 'success')
      } else {
        this.setStatus(`Error: ${response.error}`, 'error')
      }

      this.openWithDialog = null
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
      this.openWithDialog = null
    }
  }

  async handleCustomAppSelect(detail: { path: string; name: string }) {
    if (!this.openWithDialog) return

    const { fileName } = this.openWithDialog
    const extension = fileName.includes('.')
      ? '.' + fileName.split('.').pop()?.toLowerCase()
      : ''

    // Save the custom application for future use
    this.saveCustomApplication(extension, detail.path, detail.name)

    // Build the command and execute
    const command = `"${detail.path}" "%1"`
    await this.executeOpenWith(command)
  }

  async handleRemoveCustomApp(command: string) {
    if (!this.openWithDialog) return

    const { fileName } = this.openWithDialog
    const extension = fileName.includes('.')
      ? '.' + fileName.split('.').pop()?.toLowerCase()
      : ''

    // Remove the custom application
    this.removeCustomApplication(extension, command)

    // Refresh the dialog - reload applications
    await this.handleOpenWith()

    this.setStatus('Custom application removed', 'success')
  }

  async openSettings() {
    // Lazy load SettingsDialog
    await import('./commander/dialogs/SettingsDialog.js')

    // Open immediately for responsive UI
    this.showSettingsDialog = true
    this.requestUpdate()
  }

  closeSettings() {
    this.showSettingsDialog = false
  }

  async handleEditFile() {
    const pane = this.getActivePane()
    const item = pane.items[pane.focusedIndex]

    if (!item || item.name === '..' || item.isDirectory) {
      this.setStatus('Please select a file to edit', 'error')
      return
    }

    // Open dialog with loading state
    this.textEditorDialog = {
      fileName: item.name,
      filePath: item.path,
      content: '',
      loading: true,
      saving: false,
      error: '',
    }

    try {
      const { FileService } =
        await import('./commander/services/FileService.js')
      const response = await FileService.readFile(item.path)

      // Check if dialog was closed (e.g., user pressed ESC during loading)
      if (!this.textEditorDialog) {
        return
      }

      if (response.success && response.data) {
        // Check if it's a binary/image file
        if (response.data.isImage) {
          this.textEditorDialog = null
          this.setStatus('Cannot edit binary/image files', 'error')
          return
        }

        this.textEditorDialog = {
          ...this.textEditorDialog,
          content: response.data.content,
          loading: false,
        }
      } else {
        this.textEditorDialog = {
          ...this.textEditorDialog,
          loading: false,
          error: response.error || 'Failed to read file',
        }
      }
    } catch (error: any) {
      // Check if dialog was closed during error
      if (!this.textEditorDialog) {
        return
      }
      this.textEditorDialog = {
        ...this.textEditorDialog,
        loading: false,
        error: error.message,
      }
    }
  }

  async cancelTextEditorOperation() {
    if (!this.textEditorDialog) return

    // Cancel the backend operation
    try {
      const { FileService } =
        await import('./commander/services/FileService.js')
      await FileService.cancelOperation()
      const operation = this.textEditorDialog.loading ? 'loading' : 'saving'
      this.setStatus(`File ${operation} cancelled`, 'normal')

      // Close the dialog after canceling
      this.textEditorDialog = null
    } catch (error) {
      console.error('Failed to cancel operation:', error)
      this.setStatus('Failed to cancel operation', 'error')
    }
  }

  async closeTextEditor() {
    this.textEditorDialog = null
  }

  async saveTextEditor(content: string) {
    if (!this.textEditorDialog) return

    const { filePath, fileName } = this.textEditorDialog

    this.textEditorDialog = {
      ...this.textEditorDialog,
      saving: true,
      error: '',
    }

    try {
      const { FileService } =
        await import('./commander/services/FileService.js')
      const response = await FileService.writeFile(filePath, content)

      // Check if dialog was closed (e.g., user pressed ESC during saving)
      if (!this.textEditorDialog) {
        return
      }

      if (response.success) {
        this.textEditorDialog = {
          ...this.textEditorDialog,
          content: content,
          saving: false,
        }
        this.setStatus(`Saved: ${fileName}`, 'success')

        // Refresh the current directory to update file size
        await this.loadDirectory(
          this.activePane,
          this.getActivePane().currentPath,
        )
      } else {
        this.textEditorDialog = {
          ...this.textEditorDialog,
          saving: false,
          error: response.error || 'Failed to save file',
        }
      }
    } catch (error: any) {
      // Check if dialog was closed during error
      if (!this.textEditorDialog) {
        return
      }
      this.textEditorDialog = {
        ...this.textEditorDialog,
        saving: false,
        error: error.message,
      }
    }
  }

  // Search Dialog Methods
  openSearch() {
    const pane = this.getActivePane()
    this.searchDialog = {
      searchPath: pane.currentPath,
      searching: false,
    }
  }

  async executeSearch(detail: {
    filenamePattern: string
    contentText: string
    recursive: boolean
    caseSensitive: boolean
  }) {
    if (!this.searchDialog) return

    this.searchDialog = {
      ...this.searchDialog,
      searching: true,
    }

    const { FileService } = await import('./commander/services/FileService.js')

    // Setup progress listener
    FileService.onProgress('search-progress', (data: any) => {
      const dialog = this.shadowRoot?.querySelector('search-dialog') as any
      if (dialog) {
        dialog.updateProgress(data)
      }
    })

    try {
      const response = await FileService.search(
        this.searchDialog.searchPath,
        detail.filenamePattern,
        detail.contentText,
        detail.recursive,
        detail.caseSensitive,
      )

      this.searchDialog = {
        ...this.searchDialog!,
        searching: false,
      }

      const dialog = this.shadowRoot?.querySelector('search-dialog') as any
      if (dialog && response.success && response.data?.data) {
        dialog.setResults(response.data.data)
      } else if (!response.success) {
        this.setStatus(`Search error: ${response.error}`, 'error')
      }
    } catch (error: any) {
      this.searchDialog = {
        ...this.searchDialog!,
        searching: false,
      }
      this.setStatus(`Search error: ${error.message}`, 'error')
    }
  }

  async cancelSearch() {
    const { FileService } = await import('./commander/services/FileService.js')
    await FileService.cancelOperation()
    if (this.searchDialog) {
      this.searchDialog = {
        ...this.searchDialog,
        searching: false,
      }
    }
  }

  async handleSearchResult(result: {
    path: string
    name: string
    isDirectory: boolean
    matchLine?: number
  }) {
    // Close search dialog
    this.searchDialog = null

    // Navigate to the directory containing the file
    // Handle both Windows (\) and Unix (/) path separators
    const lastSeparator = Math.max(
      result.path.lastIndexOf('\\'),
      result.path.lastIndexOf('/'),
    )
    const dirPath = result.isDirectory
      ? result.path
      : result.path.substring(0, lastSeparator)

    await this.navigateToDirectory(dirPath)

    // Find and focus the file in the list
    const pane = this.getActivePane()
    const index = pane.items.findIndex((item) => item.name === result.name)
    if (index >= 0) {
      this.updateActivePane({ focusedIndex: index })
    }

    this.setStatus(`Found: ${result.name}`, 'success')
  }

  closeSearch() {
    this.searchDialog = null
  }

  closeDirectorySizeDialog() {
    this.directorySizeDialog = null
  }

  async cancelDirectorySize() {
    // Close dialog immediately for better UX
    this.directorySizeDialog = null
    // Then cancel any ongoing file operation in background
    try {
      await (window as any).electron.ipcRenderer.invoke('cancel-file-operation')
    } catch (error) {
      console.error('Failed to cancel operation:', error)
    }
  }

  async handleExportSettings() {
    try {
      // Show save dialog first
      const saveDialogResponse = await (
        window as any
      ).electron.ipcRenderer.invoke('show-save-dialog', {
        title: 'Export Settings',
        defaultPath: 'nh-toolbox-settings.json',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
      })

      if (saveDialogResponse.canceled || !saveDialogResponse.filePath) {
        this.setStatus('Export cancelled', 'normal')
        return
      }

      const filePath = saveDialogResponse.filePath

      // Collect settings using the service
      const settings = settingsService.collectSettings(
        {
          currentPath: this.leftPane.currentPath,
          sortBy: this.leftPane.sortBy,
          sortDirection: this.leftPane.sortDirection,
        },
        {
          currentPath: this.rightPane.currentPath,
          sortBy: this.rightPane.sortBy,
          sortDirection: this.rightPane.sortDirection,
        },
      )

      const jsonString = JSON.stringify(settings, null, 2)

      // Write file
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'write-settings',
          content: jsonString,
          filePath: filePath,
        },
      )

      if (
        response.success &&
        response.data?.success &&
        response.data?.data?.path
      ) {
        this.setStatus(
          `Settings exported to: ${response.data.data.path}`,
          'success',
        )
      } else {
        this.setStatus(
          `Export error: ${response.data?.error || response.error || 'Unknown error'}`,
          'error',
        )
      }
    } catch (error: any) {
      this.setStatus(`Export error: ${error.message}`, 'error')
    }
  }

  async handleImportSettings(file: File) {
    try {
      const text = await file.text()
      const settings = JSON.parse(text)

      const result = settingsService.importSettings(settings)

      if (!result.success) {
        this.setStatus(result.error || 'Import failed', 'error')
        return
      }

      // Reload favorites
      this.loadFavorites()

      this.setStatus('Settings imported successfully', 'success')

      // Reload pane paths
      const savedPaths = this.paneManager.loadPanePaths()
      if (savedPaths.left && savedPaths.left !== this.leftPane.currentPath) {
        await this.loadDirectory('left', savedPaths.left)
      }
      if (savedPaths.right && savedPaths.right !== this.rightPane.currentPath) {
        await this.loadDirectory('right', savedPaths.right)
      }
    } catch (error: any) {
      this.setStatus(`Import error: ${error.message}`, 'error')
    }
  }

  async handleClearAllSettings() {
    try {
      settingsService.clearAll()

      this.setStatus('All settings cleared', 'success')
      this.favoritePaths = []

      // Reload both panes to root/default
      const defaultPath = settingsService.getDefaultPath()
      await this.loadDirectory('left', defaultPath)
      await this.loadDirectory('right', defaultPath)
    } catch (error: any) {
      this.setStatus(`Error clearing settings: ${error.message}`, 'error')
    }
  }

  // Delegate to imported utilities
  formatFileSize = formatFileSize
  formatCompactDate = formatCompactDate
  sortItems = sortItems

  toggleSort(sortBy: 'name' | 'size' | 'modified' | 'extension') {
    // Get current pane directly from reactive properties
    const currentPane =
      this.activePane === 'left' ? this.leftPane : this.rightPane

    const nextState = getNextSortState(
      currentPane.sortBy,
      currentPane.sortDirection,
      sortBy,
    )

    // Update reactive properties directly to ensure Lit re-renders
    if (this.activePane === 'left') {
      this.leftPane = { ...this.leftPane, ...nextState }
      this.paneManager.setPane('left', this.leftPane)
    } else {
      this.rightPane = { ...this.rightPane, ...nextState }
      this.paneManager.setPane('right', this.rightPane)
    }

    // Save sort settings
    this.paneManager.saveSortSettings(this.activePane)

    this.setStatus(
      `Sorted by ${sortBy} (${nextState.sortDirection})`,
      'success',
    )
  }

  render() {
    return html`
      <div class="commander-container">
        <div class="toolbar">
          <span class="toolbar-title">📁 Nice2Have Commander</span>
          <div class="toolbar-right">
            <div
              class="function-key-top"
              @click=${() => this.openHelp()}
              style="min-width: 80px;"
            >
              <span class="function-key-label">F1</span>
            </div>
            <div
              class="function-key-top"
              @click=${() => this.openSettings()}
              style="margin-left: auto; min-width: 80px; margin-right: 0.5rem;"
              title="Settings"
            >
              <span class="function-key-label">⚙️</span>
            </div>
          </div>
        </div>

        <div class="panes-container">
          ${this.renderPane('left', this.leftPane)}
          ${this.renderPane('right', this.rightPane)}
        </div>

        <div class="function-bar">
          <div class="function-key" @click=${() => this.handleF2()}>
            <span class="function-key-label">F2</span>
            <span class="function-key-action">rename</span>
          </div>
          <div class="function-key" @click=${() => this.handleF3()}>
            <span class="function-key-label">F3</span>
            <span class="function-key-action">view</span>
          </div>
          <div class="function-key" @click=${() => this.handleEditFile()}>
            <span class="function-key-label">F4</span>
            <span class="function-key-action">edit</span>
          </div>
          <div class="function-key" @click=${() => this.handleF5()}>
            <span class="function-key-label">F5</span>
            <span class="function-key-action">copy</span>
          </div>
          <div class="function-key" @click=${() => this.handleF6()}>
            <span class="function-key-label">F6</span>
            <span class="function-key-action">move</span>
          </div>
          <div class="function-key" @click=${() => this.handleF7()}>
            <span class="function-key-label">F7</span>
            <span class="function-key-action">mkdir</span>
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
          <div class="function-key" @click=${() => this.handleF11()}>
            <span class="function-key-label">F11</span>
            <span class="function-key-action">📄 ↔ 📄</span>
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
              .progress=${this.getOperationProgress()}
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
        ${this.deleteProgress
          ? html`<div class="confirm-overlay">
              <div class="confirm-dialog">
                <div class="confirm-title">Deleting…</div>
                <div class="confirm-message">
                  ${this.deleteProgress.message}
                </div>
                <div style="margin-top:12px;text-align:center">
                  <span class="spinner"></span>
                </div>
              </div>
            </div>`
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
              @execute=${(e: CustomEvent) => this.executeQuickLaunch(e.detail)}
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
        ${this.mkdirDialog
          ? html`<mkdir-dialog
              .currentPath=${this.mkdirDialog.currentPath}
              .folderName=${this.mkdirDialog.folderName}
              @close=${this.cancelMkdir}
              @execute=${this.executeMkdir}
              @update-name=${(e: CustomEvent) => this.updateMkdir(e.detail)}
            ></mkdir-dialog>`
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
        ${this.fileCompareDialog
          ? html`<file-compare
              .leftPath=${this.fileCompareDialog.leftPath}
              .rightPath=${this.fileCompareDialog.rightPath}
              @close=${() => (this.fileCompareDialog = null)}
            ></file-compare>`
          : ''}
        ${this.showDriveSelector
          ? html`<drive-selector-dialog
              .drives=${this.availableDrives}
              .networkShares=${this.availableNetworkShares}
              .favorites=${this.favoritePaths}
              .currentPath=${this.getActivePane().currentPath}
              .focusedIndex=${this.driveSelectorFocusedIndex}
              @close=${this.closeDriveSelector}
              @select=${(e: CustomEvent) => this.selectDrive(e.detail)}
              @toggle-favorite=${(e: CustomEvent) =>
                this.toggleFavorite(e.detail)}
              @move-favorite-up=${(e: CustomEvent) =>
                this.moveFavoriteUp(e.detail)}
              @move-favorite-down=${(e: CustomEvent) =>
                this.moveFavoriteDown(e.detail)}
              @add-to-favorites=${(e: CustomEvent) =>
                this.addToFavorites(e.detail)}
              @open-ftp=${() => {
                this.showDriveSelector = false
                this.showFTPDialog = true
              }}
              @open-smb=${() => {
                this.showDriveSelector = false
                this.showSMBDialog = true
              }}
              @refresh-drives=${() => this.loadDrives()}
            ></drive-selector-dialog>`
          : ''}
        ${this.showFTPDialog
          ? html`<ftp-connection-dialog
              id="ftp-dialog"
              .open=${true}
              @close=${() => (this.showFTPDialog = false)}
              @cancel-connection=${() => {
                this.ftpConnectionCancelled = true
              }}
              @connect=${async (e: CustomEvent) => {
                this.ftpConnectionCancelled = false
                this.pendingFtpUrl = e.detail
                try {
                  await this.navigateToDirectory(e.detail)
                  if (!this.ftpConnectionCancelled) {
                    const dialog = this.shadowRoot?.querySelector(
                      '#ftp-dialog',
                    ) as any
                    dialog?.connectionSuccess()
                    this.showFTPDialog = false
                  }
                } catch (error: any) {
                  if (!this.ftpConnectionCancelled) {
                    const dialog = this.shadowRoot?.querySelector(
                      '#ftp-dialog',
                    ) as any
                    const errorMsg = error.message || 'Unknown error'
                    dialog?.connectionFailed(errorMsg)
                    // Also show error in Commander status bar as fallback
                    this.setStatus(
                      `FTP connection failed: ${errorMsg}`,
                      'error',
                    )
                  }
                }
                this.pendingFtpUrl = null
              }}
            ></ftp-connection-dialog>`
          : ''}
        ${this.showSMBDialog
          ? html`<smb-connection-dialog
              id="smb-dialog"
              .open=${true}
              .initialPath=${this.pendingSmbPath || ''}
              @close=${() => (this.showSMBDialog = false)}
              @cancel-connection=${() => {
                this.smbConnectionCancelled = true
              }}
              @connect=${async (e: CustomEvent) => {
                this.smbConnectionCancelled = false
                const { smbUrl, uncPath } = e.detail
                const path = this.pendingSmbPath || uncPath || ''
                try {
                  await this.loadDirectoryWithSmbUrl(
                    this.pendingSmbPane,
                    path,
                    smbUrl,
                  )
                  if (!this.smbConnectionCancelled) {
                    const dialog = this.shadowRoot?.querySelector(
                      '#smb-dialog',
                    ) as any
                    dialog?.connectionSuccess()
                    this.showSMBDialog = false
                  }
                } catch (error: any) {
                  if (!this.smbConnectionCancelled) {
                    const dialog = this.shadowRoot?.querySelector(
                      '#smb-dialog',
                    ) as any
                    const msg = error.message || 'Unknown error'
                    dialog?.connectionFailed(msg)
                    this.setStatus(`SMB mount failed: ${msg}`, 'error')
                  }
                }
                this.pendingSmbPath = null
              }}
            ></smb-connection-dialog>`
          : ''}
        ${this.showHelp
          ? html`<help-dialog
              .open=${this.showHelp}
              @close=${this.closeHelp}
            ></help-dialog>`
          : ''}
        ${this.contextMenu
          ? html`<context-menu-dialog
              .fileName=${this.contextMenu.fileName}
              .isDirectory=${this.contextMenu.isDirectory}
              .selectedCount=${this.contextMenu.selectedCount}
              @close=${this.closeContextMenu}
              @action=${(e: CustomEvent) =>
                this.handleContextMenuAction(e.detail)}
            ></context-menu-dialog>`
          : ''}
        ${this.openWithDialog
          ? html`<open-with-dialog
              .fileName=${this.openWithDialog.fileName}
              .filePath=${this.openWithDialog.filePath}
              .applications=${this.openWithDialog.applications}
              .loading=${this.openWithDialog.loading}
              @close=${this.closeOpenWith}
              @select=${(e: CustomEvent) => this.executeOpenWith(e.detail)}
              @select-custom=${(e: CustomEvent) =>
                this.handleCustomAppSelect(e.detail)}
              @remove-app=${(e: CustomEvent) =>
                this.handleRemoveCustomApp(e.detail)}
            ></open-with-dialog>`
          : ''}
        ${this.textEditorDialog
          ? html`<text-editor-dialog
              .fileName=${this.textEditorDialog.fileName}
              .filePath=${this.textEditorDialog.filePath}
              .content=${this.textEditorDialog.content}
              .loading=${this.textEditorDialog.loading}
              .saving=${this.textEditorDialog.saving}
              .error=${this.textEditorDialog.error}
              @close=${this.closeTextEditor}
              @save=${(e: CustomEvent) => this.saveTextEditor(e.detail.content)}
              @cancel-operation=${this.cancelTextEditorOperation}
            ></text-editor-dialog>`
          : ''}
        ${this.showSettingsDialog
          ? html`<settings-dialog
              .open=${this.showSettingsDialog}
              @close=${this.closeSettings}
              @export=${this.handleExportSettings}
              @import=${(e: CustomEvent) => this.handleImportSettings(e.detail)}
              @clear-all=${this.handleClearAllSettings}
            ></settings-dialog>`
          : ''}
        ${this.directorySizeDialog
          ? html`<directory-size-dialog
              .data=${this.directorySizeDialog}
              @close=${this.closeDirectorySizeDialog}
              @cancel=${this.cancelDirectorySize}
            ></directory-size-dialog>`
          : ''}
        ${this.searchDialog
          ? html`<search-dialog
              .searchPath=${this.searchDialog.searchPath}
              .searching=${this.searchDialog.searching}
              @search=${(e: CustomEvent) => this.executeSearch(e.detail)}
              @cancel-search=${this.cancelSearch}
              @select-result=${(e: CustomEvent) =>
                this.handleSearchResult(e.detail)}
              @close=${this.closeSearch}
            ></search-dialog>`
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

    const driveInfo = side === 'left' ? this.leftDriveInfo : this.rightDriveInfo
    const freeSpaceText =
      driveInfo.freeSpace !== null
        ? this.formatFileSize(driveInfo.freeSpace) +
          ' free' +
          (driveInfo.totalSpace !== null
            ? ' / ' + this.formatFileSize(driveInfo.totalSpace)
            : '')
        : ''

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
          <span class="path-display"
            >${this.maskFtpPassword(pane.currentPath)}</span
          >
          <span class="item-count">
            ${freeSpaceText
              ? html`<span style="color: #3dff8b; margin-right: 0.5rem;"
                  >${freeSpaceText}</span
                >`
              : ''}
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
              this.handlePaneClick(side)
              this.toggleSort('name')
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
              this.handlePaneClick(side)
              this.toggleSort('size')
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
              this.handlePaneClick(side)
              this.toggleSort('modified')
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
              this.handlePaneClick(side)
              this.toggleSort('extension')
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
          <div style="flex: 1;"></div>
          <button
            @click=${(e: Event) => {
              e.stopPropagation()
              this.loadDirectory(side, pane.currentPath)
            }}
            style="padding: 0.25rem 0.5rem; background: #059669; border: none; color: white; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
            title="Refresh directory (Ctrl+R)"
          >
            🔄
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

        <div
          class="file-list"
          @dragover=${(e: DragEvent) => this.handleDragOver(e)}
          @drop=${(e: DragEvent) => this.handleDrop(e, undefined, side)}
        >
          ${filteredItems.map(
            (item, displayIndex) => html`
              <div
                class="file-item ${isActive &&
                displayFocusedIndex === displayIndex
                  ? 'focused'
                  : ''} ${displaySelectedIndices.has(displayIndex)
                  ? 'selected'
                  : ''}"
                draggable="true"
                @dragstart=${(e: DragEvent) => {
                  e.stopPropagation()

                  // Mark as internal drag and store source directory
                  this.isDraggingInternal = true
                  this.dragSourcePath = pane.currentPath

                  // Find original index of the dragged item
                  const originalIndex = pane.items.findIndex(
                    (i) => i.path === item.path,
                  )

                  // Check if dragged item is in selection
                  const isInSelection =
                    originalIndex !== -1 &&
                    pane.selectedIndices.has(originalIndex)

                  let pathsToDrag: string[]
                  if (isInSelection && pane.selectedIndices.size > 0) {
                    pathsToDrag = Array.from(pane.selectedIndices)
                      .map((idx) => pane.items[idx]?.path)
                      .filter((p): p is string => !!p)
                  } else {
                    pathsToDrag = [item.path]
                  }

                  const isMac = (window as any).process?.platform === 'darwin'

                  if (isMac && window.electron?.startDrag) {
                    // macOS: use native startDrag (works for both internal and external drops)
                    window.electron.startDrag(
                      pathsToDrag.length === 1 ? pathsToDrag[0] : pathsToDrag,
                    )
                    e.preventDefault()
                  } else {
                    // Windows/Linux: use web DnD for internal pane-to-pane drops
                    e.dataTransfer?.setData(
                      'application/x-commander-paths',
                      JSON.stringify(pathsToDrag),
                    )
                    e.dataTransfer?.setData(
                      'text/plain',
                      pathsToDrag.join('\n'),
                    )
                    if (e.dataTransfer) {
                      e.dataTransfer.effectAllowed = 'move'
                    }

                    // Store paths so we can trigger native drag when leaving the window
                    this.dragPaths = pathsToDrag

                    // Listen for drag leaving the window to trigger native startDrag
                    // for external apps (Windows Explorer etc.)
                    if (this.dragLeaveHandler) {
                      document.removeEventListener(
                        'dragleave',
                        this.dragLeaveHandler as any,
                      )
                    }
                    this.dragLeaveHandler = (evt: DragEvent) => {
                      // relatedTarget is null when drag leaves the browser window
                      if (
                        !evt.relatedTarget &&
                        this.dragPaths &&
                        window.electron?.startDrag
                      ) {
                        window.electron.startDrag(
                          this.dragPaths.length === 1
                            ? this.dragPaths[0]
                            : this.dragPaths,
                        )
                        // Clean up listener after triggering
                        document.removeEventListener(
                          'dragleave',
                          this.dragLeaveHandler as any,
                        )
                        this.dragLeaveHandler = null
                      }
                    }
                    document.addEventListener(
                      'dragleave',
                      this.dragLeaveHandler as any,
                    )
                  }
                }}
                @dragend=${() => {
                  this.isDraggingInternal = false
                  this.dragSourcePath = null
                  this.dragPaths = null
                  // Clean up dragleave listener
                  if (this.dragLeaveHandler) {
                    document.removeEventListener(
                      'dragleave',
                      this.dragLeaveHandler as any,
                    )
                    this.dragLeaveHandler = null
                  }
                }}
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
                @contextmenu=${(e: MouseEvent) => {
                  e.preventDefault()
                  // Find original index in pane.items
                  const originalIndex = pane.items.findIndex(
                    (i) => i.path === item.path,
                  )
                  if (originalIndex !== -1) {
                    // Set focus to this item first
                    this.updateActivePane({
                      focusedIndex: originalIndex,
                    })
                    // Then open context menu
                    this.openContextMenu()
                  }
                }}
                @dragover=${item.isDirectory
                  ? (e: DragEvent) => this.handleDragOver(e)
                  : undefined}
                @drop=${item.isDirectory
                  ? (e: DragEvent) => this.handleDrop(e, item.path)
                  : undefined}
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
                <span class="file-date"
                  >${this.formatCompactDate(item.modified)}</span
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
