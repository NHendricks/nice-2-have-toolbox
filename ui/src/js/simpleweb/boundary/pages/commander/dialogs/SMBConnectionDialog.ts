import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('smb-connection-dialog')
export class SMBConnectionDialog extends LitElement {
  static styles = css`
    .form-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      min-width: 400px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-label {
      font-weight: bold;
      color: #e2e8f0;
      font-size: 0.9rem;
    }

    .form-input {
      padding: 0.75rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.9rem;
    }

    .form-input:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .form-input:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .checkbox {
      width: 1.2rem;
      height: 1.2rem;
      cursor: pointer;
    }

    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .btn {
      flex: 1;
      padding: 0.75rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 0.9rem;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #059669;
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #047857;
    }

    .btn-cancel {
      background: #475569;
      color: #fff;
    }

    .btn-cancel:hover {
      background: #64748b;
    }

    .status-message {
      padding: 0.75rem;
      border-radius: 4px;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .status-error {
      background: #7f1d1d;
      color: #fecaca;
      border: 1px solid #ef4444;
    }

    .status-info {
      background: #1e3a8a;
      color: #dbeafe;
      border: 1px solid #3b82f6;
    }

    .saved-connections {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 4px;
      max-height: 200px;
      overflow-y: auto;
    }

    .saved-connection-item {
      padding: 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      margin-bottom: 0.5rem;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .saved-connection-item:hover {
      background: #334155;
    }

    .connection-info {
      flex: 1;
    }

    .connection-name {
      font-weight: bold;
      color: #0ea5e9;
    }

    .connection-details {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .btn-delete {
      background: #dc2626;
      color: white;
      border: none;
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8rem;
    }

    .btn-delete:hover {
      background: #b91c1c;
    }

    .info-box {
      background: #1e3a8a;
      color: #dbeafe;
      padding: 0.75rem;
      border-radius: 4px;
      border: 1px solid #3b82f6;
      font-size: 0.85rem;
      margin-bottom: 1rem;
    }
  `

  @property({ type: Boolean }) open = false
  @property({ type: String }) initialPath = ''
  @property({ type: String }) statusMessage = ''
  @property({ type: String }) statusType: 'error' | 'info' | '' = ''
  @property({ type: Boolean }) connecting = false

  @state() private server = ''
  @state() private share = ''
  @state() private subPath = '' // Subfolder path after \\server\share\subfolder
  @state() private username = ''
  @state() private password = ''
  @state() private domain = ''
  @state() private saveName = ''
  @state() private rememberConnection = false
  @state() private savedConnections: Array<{
    name: string
    server: string
    share: string
    username: string
    password: string
    domain: string
  }> = []

  connectedCallback() {
    super.connectedCallback()
    this.loadSavedConnections()

    // Parse initial path if provided (e.g., \\nas\backup or smb://nas/backup)
    if (this.initialPath) {
      this.parseInitialPath(this.initialPath)
    }
  }

