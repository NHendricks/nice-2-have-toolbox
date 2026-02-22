import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { UserPreferences } from './UserPreferencesService.js'
import { userPreferencesService } from './UserPreferencesService.js'

@customElement('nh-docmanager-preferences')
export class DocManagerPreferences extends LitElement {
  @state() private defaultScanDirectory = ''
  @state() private defaultResolution = '300'
  @state() private defaultFormat = 'pdf'
  @state() private autoSetFileName = false
  @state() private senders: string[] = []
  @state() private newSender = ''
  @state() private accountNumbers: string[] = []
  @state() private newAccountNumber = ''
  @state() private fullNames: string[] = []
  @state() private newFullName = ''
  @state() private saving = false
  @state() private message = ''

  static styles = css`
    :host {
      display: block;
    }

    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .dialog {
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 90vh;
      overflow: auto;
    }

    .dialog-header {
      padding: 20px 24px;
      border-bottom: 2px solid #e0e0e0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px 8px 0 0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 1.5em;
    }

    .dialog-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 2px solid #ddd;
      border-radius: 4px;
      font-size: 1em;
      box-sizing: border-box;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #667eea;
    }

    .form-group small {
      display: block;
      margin-top: 6px;
      color: #666;
      font-size: 0.9em;
    }

    .checkbox-group {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }

    .checkbox-group input[type='checkbox'] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .checkbox-group label {
      margin: 0;
      cursor: pointer;
      font-weight: normal;
    }

    .message {
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .message.success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }

    .message.error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }

    .message.info {
      background: #d1ecf1;
      color: #0c5460;
      border: 1px solid #bee5eb;
    }

    .dialog-footer {
      padding: 16px 24px;
      border-top: 2px solid #e0e0e0;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      background: #f8f9fa;
      border-radius: 0 0 8px 8px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      font-size: 1em;
      cursor: pointer;
      transition: all 0.2s;
    }

    button.primary {
      background: #667eea;
      color: white;
    }

    button.primary:hover {
      background: #5568d3;
    }

    button.secondary {
      background: #6c757d;
      color: white;
    }

    button.secondary:hover {
      background: #5a6268;
    }

    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .hint-box {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      padding: 12px;
      margin-bottom: 20px;
    }

    .hint-box p {
      margin: 0;
      color: #856404;
      font-size: 0.95em;
    }

    .sender-list {
      margin-top: 10px;
      border: 2px solid #ddd;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }

    .sender-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }

    .sender-item:last-child {
      border-bottom: none;
    }

    .sender-item button {
      padding: 4px 8px;
      font-size: 0.85em;
      background: #dc3545;
      color: white;
    }

    .sender-item button:hover {
      background: #c82333;
    }

    .add-sender-group {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .add-sender-group input {
      flex: 1;
    }

    .add-sender-group button {
      padding: 10px 16px;
      background: #28a745;
      color: white;
    }

    .add-sender-group button:hover {
      background: #218838;
    }

    .empty-senders {
      padding: 12px;
      text-align: center;
      color: #999;
      font-style: italic;
    }
  `

  async connectedCallback() {
    super.connectedCallback()
    this.message = '' // Clear any previous messages when dialog opens
    await this.loadPreferences()
  }

  private async loadPreferences() {
    await userPreferencesService.ensureLoaded()
    const prefs = userPreferencesService.getAll()
    console.log(
      '[DocManagerPreferences] Loading preferences into dialog:',
      prefs,
    )
    this.defaultScanDirectory = prefs.defaultScanDirectory || ''
    this.defaultResolution = prefs.defaultResolution || '300'
    this.defaultFormat = prefs.defaultFormat || 'pdf'
    this.autoSetFileName = prefs.autoSetFileName || false
    this.senders = prefs.senders || []
    this.accountNumbers = prefs.accountNumbers || []
    this.fullNames = prefs.fullNames || []
  }

