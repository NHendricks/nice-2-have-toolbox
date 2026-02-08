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
}

interface ScanProgress {
  isScanning: boolean
  currentPath: string
  foldersScanned: number
  currentSize: number
  percentage: number
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
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
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

    .toolbar {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-bottom: 1rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.6rem 1.2rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
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

    .btn-secondary {
      background: #475569;
      color: white;
    }

    .btn-secondary:hover {
      background: #64748b;
    }

    .path-display {
      flex: 1;
      padding: 0.6rem 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      color: #94a3b8;
      font-family: monospace;
      min-width: 200px;
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
      display: flex;
      align-items: center;
      justify-content: center;
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
      grid-template-columns: 1fr 200px 120px;
      gap: 1rem;
      padding: 0.75rem 1rem;
      background: #334155;
      font-weight: 600;
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .tree-body {
      max-height: calc(100vh - 400px);
      overflow-y: auto;
    }

    .tree-node {
      display: grid;
      grid-template-columns: 1fr 200px 120px;
      gap: 1rem;
      padding: 0.5rem 1rem;
      border-bottom: 1px solid #1e293b;
      align-items: center;
      cursor: pointer;
      transition: background 0.15s;
    }

    .tree-node:hover {
      background: #334155;
    }

    .tree-node.expanded {
      background: #1e3a5f;
    }

    .folder-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
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
      height: 20px;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
      position: relative;
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
      font-weight: 600;
      color: #e2e8f0;
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
      width: 16px;
      height: 16px;
      border: 2px solid #0ea5e9;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `

  @property({ type: String })
  selectedPath = ''

  @property({ type: Array })
  treeData: FolderNode[] = []

  @property({ type: Object })
  scanProgress: ScanProgress = {
    isScanning: false,
    currentPath: '',
    foldersScanned: 0,
    currentSize: 0,
    percentage: 0,
  }

  @property({ type: Number })
  rootSize = 0

  connectedCallback() {
    super.connectedCallback()
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
        this.requestUpdate()
      },
    )
  }

  async selectFolder() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory'],
          title: 'Select folder to analyze',
        },
      )

      if (!response.canceled && response.filePaths?.length > 0) {
        this.selectedPath = response.filePaths[0]
      }
    } catch (error) {
      console.error('Failed to select folder:', error)
    }
  }

  async startScan() {
    if (!this.selectedPath) return

    this.scanProgress = {
      isScanning: true,
      currentPath: this.selectedPath,
      foldersScanned: 0,
      currentSize: 0,
      percentage: 0,
    }
    this.treeData = []
    this.rootSize = 0

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'garbage-finder',
        { operation: 'scan', rootPath: this.selectedPath },
      )

      if (response.success && response.data) {
        this.treeData = response.data.tree || []
        this.rootSize = response.data.totalSize || 0
        // Expand root level
        if (this.treeData.length > 0) {
          this.treeData = this.treeData.map((node) => ({
            ...node,
            isExpanded: true,
          }))
        }
      }
    } catch (error) {
      console.error('Scan failed:', error)
    } finally {
      this.scanProgress = {
        ...this.scanProgress,
        isScanning: false,
        percentage: 100,
      }
    }
  }

  async cancelScan() {
    try {
      await (window as any).electron.ipcRenderer.invoke('cancel-garbage-scan')
    } catch (error) {
      console.error('Failed to cancel:', error)
    }
    this.scanProgress = {
      ...this.scanProgress,
      isScanning: false,
    }
  }

  toggleNode(nodePath: string) {
    this.treeData = this.toggleNodeRecursive(this.treeData, nodePath)
    this.requestUpdate()
  }

  toggleNodeRecursive(nodes: FolderNode[], targetPath: string): FolderNode[] {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, isExpanded: !node.isExpanded }
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: this.toggleNodeRecursive(node.children, targetPath),
        }
      }
      return node
    })
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '0 B'
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

  renderTree(nodes: FolderNode[], parentSize: number): any {
    return nodes
      .sort((a, b) => b.size - a.size) // Sort by size descending
      .map((node) => {
        const percentage = parentSize > 0 ? (node.size / parentSize) * 100 : 0
        const indent = node.depth * 20

        return html`
          <div
            class="tree-node ${node.isExpanded ? 'expanded' : ''}"
            @click=${() => this.toggleNode(node.path)}
          >
            <div class="folder-name" style="padding-left: ${indent}px">
              <span class="folder-icon">
                ${node.children.length > 0
                  ? node.isExpanded
                    ? '📂'
                    : '📁'
                  : '📁'}
              </span>
              <span class="folder-label" title="${node.path}">${node.name}</span>
            </div>
            <div class="size-bar-container">
              <div
                class="size-bar ${this.getSizeBarClass(node.size, parentSize)}"
                style="width: ${Math.max(percentage, 1)}%"
              ></div>
            </div>
            <div class="size-text">${this.formatSize(node.size)}</div>
          </div>
          ${node.isExpanded && node.children.length > 0
            ? this.renderTree(node.children, node.size)
            : ''}
        `
      })
  }

  render() {
    return html`
      <div class="content">
        <div class="header">
          <div>
            <h1>GarbageFinder</h1>
            <div class="subtitle">Analyze folder sizes like TreeSize</div>
          </div>
        </div>

        <div class="toolbar">
          <button
            class="btn btn-secondary"
            @click=${this.selectFolder}
            ?disabled=${this.scanProgress.isScanning}
          >
            Select Folder
          </button>
          <div class="path-display">
            ${this.selectedPath || 'No folder selected'}
          </div>
          ${this.scanProgress.isScanning
            ? html`
                <button class="btn btn-danger" @click=${this.cancelScan}>
                  Cancel
                </button>
              `
            : html`
                <button
                  class="btn btn-primary"
                  @click=${this.startScan}
                  ?disabled=${!this.selectedPath}
                >
                  Scan
                </button>
              `}
        </div>

        ${this.scanProgress.isScanning
          ? html`
              <div class="progress-section">
                <div class="progress-header">
                  <div class="progress-text">
                    <span class="spinner"></span>
                    Scanning folders...
                  </div>
                  <div class="progress-stats">
                    <div>
                      Folders: <span>${this.scanProgress.foldersScanned.toLocaleString()}</span>
                    </div>
                    <div>
                      Size: <span>${this.formatSize(this.scanProgress.currentSize)}</span>
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
          </div>
          <div class="tree-body">
            ${this.treeData.length > 0
              ? this.renderTree(this.treeData, this.rootSize)
              : html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📊</div>
                    <div>Select a folder and click Scan to analyze</div>
                  </div>
                `}
          </div>
        </div>
      </div>
    `
  }
}

customElements.define('nh-garbagefinder', GarbageFinder)