  private parseInitialPath(path: string) {
    // Handle UNC paths: \\server\share or //server/share
    let cleanPath = path
      .replace(/^\\\\/, '')
      .replace(/^\/\//, '')
      .replace(/\\/g, '/')

    // Handle smb:// URLs
    if (path.startsWith('smb://')) {
      cleanPath = path.substring(6) // Remove 'smb://'
    }

    const parts = cleanPath.split('/').filter((p) => p)
    if (parts.length >= 2) {
      this.server = parts[0]
      this.share = parts[1]
      // Store subfolder path if present (e.g., \\server\share\folder\subfolder)
      if (parts.length > 2) {
        this.subPath = parts.slice(2).join('/')
      }
    }
  }

  private loadSavedConnections() {
    const saved = localStorage.getItem('smb-connections')
    if (saved) {
      try {
        this.savedConnections = JSON.parse(saved)
      } catch (error) {
        console.error('Failed to load saved SMB connections:', error)
        this.savedConnections = []
      }
    }
  }

  private saveSavedConnections() {
    localStorage.setItem(
      'smb-connections',
      JSON.stringify(this.savedConnections),
    )
  }

  private loadConnection(connection: (typeof this.savedConnections)[0]) {
    this.server = connection.server
    this.share = connection.share
    this.username = connection.username
    this.password = connection.password
    this.domain = connection.domain
    this.saveName = connection.name
    this.rememberConnection = true
  }

  private deleteConnection(name: string, event: Event) {
    event.stopPropagation()
    this.savedConnections = this.savedConnections.filter((c) => c.name !== name)
    this.saveSavedConnections()
    this.setStatus('Connection deleted', 'info')
  }

  private async connect() {
    if (!this.server || !this.share) {
      this.setStatus('Please enter server and share name', 'error')
      return
    }

    if (!this.username || !this.password) {
      this.setStatus('Please enter username and password', 'error')
      return
    }

    // Save connection if requested
    if (this.rememberConnection && this.saveName) {
      const existing = this.savedConnections.findIndex(
        (c) => c.name === this.saveName,
      )
      const connection = {
        name: this.saveName,
        server: this.server,
        share: this.share,
        username: this.username,
        password: this.password,
        domain: this.domain,
      }

      if (existing >= 0) {
        this.savedConnections[existing] = connection
      } else {
        this.savedConnections.push(connection)
      }

      this.saveSavedConnections()
    }

    this.connecting = true
    this.setStatus('Connecting...', 'info')

    // Build SMB URL with credentials
    // Format: smb://[domain;]username:password@server/share
    const encodedUser = encodeURIComponent(this.username)
    const encodedPassword = encodeURIComponent(this.password)
    const userPart = this.domain
      ? `${encodeURIComponent(this.domain)};${encodedUser}`
      : encodedUser

    const smbUrl = `smb://${userPart}:${encodedPassword}@${this.server}/${this.share}`

    // Build full UNC path including subfolder if present
    let uncPath = `\\\\${this.server}\\${this.share}`
    if (this.subPath) {
      uncPath += `\\${this.subPath.replace(/\//g, '\\')}`
    }

    // Dispatch connect event with SMB URL
    this.dispatchEvent(
      new CustomEvent('connect', {
        detail: { smbUrl, uncPath },
        bubbles: true,
        composed: true,
      }),
    )
  }

  private cancelConnection() {
    this.connecting = false
    this.setStatus('Connection cancelled', 'info')
    this.dispatchEvent(new CustomEvent('cancel-connection'))
  }

  // Called by parent when connection succeeds
  connectionSuccess() {
    this.connecting = false
    this.close()
  }

  // Called by parent when connection fails
  connectionFailed(error: string) {
    this.connecting = false
    this.setStatus(`Connection failed: ${error}`, 'error')
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  private setStatus(message: string, type: 'error' | 'info') {
    this.statusMessage = message
    this.statusType = type

    if (type !== 'info') {
      setTimeout(() => {
        this.statusMessage = ''
        this.statusType = ''
      }, 5000)
    }
  }

  render() {
    if (!this.open) return null

    return html`
      <simple-dialog
        .open=${true}
        .title=${'SMB/CIFS Network Share Connection'}
        .width=${'600px'}
        @dialog-close=${this.close}
      >
        <div class="form-container">
          <div class="info-box">
            🔐 Credentials required to mount SMB shares. Enter your network
            credentials below.
          </div>

          ${this.savedConnections.length > 0
            ? html`
                <div class="saved-connections">
                  <div
                    style="margin-bottom: 0.5rem; color: #fbbf24; font-weight: bold;"
                  >
                    💾 Saved Connections
                  </div>
                  ${this.savedConnections.map(
                    (conn) => html`
                      <div
                        class="saved-connection-item"
                        @click=${() => this.loadConnection(conn)}
                      >
                        <div class="connection-info">
                          <div class="connection-name">${conn.name}</div>
                          <div class="connection-details">
                            \\\\${conn.server}\\${conn.share}
                            (${conn.domain
                              ? conn.domain + '\\'
                              : ''}${conn.username})
                          </div>
                        </div>
                        <button
                          class="btn-delete"
                          @click=${(e: Event) =>
                            this.deleteConnection(conn.name, e)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    `,
                  )}
                </div>
              `
            : ''}

          <div class="form-group">
            <label class="form-label">Server *</label>
            <input
              type="text"
              class="form-input"
              placeholder="nas or 192.168.1.100"
              .value=${this.server}
              @input=${(e: Event) =>
                (this.server = (e.target as HTMLInputElement).value)}
              ?disabled=${this.connecting}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Share Name *</label>
            <input
              type="text"
              class="form-input"
              placeholder="backup"
              .value=${this.share}
              @input=${(e: Event) =>
                (this.share = (e.target as HTMLInputElement).value)}
              ?disabled=${this.connecting}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Username *</label>
            <input
              type="text"
              class="form-input"
              placeholder="username"
              .value=${this.username}
              @input=${(e: Event) =>
                (this.username = (e.target as HTMLInputElement).value)}
              ?disabled=${this.connecting}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password *</label>
            <input
              type="password"
              class="form-input"
              placeholder="password"
              .value=${this.password}
              @input=${(e: Event) =>
                (this.password = (e.target as HTMLInputElement).value)}
              ?disabled=${this.connecting}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Domain (optional)</label>
            <input
              type="text"
              class="form-input"
              placeholder="WORKGROUP"
              .value=${this.domain}
              @input=${(e: Event) =>
                (this.domain = (e.target as HTMLInputElement).value)}
              ?disabled=${this.connecting}
            />
          </div>

          <div class="checkbox-group">
            <input
              type="checkbox"
              class="checkbox"
              .checked=${this.rememberConnection}
              @change=${(e: Event) =>
                (this.rememberConnection = (
                  e.target as HTMLInputElement
                ).checked)}
              ?disabled=${this.connecting}
            />
            <label class="form-label" style="margin: 0;"
              >Remember this connection</label
            >
          </div>

          ${this.rememberConnection
            ? html`
                <div class="form-group">
                  <label class="form-label">Connection Name</label>
                  <input
                    type="text"
                    class="form-input"
                    placeholder="My NAS"
                    .value=${this.saveName}
                    @input=${(e: Event) =>
                      (this.saveName = (e.target as HTMLInputElement).value)}
                    ?disabled=${this.connecting}
                  />
                </div>
              `
            : ''}
          ${this.statusMessage
            ? html`
                <div class="status-message status-${this.statusType}">
                  ${this.statusMessage}
                </div>
              `
            : ''}

          <div class="button-group">
            <button
              class="btn btn-primary"
              @click=${this.connect}
              ?disabled=${this.connecting ||
              !this.server ||
              !this.share ||
              !this.username ||
              !this.password}
            >
              ${this.connecting ? '⏳ Connecting...' : '🔗 Connect'}
            </button>
            <button
              class="btn btn-cancel"
              @click=${this.connecting ? this.cancelConnection : this.close}
            >
              ${this.connecting ? '⛔ Cancel Connection' : 'Cancel'}
            </button>
          </div>
        </div>
      </simple-dialog>
    `
  }
}
