import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { userPreferencesService } from './UserPreferencesService.js'
import type { UserPreferences } from './UserPreferencesService.js'

@customElement('nh-docmanager-preferences')
export class DocManagerPreferences extends LitElement {
  @state() private lastName = ''
  @state() private defaultScanDirectory = ''
  @state() private defaultResolution = '300'
  @state() private defaultFormat = 'pdf'
  @state() private includeLastNameInFilename = true
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
  `

  async connectedCallback() {
    super.connectedCallback()
    await this.loadPreferences()
  }

  private async loadPreferences() {
    await userPreferencesService.ensureLoaded()
    const prefs = userPreferencesService.getAll()
    this.lastName = prefs.lastName || ''
    this.defaultScanDirectory = prefs.defaultScanDirectory || ''
    this.defaultResolution = prefs.defaultResolution || '300'
    this.defaultFormat = prefs.defaultFormat || 'pdf'
    this.includeLastNameInFilename = prefs.includeLastNameInFilename !== false
  }

  private async handleSave() {
    this.saving = true
    this.message = ''

    const prefs: UserPreferences = {
      lastName: this.lastName,
      defaultScanDirectory: this.defaultScanDirectory,
      defaultResolution: this.defaultResolution,
      defaultFormat: this.defaultFormat,
      includeLastNameInFilename: this.includeLastNameInFilename,
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
              <label for="lastName">Your Last Name</label>
              <input
                type="text"
                id="lastName"
                .value="${this.lastName}"
                @input="${(e: any) => (this.lastName = e.target.value)}"
                placeholder="e.g., Smith, Müller, etc."
              />
              <small
                >Will be included in generated filenames (e.g.,
                company_account_date_Smith.pdf)</small
              >
            </div>

            <div class="checkbox-group">
              <input
                type="checkbox"
                id="includeLastName"
                .checked="${this.includeLastNameInFilename}"
                @change="${(e: any) =>
                  (this.includeLastNameInFilename = e.target.checked)}"
              />
              <label for="includeLastName"
                >Include last name in generated filenames</label
              >
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