  private async handleSave() {
    this.saving = true
    this.message = ''

    const prefs: UserPreferences = {
      defaultScanDirectory: this.defaultScanDirectory,
      defaultResolution: this.defaultResolution,
      defaultFormat: this.defaultFormat,
      autoSetFileName: this.autoSetFileName,
      senders: this.senders,
      accountNumbers: this.accountNumbers,
      fullNames: this.fullNames,
    }

    const success = await userPreferencesService.save(prefs)

    if (success) {
      this.message = '✅ Preferences saved successfully!'
      setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent('close', { detail: { saved: true } }),
        )
      }, 1000)
    } else {
      this.message = '❌ Failed to save preferences'
    }

    this.saving = false
  }

  private handleClose() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  private addSender() {
    const trimmed = this.newSender.trim()
    if (trimmed && !this.senders.includes(trimmed)) {
      this.senders = [...this.senders, trimmed]
      this.newSender = ''
    }
  }

  private removeSender(sender: string) {
    this.senders = this.senders.filter((s) => s !== sender)
  }

  private addAccountNumber() {
    const trimmed = this.newAccountNumber.trim()
    if (trimmed && !this.accountNumbers.includes(trimmed)) {
      this.accountNumbers = [...this.accountNumbers, trimmed]
      this.newAccountNumber = ''
    }
  }

  private removeAccountNumber(accountNumber: string) {
    this.accountNumbers = this.accountNumbers.filter((a) => a !== accountNumber)
  }

  private addFullName() {
    const trimmed = this.newFullName.trim()
    if (trimmed && !this.fullNames.includes(trimmed)) {
      this.fullNames = [...this.fullNames, trimmed]
      this.newFullName = ''
    }
  }

  private removeFullName(fullName: string) {
    this.fullNames = this.fullNames.filter((f) => f !== fullName)
  }

  render() {
    return html`
      <div
        class="dialog-overlay"
        @click="${(e: Event) => {
          if (e.target === e.currentTarget) this.handleClose()
        }}"
      >
        <div class="dialog">
          <div class="dialog-header">
            <h2>⚙️ DocManager Preferences</h2>
          </div>

          <div class="dialog-body">
            ${this.message
              ? html`
                  <div
                    class="message ${this.message.includes('✅')
                      ? 'success'
                      : 'error'}"
                  >
                    ${this.message}
                  </div>
                `
              : ''}

            <div class="hint-box">
              <p>
                💾 Preferences are saved to
                <strong>~/n2htoolbox/user-preferences.json</strong>
              </p>
            </div>

            <div class="form-group">
              <label>Fixed Full Names</label>
              <small
                >Define full names to match in OCR text. These will appear in
                the full name dropdown when found.</small
              >
              ${this.fullNames.length > 0
                ? html`
                    <div class="sender-list">
                      ${this.fullNames.map(
                        (fullName) => html`
                          <div class="sender-item">
                            <span>${fullName}</span>
                            <button
                              @click="${() => this.removeFullName(fullName)}"
                            >
                              Remove
                            </button>
                          </div>
                        `,
                      )}
                    </div>
                  `
                : html`
                    <div class="sender-list">
                      <div class="empty-senders">No full names defined yet</div>
                    </div>
                  `}
              <div class="add-sender-group">
                <input
                  type="text"
                  placeholder="e.g., John Smith, Jane Doe"
                  .value="${this.newFullName}"
                  @input="${(e: any) => (this.newFullName = e.target.value)}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      this.addFullName()
                    }
                  }}"
                />
                <button @click="${this.addFullName}">Add</button>
              </div>
            </div>

            <div class="form-group">
              <label for="defaultScanDirectory">Default Scan Directory</label>
              <input
                type="text"
                id="defaultScanDirectory"
                .value="${this.defaultScanDirectory}"
                @input="${(e: any) =>
                  (this.defaultScanDirectory = e.target.value)}"
                placeholder="Leave empty for system default (Documents/Scans)"
              />
              <small
                >The default directory where scanned documents are saved</small
              >
            </div>

            <div class="form-group">
              <label for="defaultResolution">Default Resolution (DPI)</label>
              <select
                id="defaultResolution"
                .value="${this.defaultResolution}"
                @change="${(e: any) =>
                  (this.defaultResolution = e.target.value)}"
              >
                <option value="150">150 DPI</option>
                <option value="300">300 DPI</option>
                <option value="600">600 DPI</option>
              </select>
            </div>

            <div class="form-group">
              <label for="defaultFormat">Default Format</label>
              <select
                id="defaultFormat"
                .value="${this.defaultFormat}"
                @change="${(e: any) => (this.defaultFormat = e.target.value)}"
              >
                <option value="pdf">PDF</option>
                <option value="png">PNG</option>
                <option value="jpg">JPG</option>
              </select>
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="autoSetFileName"
                .checked="${this.autoSetFileName}"
                @change="${(e: any) =>
                  (this.autoSetFileName = e.target.checked)}"
              />
              <label for="autoSetFileName"
                >Enable OCR scan for first page</label
              >
            </div>

            <div class="form-group">
              <label>Fixed Sender Strings</label>
              <small
                >Define sender names to match in OCR text. These will appear in
                the company dropdown when found.</small
              >
              ${this.senders.length > 0
                ? html`
                    <div class="sender-list">
                      ${this.senders.map(
                        (sender) => html`
                          <div class="sender-item">
                            <span>${sender}</span>
                            <button @click="${() => this.removeSender(sender)}">
                              Remove
                            </button>
                          </div>
                        `,
                      )}
                    </div>
                  `
                : html`
                    <div class="sender-list">
                      <div class="empty-senders">No senders defined yet</div>
                    </div>
                  `}
              <div class="add-sender-group">
                <input
                  type="text"
                  placeholder="e.g., RUNDV, Allianz, Stadtwerke"
                  .value="${this.newSender}"
                  @input="${(e: any) => (this.newSender = e.target.value)}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      this.addSender()
                    }
                  }}"
                />
                <button @click="${this.addSender}">Add</button>
              </div>
            </div>

            <div class="form-group">
              <label>Fixed Account Numbers / Topics</label>
              <small
                >Define account numbers or topics to match in OCR text (can
                include spaces). These will appear in the account dropdown when
                found.</small
              >
              ${this.accountNumbers.length > 0
                ? html`
                    <div class="sender-list">
                      ${this.accountNumbers.map(
                        (accountNumber) => html`
                          <div class="sender-item">
                            <span>${accountNumber}</span>
                            <button
                              @click="${() =>
                                this.removeAccountNumber(accountNumber)}"
                            >
                              Remove
                            </button>
                          </div>
                        `,
                      )}
                    </div>
                  `
                : html`
                    <div class="sender-list">
                      <div class="empty-senders">
                        No account numbers defined yet
                      </div>
                    </div>
                  `}
              <div class="add-sender-group">
                <input
                  type="text"
                  placeholder="e.g., 123456789, LU/0055807416/75"
                  .value="${this.newAccountNumber}"
                  @input="${(e: any) =>
                    (this.newAccountNumber = e.target.value)}"
                  @keydown="${(e: KeyboardEvent) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      this.addAccountNumber()
                    }
                  }}"
                />
                <button @click="${this.addAccountNumber}">Add</button>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="secondary" @click="${this.handleClose}">
              Cancel
            </button>
            <button
              class="primary"
              @click="${this.handleSave}"
              ?disabled="${this.saving}"
            >
              ${this.saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nh-docmanager-preferences': DocManagerPreferences
  }
}
