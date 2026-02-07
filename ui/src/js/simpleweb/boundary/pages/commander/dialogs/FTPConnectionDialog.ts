import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('ftp-connection-dialog')
export class FTPConnectionDialog extends LitElement {
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

    .form-row {
      display: flex;
      gap: 1rem;
    }

    .form-row .form-group {
      flex: 1;
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

    .btn-secondary {
      background: #0ea5e9;
      color: #fff;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #0284c7;
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

    .status-success {
      background: #065f46;
      color: #d1fae5;
      border: 1px solid #10b981;
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
  `

  @property({ type: Boolean }) open = false
  @property({ type: String }) statusMessage = ''
  @property({ type: String }) statusType: 'success' | 'error' | 'info' | '' = ''
  @property({ type: Boolean }) testing = false
  @property({ type: Boolean }) connecting = false

  @state() private host = ''
  @state() private port = '21'
  @state() private user = ''
  @state() private password = ''
  @state() private secure = false
  @state() private saveName = ''
  @state() private rememberConnection = false
  @state() private savedConnections: Array<{
    name: string
    host: string
    port: string
    user: string
    password: string
    secure: boolean
  }> = []

  connectedCallback() {
    super.connectedCallback()
    this.loadSavedConnections()
  }

  private loadSavedConnections() {
    const saved = localStorage.getItem('ftp-connections')
    if (saved) {
      try {
        this.savedConnections = JSON.parse(saved)
      } catch (error) {
        console.error('Failed to load saved FTP connections:', error)
        this.savedConnections = []
      }
    }
  }

  private saveSavedConnections() {
    localStorage.setItem(
      'ftp-connections',
      JSON.stringify(this.savedConnections),
    )
  }

  private loadConnection(connection: (typeof this.savedConnections)[0]) {
    this.host = connection.host
    this.port = connection.port
    this.user = connection.user
    this.password = connection.password
    this.secure = connection.secure
    this.saveName = connection.name
    this.rememberConnection = true
  }

  private deleteConnection(name: string, event: Event) {
    event.stopPropagation()
    this.savedConnections = this.savedConnections.filter((c) => c.name !== name)
    this.saveSavedConnections()
    this.setStatus('Connection deleted', 'info')
  }

  private async testConnection() {
    if (!this.host) {
      this.setStatus('Please enter a host', 'error')
      return
    }

    this.testing = true
    this.setStatus('Testing connection...', 'info')

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'ftp',
        {
          operation: 'test-connection',
          host: this.host,
          port: parseInt(this.port, 10) || 21,
          user: this.user || 'anonymous',
          password: this.password || 'anonymous@',
          secure: this.secure,
        },
      )

      if (response.success && response.data?.success) {
        this.setStatus('Connection successful!', 'success')
      } else {
        this.setStatus(
          `Connection failed: ${response.data?.error || response.error || 'Unknown error'}`,
          'error',
        )
      }
    } catch (error: any) {
      this.setStatus(`Error: ${error.message}`, 'error')
    } finally {
      this.testing = false
    }
  }

  private async connect() {
    if (!this.host) {
      this.setStatus('Please enter a host', 'error')
      return
    }

    // Save connection if requested
    if (this.rememberConnection && this.saveName) {
      const existing = this.savedConnections.findIndex(
        (c) => c.name === this.saveName,
      )
      const connection = {
        name: this.saveName,
        host: this.host,
        port: this.port,
        user: this.user,
        password: this.password,
        secure: this.secure,
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

    // Build FTP URL (encode user and password to handle special characters)
    const encodedUser = encodeURIComponent(this.user || 'anonymous')
    const encodedPassword = encodeURIComponent(this.password || 'anonymous@')
    const ftpUrl = `ftp://${encodedUser}:${encodedPassword}@${this.host}:${parseInt(this.port, 10) || 21}/`

    // Dispatch connect event with FTP URL
    this.dispatchEvent(
      new CustomEvent('connect', {
        detail: ftpUrl,
        bubbles: true,
        composed: true,
      }),
    )
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  private setStatus(message: string, type: 'success' | 'error' | 'info') {
    this.statusMessage = message
    this.statusType = type

    if (type !== 'info') {
      setTimeout(() => {
        this.statusMessage = ''
        this.statusType = ''
      }, 3000)
    }
  }

  render() {
    if (!this.open) return null

    return html`
      <simple-dialog
        .open=${true}
        .title=${'FTP Connection'}
        .width=${'600px'}
        @dialog-close=${this.close}
      >
        <div class="form-container">
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
                            ${conn.user}@${conn.host}:${conn.port}
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
            <label class="form-label">Host *</label>
            <input
              type="text"
              class="form-input"
              placeholder="ftp.example.com"
              .value=${this.host}
              @input=${(e: Event) =>
                (this.host = (e.target as HTMLInputElement).value)}
              ?disabled=${this.testing || this.connecting}
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Port</label>
              <input
                type="number"
                class="form-input"
                placeholder="21"
                .value=${this.port}
                @input=${(e: Event) =>
                  (this.port = (e.target as HTMLInputElement).value)}
                ?disabled=${this.testing || this.connecting}
              />
            </div>

            <div class="form-group" style="flex: 0.5;">
              <label class="form-label">&nbsp;</label>
              <div class="checkbox-group">
                <input
                  type="checkbox"
                  class="checkbox"
                  .checked=${this.secure}
                  @change=${(e: Event) =>
                    (this.secure = (e.target as HTMLInputElement).checked)}
                  ?disabled=${this.testing || this.connecting}
                />
                <label class="form-label" style="margin: 0;"
                  >FTPS (Secure)</label
                >
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Username</label>
            <input
              type="text"
              class="form-input"
              placeholder="anonymous"
              .value=${this.user}
              @input=${(e: Event) =>
                (this.user = (e.target as HTMLInputElement).value)}
              ?disabled=${this.testing || this.connecting}
            />
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input
              type="password"
              class="form-input"
              placeholder="anonymous@"
              .value=${this.password}
              @input=${(e: Event) =>
                (this.password = (e.target as HTMLInputElement).value)}
              ?disabled=${this.testing || this.connecting}
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
              ?disabled=${this.testing || this.connecting}
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
                    placeholder="My FTP Server"
                    .value=${this.saveName}
                    @input=${(e: Event) =>
                      (this.saveName = (e.target as HTMLInputElement).value)}
                    ?disabled=${this.testing || this.connecting}
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
              class="btn btn-secondary"
              @click=${this.testConnection}
              ?disabled=${this.testing || this.connecting || !this.host}
            >
              ${this.testing ? '⏳ Testing...' : '🔍 Test Connection'}
            </button>
            <button
              class="btn btn-primary"
              @click=${this.connect}
              ?disabled=${this.testing || this.connecting || !this.host}
            >
              ${this.connecting ? '⏳ Connecting...' : '🔗 Connect'}
            </button>
            <button
              class="btn btn-cancel"
              @click=${this.close}
              ?disabled=${this.testing || this.connecting}
            >
              Cancel
            </button>
          </div>
        </div>
      </simple-dialog>
    `
  }
}
