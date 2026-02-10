/**
 * ResticUI - Main container component for Restic backup management
 * Provides a Time Machine-like interface for managing backups
 */

import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type {
  ResticBackupProgress,
  ResticDiffResult,
  ResticFileEntry,
  ResticRepository,
  ResticRetentionPolicy,
  ResticSnapshot,
  ResticStats,
  ResticTab,
  SavedResticConnection,
  SnapshotGroup,
} from './restic.types.js'

// Obfuscation key for password storage (not cryptographically secure, but prevents plain text storage)
const OBFUSCATION_KEY = 'nh-restic-conn-key'

function obfuscatePassword(password: string): string {
  let result = ''
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(
      password.charCodeAt(i) ^
        OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
    )
  }
  return btoa(result)
}

function deobfuscatePassword(obfuscated: string): string {
  try {
    const decoded = atob(obfuscated)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^
          OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
      )
    }
    return result
  } catch {
    return obfuscated
  }
}

@customElement('nh-restic')
export class ResticUI extends LitElement {
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

    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #f8fafc;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .repo-config {
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-bottom: 1rem;
    }

    .repo-form {
      display: grid;
      grid-template-columns: 1fr 200px auto;
      gap: 0.75rem;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .form-group label {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .form-group input {
      padding: 0.5rem 0.75rem;
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.9rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .repo-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: #0f172a;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.connected {
      background: #22c55e;
    }

    .status-dot.disconnected {
      background: #ef4444;
    }

    .status-dot.warning {
      background: #f59e0b;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px 8px 0 0;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .tab.active {
      background: #0ea5e9;
      border-color: #0ea5e9;
      color: white;
    }

    .tab-content {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0 8px 8px 8px;
      padding: 1rem;
      min-height: 400px;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
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

    .btn-secondary {
      background: #475569;
      color: white;
    }

    .btn-secondary:hover {
      background: #64748b;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .btn-small {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    /* Backup Panel Styles */
    .backup-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .backup-paths {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .backup-paths h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .path-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .path-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .backup-progress {
      margin-top: 1rem;
      padding: 1rem;
      background: #0f172a;
      border-radius: 8px;
    }

    .progress-bar-container {
      height: 24px;
      background: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      margin: 0.5rem 0;
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

    .progress-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .current-file {
      font-family: monospace;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Browse Panel Styles */
    .browse-panel {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1rem;
      height: 500px;
    }

    .timeline {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      overflow-y: auto;
    }

    .timeline h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .timeline-group {
      margin-bottom: 1rem;
    }

    .timeline-group-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .timeline-item:hover {
      background: #1e293b;
    }

    .timeline-item.selected {
      background: #0ea5e9;
    }

    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #475569;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .timeline-item.selected .timeline-dot {
      background: white;
    }

    .timeline-info {
      flex: 1;
      min-width: 0;
    }

    .timeline-time {
      font-weight: 600;
      font-size: 0.9rem;
      color: #e2e8f0;
    }

    .timeline-paths {
      font-size: 0.75rem;
      color: #94a3b8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-browser {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
    }

    .file-browser h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      color: #94a3b8;
      overflow-x: auto;
    }

    .breadcrumb-item {
      padding: 0.25rem 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .breadcrumb-item:hover {
      background: #334155;
    }

    .file-list {
      flex: 1;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 4px;
    }

    .file-item {
      display: grid;
      grid-template-columns: 1fr 100px 150px;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #0f172a;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .file-item:hover {
      background: #334155;
    }

    .file-item.selected {
      background: #0ea5e9;
    }

    .file-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      text-align: right;
      color: #94a3b8;
    }

    .file-date {
      text-align: right;
      color: #64748b;
    }

    .file-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #1e293b;
      border-radius: 0 0 4px 4px;
    }

    /* Tree View Styles */
    .tree-container {
      flex: 1;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 4px;
      padding: 0.5rem 0;
    }

    .tree-node {
      user-select: none;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      border-radius: 2px;
    }

    .tree-item:hover {
      background: #334155;
    }

    .tree-item.directory {
      color: #e2e8f0;
    }

    .tree-item.file {
      color: #94a3b8;
    }

    .tree-toggle {
      width: 16px;
      font-size: 0.7rem;
      color: #64748b;
      flex-shrink: 0;
    }

    .tree-icon {
      flex-shrink: 0;
    }

    .tree-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-size {
      color: #64748b;
      font-size: 0.75rem;
      margin-left: auto;
      padding-left: 1rem;
    }

    .tree-children {
      /* Children are indented via padding-left in renderTreeNode */
    }

    /* Retention Panel Styles */
    .retention-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .retention-config {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .retention-config h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .retention-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .retention-field label {
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .retention-field input {
      width: 80px;
      padding: 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      text-align: center;
    }

    .retention-preview {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .retention-preview h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    /* Health Panel Styles */
    .health-panel {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .health-card {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .health-card h3 {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .health-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22c55e;
    }

    .health-actions {
      grid-column: span 3;
      display: flex;
      gap: 1rem;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #0ea5e9;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .message {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .message.success {
      background: #14532d;
      color: #86efac;
      border: 1px solid #22c55e;
    }

    .message.error {
      background: #7f1d1d;
      color: #fca5a5;
      border: 1px solid #ef4444;
    }

    .message.info {
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #3b82f6;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #64748b;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .not-installed {
      padding: 2rem;
      text-align: center;
    }

    .not-installed h2 {
      color: #f59e0b;
      margin-bottom: 1rem;
    }

    .not-installed p {
      color: #94a3b8;
      margin-bottom: 1rem;
    }

    .not-installed a {
      color: #0ea5e9;
    }

    /* Compare Panel Styles */
    .compare-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .compare-selectors {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1rem;
      align-items: start;
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .compare-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .compare-selector h4 {
      margin: 0;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .compare-selector select {
      padding: 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.85rem;
    }

    .compare-selector select:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .compare-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #64748b;
      padding-top: 1.5rem;
    }

    .compare-actions {
      display: flex;
      justify-content: center;
    }

    .diff-results {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .diff-section {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .diff-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .diff-section.added h4 {
      color: #22c55e;
    }

    .diff-section.removed h4 {
      color: #ef4444;
    }

    .diff-section.modified h4 {
      color: #f59e0b;
    }

    .diff-count {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      background: currentColor;
      color: #0f172a;
      font-weight: 700;
    }

    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .diff-item {
      font-family: monospace;
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diff-item.added {
      border-left: 3px solid #22c55e;
    }

    .diff-item.removed {
      border-left: 3px solid #ef4444;
    }

    .diff-item.modified {
      border-left: 3px solid #f59e0b;
    }

    .compare-summary {
      display: flex;
      gap: 2rem;
      justify-content: center;
      padding: 1rem;
      background: #0f172a;
      border-radius: 8px;
    }

    .summary-stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .summary-stat.added {
      color: #22c55e;
    }

    .summary-stat.removed {
      color: #ef4444;
    }

    .summary-stat.modified {
      color: #f59e0b;
    }

    .summary-stat .count {
      font-weight: 700;
      font-size: 1.25rem;
    }
  `

  @state() private activeTab: ResticTab = 'backup'
  @state() private repository: ResticRepository | null = null
  @state() private repoPath: string = ''
  @state() private repoPassword: string = ''
  @state() private snapshots: ResticSnapshot[] = []
  @state() private selectedSnapshot: ResticSnapshot | null = null
  @state() private browseEntries: ResticFileEntry[] = []
  @state() private browsePath: string = '/'
  @state() private isLoading: boolean = false
  @state() private loadingMessage: string = ''
  @state() private message: {
    type: 'success' | 'error' | 'info'
    text: string
  } | null = null
  @state() private resticInstalled: boolean | null = null
  @state() private resticVersion: string = ''

  // Backup state
  @state() private backupPaths: string[] = []
  @state() private backupProgress: ResticBackupProgress | null = null
  @state() private isBackingUp: boolean = false

  // Stats
  @state() private stats: ResticStats | null = null

  // Retention policy
  @state() private retentionPolicy: ResticRetentionPolicy = {
    keepLast: 5,
    keepDaily: 7,
    keepWeekly: 4,
    keepMonthly: 12,
    keepYearly: 2,
  }

  // Compare state
  @state() private compareSnapshot1: ResticSnapshot | null = null
  @state() private compareSnapshot2: ResticSnapshot | null = null
  @state() private diffResult: ResticDiffResult | null = null
  @state() private isComparing: boolean = false

  // Saved connections
  @state() private savedConnections: SavedResticConnection[] = []
  @state() private connectionName: string = ''

  // Tree view state for file browser
  @state() private expandedPaths: Set<string> = new Set()

  connectedCallback() {
    super.connectedCallback()
    this.checkResticInstalled()
    this.loadSavedConnections()

    // Listen for backup progress events
    // Note: preload strips the event, so we only receive the data
    ;(window as any).electron?.ipcRenderer?.on(
      'restic-backup-progress',
      (data: any) => {
        console.log('[Restic] Progress received:', data)
        this.backupProgress = data
        this.requestUpdate()
      },
    )
  }

  private loadSavedConnections() {
    try {
      const saved = localStorage.getItem('restic-connections')
      if (saved) {
        this.savedConnections = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load saved restic connections:', error)
      this.savedConnections = []
    }
  }

  private persistSavedConnections() {
    localStorage.setItem(
      'restic-connections',
      JSON.stringify(this.savedConnections),
    )
  }

  private saveCurrentConnection() {
    if (!this.connectionName.trim()) {
      this.showMessage('error', 'Please enter a connection name')
      return
    }
    if (!this.repoPath) {
      this.showMessage('error', 'Please enter a repository path')
      return
    }
    if (!this.repoPassword) {
      this.showMessage('error', 'Please enter a password')
      return
    }

    const connection: SavedResticConnection = {
      name: this.connectionName.trim(),
      repoPath: this.repoPath,
      passwordObfuscated: obfuscatePassword(this.repoPassword),
      backupPaths:
        this.backupPaths.length > 0 ? [...this.backupPaths] : undefined,
    }

    // Check if connection with same name exists
    const existingIndex = this.savedConnections.findIndex(
      (c) => c.name === connection.name,
    )
    if (existingIndex >= 0) {
      this.savedConnections[existingIndex] = connection
    } else {
      this.savedConnections = [...this.savedConnections, connection]
    }

    this.persistSavedConnections()
    this.showMessage('success', `Connection "${connection.name}" saved`)
    this.connectionName = ''
  }

  private loadConnection(connection: SavedResticConnection) {
    this.repoPath = connection.repoPath
    this.repoPassword = deobfuscatePassword(connection.passwordObfuscated)
    this.connectionName = connection.name
    // Restore saved backup paths
    if (connection.backupPaths?.length) {
      this.backupPaths = [...connection.backupPaths]
    }
  }

  private deleteConnection(name: string, event: Event) {
    event.stopPropagation()
    this.savedConnections = this.savedConnections.filter((c) => c.name !== name)
    this.persistSavedConnections()
    this.showMessage('info', `Connection "${name}" deleted`)
  }

  private updateConnectionBackupPaths() {
    // Auto-save backup paths to the current connection (if one is loaded)
    if (!this.connectionName) return
    const index = this.savedConnections.findIndex(
      (c) => c.name === this.connectionName,
    )
    if (index >= 0) {
      this.savedConnections[index] = {
        ...this.savedConnections[index],
        backupPaths:
          this.backupPaths.length > 0 ? [...this.backupPaths] : undefined,
      }
      this.persistSavedConnections()
    }
  }

  private async exportConnections() {
    if (this.savedConnections.length === 0) {
      this.showMessage('error', 'No connections to export')
      return
    }

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-save-dialog',
        {
          title: 'Export Restic Connections',
          defaultPath: 'restic-connections.json',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        },
      )

      if (response.success && !response.canceled && response.filePath) {
        // Write connections to file via backend
        const writeResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: 'write-file',
            filePath: response.filePath,
            content: JSON.stringify(this.savedConnections, null, 2),
          },
        )

        if (writeResponse.success) {
          this.showMessage(
            'success',
            `Exported ${this.savedConnections.length} connections`,
          )
        } else {
          this.showMessage('error', writeResponse.error || 'Failed to export')
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private async importConnections() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          title: 'Import Restic Connections',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile'],
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        // Read connections from file via backend
        const readResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: 'read',
            filePath: response.filePaths[0],
          },
        )

        if (readResponse.success && readResponse.data?.content) {
          const imported = JSON.parse(
            readResponse.data.content,
          ) as SavedResticConnection[]

          if (!Array.isArray(imported)) {
            this.showMessage('error', 'Invalid file format')
            return
          }

          // Merge with existing connections (skip duplicates by name)
          let addedCount = 0
          for (const conn of imported) {
            if (conn.name && conn.repoPath && conn.passwordObfuscated) {
              const exists = this.savedConnections.some(
                (c) => c.name === conn.name,
              )
              if (!exists) {
                this.savedConnections = [...this.savedConnections, conn]
                addedCount++
              }
            }
          }

          this.persistSavedConnections()
          this.showMessage('success', `Imported ${addedCount} new connections`)
        } else {
          this.showMessage('error', readResponse.error || 'Failed to read file')
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private async checkResticInstalled() {
    try {
      const response = await this.invokeRestic({ operation: 'check-installed' })
      if (response.success && response.data) {
        this.resticInstalled = response.data.installed
        this.resticVersion = response.data.version || ''
      }
    } catch (error) {
      this.resticInstalled = false
    }
  }

  private async invokeRestic(params: any): Promise<any> {
    return (window as any).electron.ipcRenderer.invoke(
      'cli-execute',
      'restic',
      {
        ...params,
        repoPath: params.repoPath || this.repoPath,
        password: params.password || this.repoPassword,
      },
    )
  }

  private async connectRepository() {
    if (!this.repoPath || !this.repoPassword) {
      this.showMessage('error', 'Please enter repository path and password')
      return
    }

    this.isLoading = true
    this.loadingMessage = 'Connecting to repository...'

    try {
      // Try to get snapshots to verify connection
      const response = await this.invokeRestic({ operation: 'snapshots' })
      const result = response.data || response

      if (response.success && result.success) {
        this.repository = {
          path: this.repoPath,
          password: this.repoPassword,
          isInitialized: true,
        }
        this.snapshots = result.snapshots || []
        // Always load all unique backup paths from ALL snapshots
        if (this.snapshots.length > 0) {
          // Collect all unique paths from all snapshots
          const allPaths = new Set<string>()
          for (const snapshot of this.snapshots) {
            if (snapshot.paths?.length) {
              snapshot.paths.forEach((p: string) => allPaths.add(p))
            }
          }
          if (allPaths.size > 0) {
            this.backupPaths = Array.from(allPaths).sort()
          }
        }
        this.showMessage(
          'success',
          `Connected! Found ${this.snapshots.length} snapshots.`,
        )
        await this.loadStats()
      } else {
        const errorMsg = result.error || response.error || 'Failed to connect'
        // Check if repository needs initialization
        if (
          errorMsg.includes('does not exist') ||
          errorMsg.includes('unable to open')
        ) {
          this.showMessage(
            'info',
            'Repository not found. Click "Initialize" to create a new one.',
          )
        } else if (
          errorMsg.includes('wrong password') ||
          errorMsg.includes('no key found')
        ) {
          this.showMessage(
            'error',
            'Wrong password. Please check your credentials.',
          )
        } else {
          this.showMessage('error', errorMsg)
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async initRepository() {
    if (!this.repoPath || !this.repoPassword) {
      this.showMessage('error', 'Please enter repository path and password')
      return
    }

    this.isLoading = true
    this.loadingMessage = 'Checking if safe to initialize...'

    try {
      // First check if the path is safe for initialization
      const safeCheck = await this.invokeRestic({
        operation: 'check-init-safe',
      })
      if (safeCheck.success && safeCheck.data && !safeCheck.data.safe) {
        this.showMessage(
          'error',
          `Cannot initialize: folder contains ${safeCheck.data.fileCount} files. Use an empty folder or connect to existing repository.`,
        )
        return
      }

      this.loadingMessage = 'Initializing repository...'
      const response = await this.invokeRestic({ operation: 'init' })

      if (response.success) {
        this.repository = {
          path: this.repoPath,
          password: this.repoPassword,
          isInitialized: true,
        }
        this.snapshots = []
        this.showMessage('success', 'Repository initialized successfully!')
      } else {
        this.showMessage(
          'error',
          response.error || 'Failed to initialize repository',
        )
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async loadSnapshots() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Loading snapshots...'

    try {
      const response = await this.invokeRestic({ operation: 'snapshots' })
      if (response.success) {
        this.snapshots = response.data?.snapshots || []
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async loadStats() {
    if (!this.repository) return

    try {
      const response = await this.invokeRestic({ operation: 'stats' })
      if (response.success) {
        this.stats = response.data?.stats
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error)
    }
  }

  private async selectFolder() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory'],
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        const newPath = response.filePaths[0]
        if (!this.backupPaths.includes(newPath)) {
          this.backupPaths = [...this.backupPaths, newPath]
          this.updateConnectionBackupPaths()
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private removePath(path: string) {
    this.backupPaths = this.backupPaths.filter((p) => p !== path)
    this.updateConnectionBackupPaths()
  }

  private async startBackup() {
    if (!this.repository || this.backupPaths.length === 0) {
      this.showMessage('error', 'Please select folders to backup')
      return
    }

    this.isBackingUp = true
    this.backupProgress = null

    try {
      const response = await this.invokeRestic({
        operation: 'backup',
        paths: this.backupPaths,
      })

      if (response.success) {
        this.showMessage('success', 'Backup completed successfully!')
        await this.loadSnapshots()
        await this.loadStats()
      } else {
        this.showMessage('error', response.error || 'Backup failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isBackingUp = false
      this.backupProgress = null
    }
  }

  private async selectSnapshot(snapshot: ResticSnapshot) {
    this.selectedSnapshot = snapshot
    this.browsePath = '/'
    await this.loadSnapshotFiles()
  }

  private async loadSnapshotFiles() {
    if (!this.selectedSnapshot) return

    this.isLoading = true
    this.loadingMessage = 'Loading files...'

    try {
      // Don't pass a path - get ALL files recursively for tree view
      const response = await this.invokeRestic({
        operation: 'ls',
        snapshotId: this.selectedSnapshot.short_id || this.selectedSnapshot.id,
        // No path = get all files recursively
      })

      if (response.success) {
        this.browseEntries = response.data?.entries || []
        // Build tree and auto-expand single-child paths
        const tree = this.buildFileTree(this.browseEntries)
        const rootEntries = this.getRootEntries(tree)
        this.expandedPaths = this.computeAutoExpandPaths(tree, rootEntries)
      } else {
        this.showMessage('error', response.error || 'Failed to load files')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async navigateToPath(path: string) {
    this.browsePath = path
    await this.loadSnapshotFiles()
  }

  private async restoreSelected() {
    if (!this.selectedSnapshot) return

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select restore destination',
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        this.isLoading = true
        this.loadingMessage = 'Restoring files...'

        const restoreResponse = await this.invokeRestic({
          operation: 'restore',
          snapshotId:
            this.selectedSnapshot.short_id || this.selectedSnapshot.id,
          targetPath: response.filePaths[0],
        })

        if (restoreResponse.success) {
          this.showMessage(
            'success',
            `Files restored to ${response.filePaths[0]}`,
          )
        } else {
          this.showMessage('error', restoreResponse.error || 'Restore failed')
        }

        this.isLoading = false
        this.loadingMessage = ''
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
      this.isLoading = false
    }
  }

  private async applyRetentionPolicy() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Applying retention policy...'

    try {
      const response = await this.invokeRestic({
        operation: 'forget',
        policy: this.retentionPolicy,
        prune: true,
      })

      if (response.success) {
        this.showMessage('success', 'Retention policy applied successfully')
        await this.loadSnapshots()
        await this.loadStats()
      } else {
        this.showMessage(
          'error',
          response.error || 'Failed to apply retention policy',
        )
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runCheck() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Checking repository...'

    try {
      const response = await this.invokeRestic({ operation: 'check' })

      if (response.success && response.data?.success) {
        this.showMessage('success', 'Repository check passed!')
      } else {
        this.showMessage(
          'error',
          response.data?.error || response.error || 'Check failed',
        )
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runPrune() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Pruning repository...'

    try {
      const response = await this.invokeRestic({ operation: 'prune' })

      if (response.success) {
        this.showMessage('success', 'Repository pruned successfully')
        await this.loadStats()
      } else {
        this.showMessage('error', response.error || 'Prune failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runUnlock() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Unlocking repository...'

    try {
      const response = await this.invokeRestic({ operation: 'unlock' })

      if (response.success) {
        this.showMessage('success', 'Repository unlocked')
      } else {
        this.showMessage('error', response.error || 'Unlock failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async compareSnapshots() {
    if (!this.compareSnapshot1 || !this.compareSnapshot2) {
      this.showMessage('error', 'Please select two snapshots to compare')
      return
    }

    if (this.compareSnapshot1.id === this.compareSnapshot2.id) {
      this.showMessage('error', 'Please select two different snapshots')
      return
    }

    this.isComparing = true
    this.diffResult = null

    try {
      const response = await this.invokeRestic({
        operation: 'diff',
        snapshotId1: this.compareSnapshot1.short_id || this.compareSnapshot1.id,
        snapshotId2: this.compareSnapshot2.short_id || this.compareSnapshot2.id,
      })

      if (response.success && response.data?.diff) {
        this.diffResult = response.data.diff
        const total =
          this.diffResult.summary.addedCount +
          this.diffResult.summary.removedCount +
          this.diffResult.summary.modifiedCount
        this.showMessage(
          'success',
          `Comparison complete: ${total} changes found`,
        )
      } else {
        this.showMessage('error', response.error || 'Comparison failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isComparing = false
    }
  }

  private showMessage(type: 'success' | 'error' | 'info', text: string) {
    this.message = { type, text }
    setTimeout(() => {
      this.message = null
    }, 5000)
  }

  private formatSize(bytes: number): string {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString()
    } catch {
      return dateStr
    }
  }

  private formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  private groupSnapshots(): SnapshotGroup[] {
    const groups: Map<string, SnapshotGroup> = new Map()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    for (const snapshot of this.snapshots) {
      const date = new Date(snapshot.time)
      date.setHours(0, 0, 0, 0)

      let label: string
      if (date.getTime() === today.getTime()) {
        label = 'Today'
      } else if (date.getTime() === yesterday.getTime()) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      }

      if (!groups.has(label)) {
        groups.set(label, { label, date, snapshots: [] })
      }
      groups.get(label)!.snapshots.push(snapshot)
    }

    // Sort groups by date descending, then sort snapshots within each group
    return Array.from(groups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((group) => ({
        ...group,
        snapshots: group.snapshots.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        ),
      }))
  }

  private getBreadcrumbs(): string[] {
    if (this.browsePath === '/') return ['/']
    const parts = this.browsePath.split('/').filter((p) => p)
    return ['/', ...parts]
  }

  // Tree node interface for file browser
  private getParentPath(path: string): string {
    // Handle both Windows (C:\foo\bar) and Unix (/foo/bar) paths
    // Normalize to forward slashes for consistency
    const normalized = path.replace(/\\/g, '/')
    const lastSlash = normalized.lastIndexOf('/')

    // Handle Windows drive roots like C:/ or D:/
    if (lastSlash <= 0) return '/'
    if (lastSlash === 2 && normalized[1] === ':') {
      // Path like C:/file - parent is C:/
      return normalized.substring(0, 3)
    }
    return normalized.substring(0, lastSlash)
  }

  private buildFileTree(
    entries: ResticFileEntry[],
  ): Map<string, ResticFileEntry[]> {
    // Group entries by their parent directory
    const tree = new Map<string, ResticFileEntry[]>()

    for (const entry of entries) {
      // Normalize path for consistent handling
      const normalizedPath = entry.path.replace(/\\/g, '/')
      const parentPath = this.getParentPath(normalizedPath)

      if (!tree.has(parentPath)) {
        tree.set(parentPath, [])
      }
      // Store entry with normalized path
      tree.get(parentPath)!.push({ ...entry, path: normalizedPath })
    }

    // Sort each directory's children (folders first, then alphabetically)
    tree.forEach((children, _path) => {
      children.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        return a.name.localeCompare(b.name)
      })
    })

    return tree
  }

  private toggleTreeNode(path: string) {
    const newExpanded = new Set(this.expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    this.expandedPaths = newExpanded
  }

  private renderTreeNode(
    entry: ResticFileEntry,
    tree: Map<string, ResticFileEntry[]>,
    depth: number = 0,
  ): any {
    const isDir = entry.type === 'dir'
    const isExpanded = this.expandedPaths.has(entry.path)
    const children = isDir ? tree.get(entry.path) || [] : []
    const indent = depth * 20

    return html`
      <div class="tree-node">
        <div
          class="tree-item ${isDir ? 'directory' : 'file'}"
          style="padding-left: ${indent + 8}px"
          @click=${() => isDir && this.toggleTreeNode(entry.path)}
        >
          <span
            class="tree-toggle"
            style="visibility: ${isDir && children.length > 0
              ? 'visible'
              : 'hidden'}"
          >
            ${isExpanded ? '▼' : '▶'}
          </span>
          <span class="tree-icon">${isDir ? '📁' : '📄'}</span>
          <span class="tree-name">${entry.name}</span>
          ${!isDir
            ? html`<span class="tree-size"
                >${this.formatSize(entry.size)}</span
              >`
            : ''}
        </div>
        ${isDir && isExpanded
          ? html`
              <div class="tree-children">
                ${children.map((child) =>
                  this.renderTreeNode(child, tree, depth + 1),
                )}
              </div>
            `
          : ''}
      </div>
    `
  }

  private getRootEntries(
    tree: Map<string, ResticFileEntry[]>,
  ): ResticFileEntry[] {
    // Find the root entries - entries whose parent is '/' or a Windows drive root
    const rootEntries: ResticFileEntry[] = []
    const allPaths = new Set<string>()

    // Collect all entry paths (normalized)
    tree.forEach((entries) => {
      entries.forEach((e) => allPaths.add(e.path))
    })

    // Find entries that don't have their parent in allPaths (they are roots)
    tree.forEach((entries, parentPath) => {
      // Root conditions: Unix root '/', Windows drive root like 'C:/', or parent not in tree
      const isUnixRoot = parentPath === '/'
      const isWindowsDriveRoot = /^[A-Za-z]:\/$/.test(parentPath)
      const parentNotInTree = !allPaths.has(parentPath)

      if (isUnixRoot || isWindowsDriveRoot || parentNotInTree) {
        rootEntries.push(...entries)
      }
    })

    // Sort (folders first, then alphabetically)
    rootEntries.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1
      if (a.type !== 'dir' && b.type === 'dir') return 1
      return a.name.localeCompare(b.name)
    })

    return rootEntries
  }

  /**
   * Auto-expand directories that have only one child until reaching
   * a directory with multiple children
   */
  private computeAutoExpandPaths(
    tree: Map<string, ResticFileEntry[]>,
    rootEntries: ResticFileEntry[],
  ): Set<string> {
    const expanded = new Set<string>()

    const expandSingleChildPath = (entry: ResticFileEntry) => {
      if (entry.type !== 'dir') return

      const children = tree.get(entry.path) || []
      // Only auto-expand if there's exactly 1 child
      if (children.length === 1) {
        expanded.add(entry.path)
        // Continue expanding if the single child is also a directory
        expandSingleChildPath(children[0])
      } else if (children.length > 1) {
        // Stop here - user will manually expand further
        return
      }
    }

    // Start from each root entry
    for (const entry of rootEntries) {
      expandSingleChildPath(entry)
    }

    return expanded
  }

  render() {
    if (this.resticInstalled === null) {
      return html`
        <div class="content">
          <div class="header">
            <div>
              <h1>Nice2Have Restic UI</h1>
              <div class="subtitle">Checking restic installation...</div>
            </div>
          </div>
          <div class="tab-content">
            <div class="empty-state">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      `
    }

    if (!this.resticInstalled) {
      return html`
        <div class="content">
          <div class="header">
            <div>
              <h1>Nice2Have Restic UI</h1>
              <div class="subtitle">Time Machine-like backup management</div>
            </div>
          </div>
          <div class="tab-content">
            <div class="not-installed">
              <h2>Restic Not Installed</h2>
              <p>
                Restic backup tool is not installed on your system. Please
                install it to use this feature.
              </p>
              <p>
                <a href="https://restic.net" target="_blank">
                  Download restic from restic.net
                </a>
              </p>
            </div>
          </div>
        </div>
      `
    }

    return html`
      <div class="content">
        <div class="header">
          <div>
            <h1>Nice2Have Restic UI</h1>
            <div class="subtitle">Time Machine-like backup management</div>
          </div>
          ${this.resticVersion
            ? html`<span style="color: #64748b; font-size: 0.8rem"
                >${this.resticVersion}</span
              >`
            : ''}
        </div>

        ${this.message
          ? html`<div class="message ${this.message.type}">
              ${this.message.text}
            </div>`
          : ''}

        <div class="repo-config">
          ${this.savedConnections.length > 0
            ? html`
                <div
                  style="margin-bottom: 1rem; padding: 0.75rem; background: #0f172a; border-radius: 6px;"
                >
                  <div
                    style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;"
                  >
                    <span
                      style="color: #f59e0b; font-weight: 600; font-size: 0.85rem;"
                    >
                      Saved Connections
                    </span>
                    <div style="display: flex; gap: 0.5rem;">
                      <button
                        class="btn btn-small btn-secondary"
                        @click=${this.exportConnections}
                        title="Export connections to file"
                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                      >
                        Export
                      </button>
                      <button
                        class="btn btn-small btn-secondary"
                        @click=${this.importConnections}
                        title="Import connections from file"
                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${this.savedConnections.map(
                      (conn) => html`
                        <div
                          style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #1e293b; border-radius: 4px; cursor: pointer; border: 1px solid #334155;"
                          @click=${() => this.loadConnection(conn)}
                        >
                          <span style="color: #0ea5e9; font-weight: 600;"
                            >${conn.name}</span
                          >
                          <span style="color: #64748b; font-size: 0.8rem;"
                            >${conn.repoPath.length > 30
                              ? conn.repoPath.substring(0, 30) + '...'
                              : conn.repoPath}</span
                          >
                          <button
                            style="background: #dc2626; color: white; border: none; padding: 0.15rem 0.4rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
                            @click=${(e: Event) =>
                              this.deleteConnection(conn.name, e)}
                            title="Delete connection"
                          >
                            ×
                          </button>
                        </div>
                      `,
                    )}
                  </div>
                </div>
              `
            : html`
                <div style="margin-bottom: 0.5rem; text-align: right;">
                  <button
                    class="btn btn-small btn-secondary"
                    @click=${this.importConnections}
                    title="Import connections from file"
                    style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                  >
                    Import Connections
                  </button>
                </div>
              `}
          <div class="repo-form">
            <div class="form-group">
              <label>Repository Path</label>
              <input
                type="text"
                placeholder="/path/to/repo or s3:bucket/path"
                .value=${this.repoPath}
                @input=${(e: Event) =>
                  (this.repoPath = (e.target as HTMLInputElement).value)}
                ?disabled=${this.isLoading}
              />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Repository password"
                .value=${this.repoPassword}
                @input=${(e: Event) =>
                  (this.repoPassword = (e.target as HTMLInputElement).value)}
                ?disabled=${this.isLoading}
              />
            </div>
            <div style="display: flex; gap: 0.5rem">
              <button
                class="btn btn-primary"
                @click=${this.connectRepository}
                ?disabled=${this.isLoading}
              >
                ${this.isLoading
                  ? html`<span class="spinner"></span>`
                  : 'Connect'}
              </button>
              <button
                class="btn btn-secondary"
                @click=${this.initRepository}
                ?disabled=${this.isLoading}
              >
                Initialize
              </button>
            </div>
          </div>
          <div
            style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #334155;"
          >
            <input
              type="text"
              placeholder="Connection name..."
              style="flex: 1; padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #475569; border-radius: 4px; color: #e2e8f0; font-size: 0.85rem;"
              .value=${this.connectionName}
              @input=${(e: Event) =>
                (this.connectionName = (e.target as HTMLInputElement).value)}
              ?disabled=${this.isLoading}
            />
            <button
              class="btn btn-secondary"
              style="white-space: nowrap;"
              @click=${this.saveCurrentConnection}
              ?disabled=${this.isLoading ||
              !this.repoPath ||
              !this.repoPassword}
            >
              Save Connection
            </button>
          </div>
          ${this.repository
            ? html`
                <div class="repo-status">
                  <span class="status-dot connected"></span>
                  <span>Connected to ${this.repository.path}</span>
                  <span style="margin-left: auto; color: #64748b">
                    ${this.snapshots.length} snapshots
                    ${this.stats
                      ? html` | ${this.formatSize(this.stats.total_size)}`
                      : ''}
                  </span>
                </div>
              `
            : ''}
        </div>

        ${this.repository
          ? html`
              <div class="tabs">
                <div
                  class="tab ${this.activeTab === 'backup' ? 'active' : ''}"
                  @click=${() => (this.activeTab = 'backup')}
                >
                  Backup
                </div>
                <div
                  class="tab ${this.activeTab === 'browse' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'browse'
                    this.loadSnapshots()
                  }}
                >
                  Browse History
                </div>
                <div
                  class="tab ${this.activeTab === 'compare' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'compare'
                    this.loadSnapshots()
                  }}
                >
                  Compare
                </div>
                <div
                  class="tab ${this.activeTab === 'retention' ? 'active' : ''}"
                  @click=${() => (this.activeTab = 'retention')}
                >
                  Retention
                </div>
                <div
                  class="tab ${this.activeTab === 'health' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'health'
                    this.loadStats()
                  }}
                >
                  Health
                </div>
              </div>

              <div class="tab-content">
                ${this.activeTab === 'backup' ? this.renderBackupPanel() : ''}
                ${this.activeTab === 'browse' ? this.renderBrowsePanel() : ''}
                ${this.activeTab === 'compare' ? this.renderComparePanel() : ''}
                ${this.activeTab === 'retention'
                  ? this.renderRetentionPanel()
                  : ''}
                ${this.activeTab === 'health' ? this.renderHealthPanel() : ''}
              </div>
            `
          : html`
              <div class="tab-content">
                <div class="empty-state">
                  <div class="empty-state-icon">🔐</div>
                  <div>Enter repository path and password to connect</div>
                </div>
              </div>
            `}
      </div>
    `
  }

  private renderBackupPanel() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Paths section -->
        <div
          class="backup-paths"
          style="background: #0f172a; border-radius: 8px; padding: 1rem;"
        >
          <div class="path-list" style="margin-bottom: 0.75rem;">
            ${this.backupPaths.length === 0
              ? html`<div
                  style="color: #64748b; font-size: 0.9rem; padding: 1rem; text-align: center;"
                >
                  No folders selected. Add a folder to backup.
                </div>`
              : this.backupPaths.map(
                  (path) => html`
                    <div
                      class="path-item"
                      style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: #1e293b; border-radius: 4px; margin-bottom: 0.5rem;"
                    >
                      <span
                        style="font-family: monospace; font-size: 0.9rem; color: #e2e8f0;"
                        >${path}</span
                      >
                      <button
                        class="btn btn-small btn-danger"
                        @click=${() => this.removePath(path)}
                        style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                      >
                        ×
                      </button>
                    </div>
                  `,
                )}
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button
              class="btn btn-secondary"
              @click=${this.selectFolder}
              style="flex: 1;"
            >
              + Add Folder
            </button>
            <button
              class="btn btn-primary"
              @click=${this.startBackup}
              ?disabled=${this.backupPaths.length === 0 || this.isBackingUp}
              style="flex: 2; font-weight: 600;"
            >
              ${this.isBackingUp ? 'Backing up...' : 'Backup Now'}
            </button>
          </div>
        </div>

        <!-- Progress section (only shown when backing up) -->
        ${this.isBackingUp
          ? html`
              <div
                class="backup-progress"
                style="background: #0f172a; border-radius: 8px; padding: 1rem;"
              >
                <h3
                  style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #e2e8f0;"
                >
                  Backup in Progress
                </h3>
                <div class="progress-bar-container">
                  <div
                    class="progress-bar"
                    style="width: ${(this.backupProgress?.percentDone || 0) *
                    100}%"
                  ></div>
                  <div class="progress-bar-text">
                    ${Math.round(
                      (this.backupProgress?.percentDone || 0) * 100,
                    )}%
                  </div>
                </div>
                <div class="progress-details">
                  <span>
                    ${this.backupProgress?.filesDone || 0} /
                    ${this.backupProgress?.totalFiles || 0} files
                  </span>
                  <span>
                    ${this.formatSize(this.backupProgress?.bytesDone || 0)} /
                    ${this.formatSize(this.backupProgress?.totalBytes || 0)}
                  </span>
                </div>
                ${this.backupProgress?.currentFile
                  ? html`<div class="current-file">
                      ${this.backupProgress.currentFile}
                    </div>`
                  : ''}
              </div>
            `
          : ''}
      </div>
    `
  }

  private renderBrowsePanel() {
    const groups = this.groupSnapshots()

    return html`
      <div class="browse-panel">
        <div class="timeline">
          <h3>Snapshots</h3>
          ${groups.length === 0
            ? html`<div style="color: #64748b; font-size: 0.85rem">
                No snapshots yet
              </div>`
            : groups.map(
                (group) => html`
                  <div class="timeline-group">
                    <div class="timeline-group-label">${group.label}</div>
                    ${group.snapshots.map(
                      (snapshot) => html`
                        <div
                          class="timeline-item ${this.selectedSnapshot?.id ===
                          snapshot.id
                            ? 'selected'
                            : ''}"
                          @click=${() => this.selectSnapshot(snapshot)}
                        >
                          <div class="timeline-dot"></div>
                          <div class="timeline-info">
                            <div class="timeline-time">
                              ${this.formatTime(snapshot.time)}
                            </div>
                            <div class="timeline-paths">
                              ${snapshot.paths?.join(', ')}
                            </div>
                          </div>
                        </div>
                      `,
                    )}
                  </div>
                `,
              )}
        </div>

        <div class="file-browser">
          <h3>
            ${this.selectedSnapshot
              ? `Files in ${this.selectedSnapshot.short_id || this.selectedSnapshot.id}`
              : 'Select a snapshot'}
          </h3>

          ${this.selectedSnapshot
            ? html`
                <div class="tree-container">
                  ${this.isLoading
                    ? html`<div class="empty-state">
                        <span class="spinner"></span>
                      </div>`
                    : this.browseEntries.length === 0
                      ? html`<div class="empty-state">No files</div>`
                      : (() => {
                          const tree = this.buildFileTree(this.browseEntries)
                          const rootEntries = this.getRootEntries(tree)
                          return rootEntries.map((entry) =>
                            this.renderTreeNode(entry, tree, 0),
                          )
                        })()}
                </div>

                <div class="file-actions">
                  <button
                    class="btn btn-primary"
                    @click=${this.restoreSelected}
                  >
                    Restore All
                  </button>
                </div>
              `
            : html`
                <div class="empty-state">
                  <div class="empty-state-icon">📁</div>
                  <div>Select a snapshot to browse files</div>
                </div>
              `}
        </div>
      </div>
    `
  }

  private renderComparePanel() {
    return html`
      <div class="compare-panel">
        <div class="compare-selectors">
          <div class="compare-selector">
            <h4>Snapshot 1 (older)</h4>
            <select
              @change=${(e: Event) => {
                const id = (e.target as HTMLSelectElement).value
                this.compareSnapshot1 =
                  this.snapshots.find((s) => s.id === id) || null
                this.diffResult = null
              }}
            >
              <option value="">Select a snapshot...</option>
              ${this.snapshots.map(
                (s) => html`
                  <option
                    value=${s.id}
                    ?selected=${this.compareSnapshot1?.id === s.id}
                  >
                    ${s.short_id || s.id.substring(0, 8)} -
                    ${this.formatDate(s.time)}
                  </option>
                `,
              )}
            </select>
            ${this.compareSnapshot1
              ? html`
                  <div
                    style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem"
                  >
                    ${this.compareSnapshot1.paths?.join(', ')}
                  </div>
                `
              : ''}
          </div>

          <div class="compare-arrow">→</div>

          <div class="compare-selector">
            <h4>Snapshot 2 (newer)</h4>
            <select
              @change=${(e: Event) => {
                const id = (e.target as HTMLSelectElement).value
                this.compareSnapshot2 =
                  this.snapshots.find((s) => s.id === id) || null
                this.diffResult = null
              }}
            >
              <option value="">Select a snapshot...</option>
              ${this.snapshots.map(
                (s) => html`
                  <option
                    value=${s.id}
                    ?selected=${this.compareSnapshot2?.id === s.id}
                  >
                    ${s.short_id || s.id.substring(0, 8)} -
                    ${this.formatDate(s.time)}
                  </option>
                `,
              )}
            </select>
            ${this.compareSnapshot2
              ? html`
                  <div
                    style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem"
                  >
                    ${this.compareSnapshot2.paths?.join(', ')}
                  </div>
                `
              : ''}
          </div>
        </div>

        <div class="compare-actions">
          <button
            class="btn btn-primary"
            @click=${this.compareSnapshots}
            ?disabled=${!this.compareSnapshot1 ||
            !this.compareSnapshot2 ||
            this.isComparing}
            style="padding: 0.75rem 2rem"
          >
            ${this.isComparing ? html`<span class="spinner"></span>` : ''}
            Compare Snapshots
          </button>
        </div>

        ${this.diffResult
          ? html`
              <div class="compare-summary">
                <div class="summary-stat added">
                  <span class="count"
                    >${this.diffResult.summary.addedCount}</span
                  >
                  <span>Added</span>
                </div>
                <div class="summary-stat removed">
                  <span class="count"
                    >${this.diffResult.summary.removedCount}</span
                  >
                  <span>Removed</span>
                </div>
                <div class="summary-stat modified">
                  <span class="count"
                    >${this.diffResult.summary.modifiedCount}</span
                  >
                  <span>Modified</span>
                </div>
              </div>

              <div class="diff-results">
                <div class="diff-section added">
                  <h4>
                    Added
                    <span class="diff-count"
                      >${this.diffResult.summary.addedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.added.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files added
                        </div>`
                      : this.diffResult.added.map(
                          (path) => html`
                            <div class="diff-item added" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>

                <div class="diff-section removed">
                  <h4>
                    Removed
                    <span class="diff-count"
                      >${this.diffResult.summary.removedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.removed.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files removed
                        </div>`
                      : this.diffResult.removed.map(
                          (path) => html`
                            <div class="diff-item removed" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>

                <div class="diff-section modified">
                  <h4>
                    Modified
                    <span class="diff-count"
                      >${this.diffResult.summary.modifiedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.modified.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files modified
                        </div>`
                      : this.diffResult.modified.map(
                          (path) => html`
                            <div class="diff-item modified" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>
              </div>
            `
          : html`
              <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div>
                  Select two snapshots and click Compare to see the differences
                </div>
              </div>
            `}
      </div>
    `
  }

  private renderRetentionPanel() {
    return html`
      <div class="retention-panel">
        <div class="retention-config">
          <h3>Retention Policy</h3>
          <div class="retention-field">
            <label>Keep last</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepLast || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepLast: parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep daily</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepDaily || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepDaily:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep weekly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepWeekly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepWeekly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep monthly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepMonthly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepMonthly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep yearly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepYearly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepYearly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <button
            class="btn btn-danger"
            @click=${this.applyRetentionPolicy}
            ?disabled=${this.isLoading}
            style="margin-top: 1rem; width: 100%"
          >
            Apply Policy & Prune
          </button>
        </div>

        <div class="retention-preview">
          <h3>Current Snapshots</h3>
          <div style="font-size: 0.9rem; color: #94a3b8">
            Total: ${this.snapshots.length} snapshots
          </div>
          <div style="margin-top: 1rem; max-height: 300px; overflow-y: auto">
            ${this.snapshots.map(
              (s) => html`
                <div
                  style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #334155; font-size: 0.85rem"
                >
                  <span>${s.short_id || s.id.substring(0, 8)}</span>
                  <span style="color: #64748b">${this.formatDate(s.time)}</span>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    `
  }

  private renderHealthPanel() {
    return html`
      <div class="health-panel">
        <div class="health-card">
          <h3>Total Size</h3>
          <div class="health-value">
            ${this.stats ? this.formatSize(this.stats.total_size) : '-'}
          </div>
        </div>

        <div class="health-card">
          <h3>Total Files</h3>
          <div class="health-value">
            ${this.stats?.total_file_count?.toLocaleString() || '-'}
          </div>
        </div>

        <div class="health-card">
          <h3>Snapshots</h3>
          <div class="health-value">${this.snapshots.length}</div>
        </div>

        <div class="health-actions">
          <button
            class="btn btn-primary"
            @click=${this.runCheck}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading && this.loadingMessage.includes('Check')
              ? html`<span class="spinner"></span>`
              : ''}
            Check Repository
          </button>
          <button
            class="btn btn-secondary"
            @click=${this.runPrune}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading && this.loadingMessage.includes('Prune')
              ? html`<span class="spinner"></span>`
              : ''}
            Prune Unused Data
          </button>
          <button
            class="btn btn-secondary"
            @click=${this.runUnlock}
            ?disabled=${this.isLoading}
          >
            Unlock Repository
          </button>
          <button class="btn btn-secondary" @click=${this.loadStats}>
            Refresh Stats
          </button>
        </div>
      </div>
    `
  }
}
