import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import {
  getGarbageFinderState,
  saveGarbageFinderState,
} from '../../services/SessionState.js'
import '../navigation/ResponsiveMenu'

interface FileNode {
  name: string
  path: string
  size: number
  modified: string
  isFile: true
}

interface FolderNode {
  name: string
  path: string
  size: number
  children: FolderNode[]
  files: FileNode[]
  isExpanded: boolean
  depth: number
  fileCount: number
  folderCount: number
  isAnalyzed: boolean
  isLoading: boolean
}

interface ScanProgress {
  isScanning: boolean
  scanningPath: string
  currentPath: string
  foldersScanned: number
  currentSize: number
  percentage: number
}

interface DriveInfo {
  letter: string
  path: string
  label: string
  freeSpace?: number
  totalSpace?: number
}

export class GarbageFinder extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #e2e8f0;
      background: #0f172a;
      min-height: 100vh;
    }

    .content {
      padding: 1rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
    }

    .btn-reset {
      padding: 0.5rem 1rem;
      background: #475569;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-reset:hover {
      background: #64748b;
    }

    .btn-reset:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-toggle {
      padding: 0.5rem 1rem;
      background: #334155;
      color: #94a3b8;
      border: 1px solid #475569;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-toggle:hover {
      background: #475569;
      color: white;
    }

    .btn-toggle.active {
      background: #0ea5e9;
      border-color: #0ea5e9;
      color: white;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #f8fafc;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .btn {
      padding: 0.4rem 0.8rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.75rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #0ea5e9;
      color: white;
    }

    .btn-primary:hover {
      background: #0284c7;
    }

    .btn-primary:disabled {
      background: #475569;
      cursor: not-allowed;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .progress-section {
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-bottom: 1rem;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .progress-text {
      color: #94a3b8;
      font-size: 0.85rem;
      display: flex;
      align-items: center;
    }

    .progress-stats {
      display: flex;
      gap: 1.5rem;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .progress-stats span {
      color: #22c55e;
      font-weight: 600;
    }

    .progress-bar-container {
      height: 24px;
      background: #0f172a;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #0ea5e9, #22c55e);
      border-radius: 12px;
      transition: width 0.3s ease;
    }

    .progress-bar-text {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .current-path {
      margin-top: 0.5rem;
      color: #64748b;
      font-size: 0.8rem;
      font-family: monospace;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-container {
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      overflow: hidden;
    }

    .tree-header {
      display: grid;
      grid-template-columns: 1fr 150px 80px 120px;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #334155;
      font-weight: 600;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .tree-body {
      max-height: calc(100vh - 300px);
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .tree-node {
      display: grid;
      grid-template-columns: 1fr 150px 80px 120px;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #1e293b;
      align-items: center;
      transition: background 0.15s;
    }

    .tree-node:hover {
      background: #334155;
    }

    .tree-node.expanded {
      background: #1e3a5f;
    }

    .tree-node.analyzing {
      background: #1e3a5f;
      animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
      0%,
      100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .folder-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      cursor: pointer;
    }

    .folder-icon {
      flex-shrink: 0;
    }

    .folder-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .size-bar-container {
      height: 16px;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
    }

    .size-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .size-bar.large {
      background: linear-gradient(90deg, #ef4444, #dc2626);
    }

    .size-bar.medium {
      background: linear-gradient(90deg, #f59e0b, #d97706);
    }

    .size-bar.small {
      background: linear-gradient(90deg, #22c55e, #16a34a);
    }

    .size-text {
      text-align: right;
      font-family: monospace;
      font-size: 0.85rem;
      color: #e2e8f0;
    }

    .action-cell {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
    }

    .empty-state {
      padding: 3rem;
      text-align: center;
      color: #64748b;
    }

    .empty-state-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid #0ea5e9;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 0.5rem;
    }

    .spinner-small {
      width: 12px;
      height: 12px;
      border-width: 2px;
      margin: 0;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .drive-info {
      font-size: 0.7rem;
      color: #64748b;
      margin-left: 0.5rem;
    }

    .expand-icon {
      cursor: pointer;
      user-select: none;
      width: 16px;
      text-align: center;
      flex-shrink: 0;
    }

    .btn-delete {
      padding: 0.3rem 0.5rem;
      background: transparent;
      color: #94a3b8;
      border: 1px solid #475569;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.75rem;
      transition: all 0.2s;
    }

    .btn-delete:hover {
      background: #dc2626;
      border-color: #dc2626;
      color: white;
    }

    .btn-delete:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .confirm-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .confirm-dialog {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 1.5rem;
      max-width: 450px;
      width: 90%;
    }

    .confirm-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #f8fafc;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .confirm-message {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .confirm-path {
      font-family: monospace;
      font-size: 0.85rem;
      color: #e2e8f0;
      background: #0f172a;
      padding: 0.5rem;
      border-radius: 4px;
      margin-bottom: 1rem;
      word-break: break-all;
    }

    .confirm-buttons {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .btn-cancel {
      padding: 0.5rem 1rem;
      background: #475569;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-cancel:hover {
      background: #64748b;
    }

    .btn-confirm-delete {
      padding: 0.5rem 1rem;
      background: #dc2626;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }

    .btn-confirm-delete:hover {
      background: #b91c1c;
    }
  `

  @property({ type: Array })
  treeData: FolderNode[] = []

  @property({ type: Object })
  scanProgress: ScanProgress = {
    isScanning: false,
    scanningPath: '',
    currentPath: '',
    foldersScanned: 0,
    currentSize: 0,
    percentage: 0,
  }

  @property({ type: Array })
  drives: DriveInfo[] = []

  @property({ type: Object })
  deleteConfirm: { show: boolean; node: FolderNode | FileNode | null } = {
    show: false,
    node: null,
  }

  @property({ type: Boolean })
  sortBySize: boolean = true

  private expandedPaths: Set<string> = new Set()

  connectedCallback() {
    super.connectedCallback()

    // Restore session state
    const savedState = getGarbageFinderState()
    if (savedState.sortBySize !== undefined) {
      this.sortBySize = savedState.sortBySize
    }
    if (savedState.treeData && savedState.treeData.length > 0) {
      this.treeData = savedState.treeData
    }
    if (savedState.expandedPaths) {
      this.expandedPaths = new Set(savedState.expandedPaths)
    }

    // Load available drives only if no saved tree data
    if (!savedState.treeData || savedState.treeData.length === 0) {
      this.loadDrives()
    }

    // Listen for scan progress events
    ;(window as any).electron?.ipcRenderer?.on(
      'garbage-scan-progress',
      (data: any) => {
        this.scanProgress = {
          ...this.scanProgress,
          currentPath: data.currentPath || '',
          foldersScanned: data.foldersScanned || 0,
          currentSize: data.currentSize || 0,
          percentage: data.percentage || 0,
        }

        // Update the analyzed node with new tree data
        if (data.tree && data.tree.length > 0) {
          this.updateAnalyzedNode(data.tree[0])
        }

        this.requestUpdate()
      },
    )
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Save session state when navigating away
    saveGarbageFinderState({
      sortBySize: this.sortBySize,
      treeData: this.treeData,
      expandedPaths: Array.from(this.expandedPaths),
    })
  }

  async loadDrives() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'drives' },
      )

      if (response.success && response.data?.drives) {
        // Convert drives to tree nodes
        this.treeData = response.data.drives.map((drive: DriveInfo) => ({
          name: drive.label,
          path: drive.path,
          size: 0,
          children: [],
          files: [],
          isExpanded: false,
          depth: 0,
          fileCount: 0,
          folderCount: 0,
          isAnalyzed: false,
          isLoading: false,
        }))

        this.drives = response.data.drives
      }
    } catch (error) {
      console.error('Failed to load drives:', error)
    }
  }

  async fetchDriveInfo(drive: DriveInfo) {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'drive-info', drivePath: drive.path },
      )

      if (response.success && response.data) {
        this.drives = this.drives.map((d) =>
          d.path === drive.path
            ? {
                ...d,
                freeSpace: response.data.freeSpace,
                totalSpace: response.data.totalSpace,
              }
            : d,
        )
        this.requestUpdate()
      }
    } catch (error) {
      console.error(`Failed to get drive info for ${drive.path}:`, error)
    }
  }

  getDriveInfo(path: string): DriveInfo | undefined {
    return this.drives.find((d) => d.path === path)
  }

  async toggleExpand(node: FolderNode, event: Event) {
    event.stopPropagation()

    if (node.isExpanded) {
      // Collapse
      this.expandedPaths.delete(node.path)
      this.treeData = this.updateNodeInTree(this.treeData, node.path, {
        isExpanded: false,
      })
    } else {
      // Expand - load children and files if not loaded yet
      this.expandedPaths.add(node.path)
      if (
        node.children.length === 0 &&
        (!node.files || node.files.length === 0)
      ) {
        // Load folder contents even if analyzed (analysis doesn't load files)
        await this.loadFolderContents(node)
      }
      this.treeData = this.updateNodeInTree(this.treeData, node.path, {
        isExpanded: true,
      })
    }
    this.requestUpdate()
  }

  async loadFolderContents(node: FolderNode) {
    try {
      // Mark as loading
      this.treeData = this.updateNodeInTree(this.treeData, node.path, {
        isLoading: true,
      })
      this.requestUpdate()

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', folderPath: node.path },
      )

      if (response.success && response.data?.directories) {
        const children: FolderNode[] = response.data.directories.map(
          (item: any) => ({
            name: item.name,
            path: item.path,
            size: 0,
            children: [],
            files: [],
            isExpanded: false,
            depth: node.depth + 1,
            fileCount: 0,
            folderCount: 0,
            isAnalyzed: false,
            isLoading: false,
          }),
        )

        const files: FileNode[] = (response.data.files || []).map(
          (item: any) => ({
            name: item.name,
            path: item.path,
            size: item.size || 0,
            modified: item.modified || '',
            isFile: true as const,
          }),
        )

        this.treeData = this.updateNodeInTree(this.treeData, node.path, {
          children,
          files,
          isLoading: false,
          isExpanded: true,
        })
      } else {
        this.treeData = this.updateNodeInTree(this.treeData, node.path, {
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('Failed to load folder contents:', error)
      this.treeData = this.updateNodeInTree(this.treeData, node.path, {
        isLoading: false,
      })
    }
    this.requestUpdate()
  }

  async analyzeFolder(node: FolderNode, event: Event) {
    event.stopPropagation()

    if (this.scanProgress.isScanning) return

    this.scanProgress = {
      isScanning: true,
      scanningPath: node.path,
      currentPath: node.path,
      foldersScanned: 0,
      currentSize: 0,
      percentage: 0,
    }

    // Mark node as being analyzed
    this.treeData = this.updateNodeInTree(this.treeData, node.path, {
      isLoading: true,
    })

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'garbage-finder',
        { operation: 'scan', rootPath: node.path },
      )

      if (response.success && response.data?.tree?.[0]) {
        // Replace the node with the analyzed data
        const analyzedNode = response.data.tree[0]
        this.updateAnalyzedNode({
          ...analyzedNode,
          isAnalyzed: true,
          isLoading: false,
        })
      }
    } catch (error) {
      console.error('Scan failed:', error)
      this.treeData = this.updateNodeInTree(this.treeData, node.path, {
        isLoading: false,
      })
    } finally {
      this.scanProgress = {
        ...this.scanProgress,
        isScanning: false,
        percentage: 100,
      }
    }
  }

  updateAnalyzedNode(analyzedNode: FolderNode) {
    const addAnalyzedFlag = (node: FolderNode, depth: number): FolderNode => ({
      ...node,
      depth,
      isAnalyzed: true,
      isExpanded: this.expandedPaths.has(node.path),
      isLoading: false,
      children: node.children.map((child) => addAnalyzedFlag(child, depth + 1)),
    })

    // Find the node in the tree and replace it
    const replaceNode = (
      nodes: FolderNode[],
      targetPath: string,
      newNode: FolderNode,
    ): FolderNode[] => {
      return nodes.map((node) => {
        if (node.path === targetPath) {
          return addAnalyzedFlag(newNode, node.depth)
        }
        if (node.children.length > 0) {
          return {
            ...node,
            children: replaceNode(node.children, targetPath, newNode),
          }
        }
        return node
      })
    }

    this.treeData = replaceNode(this.treeData, analyzedNode.path, analyzedNode)
    this.requestUpdate()
  }

  updateNodeInTree(
    nodes: FolderNode[],
    targetPath: string,
    updates: Partial<FolderNode>,
  ): FolderNode[] {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, ...updates }
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: this.updateNodeInTree(node.children, targetPath, updates),
        }
      }
      return node
    })
  }

  async cancelScan() {
    try {
      await (window as any).electron.ipcRenderer.invoke('cancel-garbage-scan')
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
    // Reset loading state for the scanning node
    if (this.scanProgress.scanningPath) {
      this.treeData = this.updateNodeInTree(
        this.treeData,
        this.scanProgress.scanningPath,
        { isLoading: false },
      )
    }
    this.scanProgress = {
      ...this.scanProgress,
      isScanning: false,
    }
  }

  reset() {
    // Cancel any ongoing scan
    if (this.scanProgress.isScanning) {
      this.cancelScan()
    }
    // Clear expanded paths
    this.expandedPaths.clear()
    // Reload drives to reset the tree
    this.loadDrives()
  }

  showDeleteConfirm(node: FolderNode | FileNode, e: Event) {
    e.stopPropagation()
    this.deleteConfirm = { show: true, node }
  }

  hideDeleteConfirm() {
    this.deleteConfirm = { show: false, node: null }
  }

  // Indicates a delete operation is currently in progress (shows wait dialog)
  deleteInProgress: boolean = false
  deleteInProgressPath: string | null = null

  async confirmDelete() {
    if (!this.deleteConfirm.node) return

    const node = this.deleteConfirm.node
    const nodePath = node.path
    const deletedSize = node.size
    this.hideDeleteConfirm()

    // Show wait dialog while deletion is in progress
    this.deleteInProgress = true
    this.deleteInProgressPath = nodePath
    this.requestUpdate()

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'delete', sourcePath: nodePath },
      )

      if (response.success) {
        // Check if it's a file or folder
        if ('isFile' in node && node.isFile) {
          // Remove file from parent folder's files array and update sizes
          this.treeData = this.removeFileFromTree(this.treeData, nodePath)
          this.treeData = this.updateParentSizesAfterDeletion(
            this.treeData,
            nodePath,
            deletedSize,
          )
        } else {
          // Remove folder node from the tree and update parent sizes
          this.treeData = this.removeNodeFromTree(this.treeData, nodePath)
          this.treeData = this.updateParentSizesAfterDeletion(
            this.treeData,
            nodePath,
            deletedSize,
          )
        }
        // Refresh drive free/total space after deletion
        const drive = this.drives.find((d) => nodePath.startsWith(d.path))
        if (drive) {
          this.fetchDriveInfo(drive)
        }
      } else {
        console.error('Delete failed:', response.error)
        alert(`Failed to delete: ${response.error}`)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert(`Failed to delete: ${error}`)
    } finally {
      this.deleteInProgress = false
      this.deleteInProgressPath = null
      this.requestUpdate()
    }
  }

  removeNodeFromTree(nodes: FolderNode[], targetPath: string): FolderNode[] {
    return nodes
      .filter((node) => node.path !== targetPath)
      .map((node) => ({
        ...node,
        children: this.removeNodeFromTree(node.children, targetPath),
      }))
  }

  removeFileFromTree(nodes: FolderNode[], targetPath: string): FolderNode[] {
    return nodes.map((node) => {
      // Remove file from this node's files array if it exists
      const updatedFiles = node.files
        ? node.files.filter((file) => file.path !== targetPath)
        : node.files

      return {
        ...node,
        files: updatedFiles,
        children: this.removeFileFromTree(node.children, targetPath),
      }
    })
  }

  updateParentSizesAfterDeletion(
    nodes: FolderNode[],
    deletedPath: string,
    deletedSize: number,
  ): FolderNode[] {
    return nodes.map((node) => {
      // Check if this node or any of its children contain the deleted item
      const containsDeletedItem = this.nodeContainsPath(node, deletedPath)

      if (containsDeletedItem) {
        // Subtract the deleted size from this node's size
        return {
          ...node,
          size: Math.max(0, node.size - deletedSize),
          children: this.updateParentSizesAfterDeletion(
            node.children,
            deletedPath,
            deletedSize,
          ),
        }
      }

      // If this node doesn't contain the deleted item, just recurse on children
      return {
        ...node,
        children: this.updateParentSizesAfterDeletion(
          node.children,
          deletedPath,
          deletedSize,
        ),
      }
    })
  }

  nodeContainsPath(node: FolderNode, targetPath: string): boolean {
    // Check if the target path is this node or under this node
    if (targetPath === node.path) return true
    if (
      targetPath.startsWith(node.path + '\\') ||
      targetPath.startsWith(node.path + '/')
    ) {
      return true
    }
    // Check children recursively
    return node.children.some((child) =>
      this.nodeContainsPath(child, targetPath),
    )
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
  }

  getSizeBarClass(size: number, maxSiblingSize: number): string {
    // Color based on comparison with largest sibling at same level
    const percentage = maxSiblingSize > 0 ? (size / maxSiblingSize) * 100 : 0
    if (percentage > 66) return 'large'
    if (percentage > 33) return 'medium'
    return 'small'
  }

  getMaxSiblingSize(siblings: FolderNode[]): number {
    if (siblings.length === 0) return 0
    return Math.max(...siblings.map((s) => s.size))
  }

  getTotalSiblingSize(siblings: FolderNode[]): number {
    return siblings.reduce((sum, s) => sum + s.size, 0)
  }

  getParentSize(node: FolderNode): number {
    // For root nodes (drives), use total drive space or largest sibling
    if (node.depth === 0) {
      const driveInfo = this.getDriveInfo(node.path)
      if (driveInfo?.totalSpace) return driveInfo.totalSpace
      return Math.max(...this.treeData.map((n) => n.size), 1)
    }
    // For nested nodes, find parent's size
    return this.findParentSize(this.treeData, node.path) || node.size
  }

  findParentSize(nodes: FolderNode[], targetPath: string): number {
    for (const node of nodes) {
      if (node.children.some((child) => child.path === targetPath)) {
        return node.size
      }
      if (node.children.length > 0) {
        const found = this.findParentSize(node.children, targetPath)
        if (found) return found
      }
    }
    return 0
  }

  renderTree(nodes: FolderNode[], parentSize: number): any {
    // Sort by size if enabled
    const sortedNodes = this.sortBySize
      ? [...nodes].sort((a, b) => b.size - a.size)
      : nodes
    const maxSiblingSize = this.getMaxSiblingSize(sortedNodes)
    const totalSiblingSize = this.getTotalSiblingSize(sortedNodes)
    // Use the larger of parentSize or totalSiblingSize as reference
    // This handles cases where parent wasn't analyzed but children were
    const effectiveParentSize = Math.max(parentSize, totalSiblingSize)
    return sortedNodes.map((node) => {
      const barWidth =
        effectiveParentSize > 0 ? (node.size / effectiveParentSize) * 100 : 0
      const indent = node.depth * 20
      const driveInfo = node.depth === 0 ? this.getDriveInfo(node.path) : null
      const isBeingAnalyzed =
        this.scanProgress.isScanning &&
        this.scanProgress.scanningPath === node.path

      return html`
        <div
          class="tree-node ${node.isExpanded
            ? 'expanded'
            : ''} ${isBeingAnalyzed ? 'analyzing' : ''}"
        >
          <div
            class="folder-name"
            style="padding-left: ${indent}px"
            @click=${(e: Event) => this.toggleExpand(node, e)}
          >
            <span class="expand-icon">
              ${node.isLoading
                ? html`<span class="spinner spinner-small"></span>`
                : node.isExpanded
                  ? '▼'
                  : '▶'}
            </span>
            <span class="folder-icon">
              ${node.depth === 0 ? '💾' : node.isExpanded ? '📂' : '📁'}
            </span>
            <span class="folder-label" title="${node.path}">${node.name}</span>
            ${driveInfo &&
            (driveInfo.freeSpace !== undefined ||
              driveInfo.totalSpace !== undefined)
              ? html`<span class="drive-info">
                  (${driveInfo.freeSpace !== undefined
                    ? this.formatSize(driveInfo.freeSpace) + ' free'
                    : ''}
                  ${driveInfo.totalSpace !== undefined
                    ? '/ ' + this.formatSize(driveInfo.totalSpace) + ' total'
                    : ''})
                </span>`
              : ''}
          </div>
          <div class="size-bar-container">
            ${node.size > 0
              ? html`
                  <div
                    class="size-bar ${this.getSizeBarClass(
                      node.size,
                      maxSiblingSize,
                    )}"
                    style="width: ${Math.max(barWidth, 1)}%"
                  ></div>
                `
              : ''}
          </div>
          <div class="size-text">
            ${node.size > 0 ? this.formatSize(node.size) : '-'}
          </div>
          <div class="action-cell">
            ${isBeingAnalyzed
              ? html`<button
                  class="btn btn-danger"
                  @click=${(e: Event) => {
                    e.stopPropagation()
                    this.cancelScan()
                  }}
                >
                  Cancel
                </button>`
              : html`
                  <button
                    class="btn btn-primary"
                    ?disabled=${this.scanProgress.isScanning}
                    @click=${(e: Event) => this.analyzeFolder(node, e)}
                  >
                    Analyze
                  </button>
                  ${node.depth > 0
                    ? html`<button
                        class="btn btn-delete"
                        ?disabled=${this.scanProgress.isScanning}
                        @click=${(e: Event) => this.showDeleteConfirm(node, e)}
                        title="Delete folder"
                      >
                        🗑
                      </button>`
                    : ''}
                `}
          </div>
        </div>
        ${node.isExpanded && node.children.length > 0
          ? this.renderTree(node.children, node.size || parentSize)
          : ''}
        ${node.isExpanded && node.files && node.files.length > 0
          ? this.renderFiles(node.files, node.depth)
          : ''}
      `
    })
  }

  renderFiles(files: FileNode[], parentDepth: number): any {
    const indent = (parentDepth + 1) * 20

    return html`${files.map(
      (file) => html`
        <div class="tree-node file-node">
          <div class="folder-name" style="padding-left: ${indent}px">
            <span class="expand-icon"></span>
            <span class="folder-icon">📄</span>
            <span class="folder-label" title="${file.path}">${file.name}</span>
          </div>
          <div class="size-bar-container"></div>
          <div class="size-text">
            ${file.size > 0 ? this.formatSize(file.size) : '-'}
          </div>
          <div class="action-cell">
            <button
              class="btn btn-delete"
              ?disabled=${this.scanProgress.isScanning}
              @click=${(e: Event) => this.showDeleteConfirm(file, e)}
              title="Delete file"
            >
              🗑
            </button>
          </div>
        </div>
      `,
    )}`
  }

  render() {
    const maxRootSize = Math.max(...this.treeData.map((n) => n.size), 1)

    return html`
      <div class="content">
        <div class="header">
          <div>
            <h1>Nice2Have Garbage Finder</h1>
            <div class="subtitle">
              Analyze folder sizes - find your space hogs easily
            </div>
          </div>
          <div class="header-actions">
            <button
              class="btn-toggle ${this.sortBySize ? 'active' : ''}"
              @click=${() => {
                this.sortBySize = !this.sortBySize
                saveGarbageFinderState({ sortBySize: this.sortBySize })
              }}
              title="Sort folders by size (largest first)"
            >
              Sort by Size
            </button>
            <button
              class="btn-reset"
              @click=${() => this.reset()}
              ?disabled=${this.scanProgress.isScanning}
            >
              Reset
            </button>
          </div>
        </div>

        ${this.scanProgress.isScanning
          ? html`
              <div class="progress-section">
                <div class="progress-header">
                  <div class="progress-text">
                    <span class="spinner"></span>
                    Analyzing ${this.scanProgress.scanningPath}...
                  </div>
                  <div class="progress-stats">
                    <div>
                      Folders:
                      <span
                        >${this.scanProgress.foldersScanned.toLocaleString()}</span
                      >
                    </div>
                    <div>
                      Size:
                      <span
                        >${this.formatSize(this.scanProgress.currentSize)}</span
                      >
                    </div>
                  </div>
                </div>
                <div class="progress-bar-container">
                  <div
                    class="progress-bar"
                    style="width: ${this.scanProgress.percentage}%"
                  ></div>
                  <div class="progress-bar-text">
                    ${this.scanProgress.percentage}%
                  </div>
                </div>
                <div class="current-path">${this.scanProgress.currentPath}</div>
              </div>
            `
          : ''}

        <div class="tree-container">
          <div class="tree-header">
            <div>Folder</div>
            <div>Size (relative)</div>
            <div style="text-align: right">Size</div>
            <div style="text-align: center">Action</div>
          </div>
          <div class="tree-body">
            ${this.treeData.length > 0
              ? this.renderTree(this.treeData, maxRootSize)
              : html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>Loading drives...</div>
                  </div>
                `}
          </div>
        </div>
      </div>

      ${this.deleteConfirm.show && this.deleteConfirm.node
        ? (() => {
            const isFile =
              'isFile' in this.deleteConfirm.node! &&
              this.deleteConfirm.node.isFile
            return html`
              <div
                class="confirm-overlay"
                @click=${() => this.hideDeleteConfirm()}
              >
                <div
                  class="confirm-dialog"
                  @click=${(e: Event) => e.stopPropagation()}
                >
                  <div class="confirm-title">
                    ⚠️ Delete ${isFile ? 'File' : 'Folder'}
                  </div>
                  <div class="confirm-message">
                    ${isFile
                      ? 'Are you sure you want to permanently delete this file?'
                      : 'Are you sure you want to permanently delete this folder and all its contents?'}
                  </div>
                  <div class="confirm-path">
                    ${this.deleteConfirm.node!.path}
                  </div>
                  <div class="confirm-buttons">
                    <button
                      class="btn-cancel"
                      @click=${() => this.hideDeleteConfirm()}
                    >
                      Cancel
                    </button>
                    <button
                      class="btn-confirm-delete"
                      @click=${() => this.confirmDelete()}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            `
          })()
        : ''}
      ${this.deleteInProgress
        ? html`
            <div class="confirm-overlay">
              <div class="confirm-dialog">
                <div class="confirm-title">Deleting…</div>
                <div class="confirm-message">
                  Deleting ${this.deleteInProgressPath}
                </div>
                <div style="margin-top:12px;text-align:center">
                  <span class="spinner"></span>
                </div>
              </div>
            </div>
          `
        : ''}
    `
  }
}

customElements.define('nh-garbagefinder', GarbageFinder)
