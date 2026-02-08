import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../navigation/ResponsiveMenu'

interface FolderNode {
  name: string
  path: string
  size: number
  children: FolderNode[]
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
      grid-template-columns: 1fr 150px 100px 80px;
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
    }

    .tree-node {
      display: grid;
      grid-template-columns: 1fr 150px 100px 80px;
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
      text-align: center;
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

  private expandedPaths: Set<string> = new Set()

  connectedCallback() {
    super.connectedCallback()

    // Load available drives
    this.loadDrives()

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
          isExpanded: false,
          depth: 0,
          fileCount: 0,
          folderCount: 0,
          isAnalyzed: false,
          isLoading: false,
        }))

        this.drives = response.data.drives

        // Fetch drive info for each drive
        for (const drive of response.data.drives) {
          this.fetchDriveInfo(drive)
        }
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
      // Expand - load children if not analyzed
      this.expandedPaths.add(node.path)
      if (!node.isAnalyzed && node.children.length === 0) {
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
            isExpanded: false,
            depth: node.depth + 1,
            fileCount: 0,
            folderCount: 0,
            isAnalyzed: false,
            isLoading: false,
          }),
        )

        this.treeData = this.updateNodeInTree(this.treeData, node.path, {
          children,
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

    this.treeData = replaceNode(
      this.treeData,
      analyzedNode.path,
      analyzedNode,
    )
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

  formatSize(bytes: number): string {
    if (bytes === 0) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
  }

  getSizeBarClass(size: number, parentSize: number): string {
    const percentage = parentSize > 0 ? (size / parentSize) * 100 : 0
    if (percentage > 50) return 'large'
    if (percentage > 20) return 'medium'
    return 'small'
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
    return nodes.map((node) => {
        const percentage = parentSize > 0 ? (node.size / parentSize) * 100 : 0
        const indent = node.depth * 20
        const driveInfo = node.depth === 0 ? this.getDriveInfo(node.path) : null
        const isBeingAnalyzed =
          this.scanProgress.isScanning &&
          this.scanProgress.scanningPath === node.path

        return html`
          <div
            class="tree-node ${node.isExpanded ? 'expanded' : ''} ${isBeingAnalyzed
              ? 'analyzing'
              : ''}"
          >
            <div
              class="folder-name"
              style="padding-left: ${indent}px"
              @click=${(e: Event) => this.toggleExpand(node, e)}
            >
              <span class="expand-icon">
                ${node.isLoading
                  ? html`<span class="spinner spinner-small"></span>`
                  : node.children.length > 0 || !node.isAnalyzed
                    ? node.isExpanded
                      ? '▼'
                      : '▶'
                    : ''}
              </span>
              <span class="folder-icon">
                ${node.depth === 0 ? '💾' : node.isExpanded ? '📂' : '📁'}
              </span>
              <span class="folder-label" title="${node.path}">${node.name}</span>
              ${driveInfo?.freeSpace !== undefined
                ? html`<span class="drive-info">
                    (${this.formatSize(driveInfo.freeSpace)} free)
                  </span>`
                : ''}
            </div>
            <div class="size-bar-container">
              ${node.isAnalyzed && node.size > 0
                ? html`
                    <div
                      class="size-bar ${this.getSizeBarClass(
                        node.size,
                        parentSize,
                      )}"
                      style="width: ${Math.max(percentage, 1)}%"
                    ></div>
                  `
                : ''}
            </div>
            <div class="size-text">
              ${node.isAnalyzed ? this.formatSize(node.size) : '-'}
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
                : html`<button
                    class="btn btn-primary"
                    ?disabled=${this.scanProgress.isScanning}
                    @click=${(e: Event) => this.analyzeFolder(node, e)}
                  >
                    Analyze
                  </button>`}
            </div>
          </div>
          ${node.isExpanded && node.children.length > 0
            ? this.renderTree(node.children, node.size || parentSize)
            : ''}
        `
      })
  }

  render() {
    const maxRootSize = Math.max(...this.treeData.map((n) => n.size), 1)

    return html`
      <div class="content">
        <div class="header">
          <div>
            <h1>GarbageFinder</h1>
            <div class="subtitle">
              Analyze folder sizes - find your space hogs easily
            </div>
          </div>
          <button
            class="btn-reset"
            @click=${() => this.reset()}
            ?disabled=${this.scanProgress.isScanning}
          >
            Reset
          </button>
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
    `
  }
}

customElements.define('nh-garbagefinder', GarbageFinder)
