import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'
import '../navigation/ResponsiveMenu'

interface CommandParameter {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  required: boolean
  options?: string[]
  default?: any
}

interface CommandInfo {
  name: string
  description: string
  parameters: CommandParameter[]
}

interface CommandResult {
  success: boolean
  data?: any
  error?: string
  toolname?: string
  timestamp?: string
}

export class ReisebusLayout extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      color: #333;
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    h1 {
      color: #1e293b;
      margin-bottom: 0.5rem;
    }

    h2 {
      color: #475569;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }

    .commands-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .command-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      padding: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
      color: white;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .command-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
    }

    .command-name {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 0.5rem;
    }

    .command-description {
      font-size: 0.9rem;
      opacity: 0.9;
      line-height: 1.4;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #64748b;
    }

    /* Dialog Styles */
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
      z-index: 1000;
    }

    .dialog {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      min-width: 400px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .dialog-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }

    .dialog-description {
      color: #64748b;
      margin-bottom: 1.5rem;
      font-size: 0.9rem;
    }

    .no-params-message {
      padding: 1rem;
      background: #f1f5f9;
      border-radius: 8px;
      color: #64748b;
      text-align: center;
      margin-bottom: 1rem;
    }

    .param-input {
      margin-bottom: 1.25rem;
    }

    .param-input label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #475569;
    }

    .param-input label .required {
      color: #ef4444;
      margin-left: 0.25rem;
    }

    .param-description {
      font-size: 0.85rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .param-input input[type='text'],
    .param-input input[type='number'],
    .param-input select {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      font-family: inherit;
      transition: border-color 0.2s;
    }

    .param-input input[type='checkbox'] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .param-input input:focus,
    .param-input select:focus {
      outline: none;
      border-color: #667eea;
    }

    .param-input select {
      cursor: pointer;
      background: white;
    }

    .dialog-buttons {
      display: flex;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    button {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-execute {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-execute:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
    }

    .btn-execute:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: #e2e8f0;
      color: #475569;
    }

    .btn-cancel:hover {
      background: #cbd5e1;
    }

    /* Result Display */
    .result-container {
      margin-top: 2rem;
      background: #f8fafc;
      border-radius: 12px;
      padding: 1.5rem;
    }

    .result-title {
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: #1e293b;
    }

    .result-success {
      border-left: 4px solid #10b981;
    }

    .result-error {
      border-left: 4px solid #ef4444;
    }

    .result-content {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      overflow-x: auto;
      white-space: pre;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    .result-meta {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #64748b;
    }

    @media (max-width: 768px) {
      :host {
        padding: 1rem;
      }

      .commands-grid {
        grid-template-columns: 1fr;
      }

      .dialog {
        min-width: auto;
        width: 90%;
        padding: 1.5rem;
      }
    }
  `

  @property({ type: Array })
  commands: CommandInfo[] = []

  @property({ type: Boolean })
  loading = true

  @property({ type: Object })
  selectedCommand: CommandInfo | null = null

  @property({ type: Object })
  paramValues: Record<string, any> = {}

  @property({ type: Object })
  lastResult: CommandResult | null = null

  @property({ type: Boolean })
  executing = false

  async connectedCallback() {
    super.connectedCallback()
    await this.loadCommands()
  }

  async loadCommands() {
    try {
      this.loading = true
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-getCommands',
      )

      if (response.success) {
        // Get detailed command info with parameters
        const helpResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'help',
          null,
        )

        if (helpResponse.success && helpResponse.data.commandParameters) {
          this.commands = Object.entries(
            helpResponse.data.commandParameters,
          ).map(([name, info]: [string, any]) => ({
            name,
            description: info.description,
            parameters: info.parameters || [],
          }))
        } else {
          // Fallback to simple command list
          this.commands = Object.entries(response.data).map(([name, desc]) => ({
            name,
            description: desc as string,
            parameters: [],
          }))
        }
      }
    } catch (error) {
      console.error('Failed to load commands:', error)
    } finally {
      this.loading = false
    }
  }

  handleCommandClick(command: CommandInfo) {
    this.selectedCommand = command
    // Initialize parameter values with defaults
    this.paramValues = {}
    command.parameters.forEach((param) => {
      this.paramValues[param.name] = param.default ?? ''
    })
    this.lastResult = null
  }

  closeDialog() {
    this.selectedCommand = null
    this.paramValues = {}
  }

  updateParamValue(paramName: string, value: any) {
    this.paramValues = {
      ...this.paramValues,
      [paramName]: value,
    }
  }

  async executeCommand() {
    if (!this.selectedCommand) return

    try {
      this.executing = true

      // Build params object from values
      let params: any = null
      if (this.selectedCommand.parameters.length > 0) {
        params = {}
        this.selectedCommand.parameters.forEach((param) => {
          let value = this.paramValues[param.name]

          // Convert to correct type
          if (param.type === 'number') {
            value = parseFloat(value)
            if (isNaN(value)) {
              throw new Error(`${param.name} must be a valid number`)
            }
          } else if (param.type === 'boolean') {
            value = Boolean(value)
          }

          params[param.name] = value
        })
      }

      console.log('Calling', this.selectedCommand.name, 'using params', params)
      const result = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        this.selectedCommand.name,
        params,
      )

      this.lastResult = result
      this.selectedCommand = null
      this.paramValues = {}
    } catch (error: any) {
      this.lastResult = {
        success: false,
        error: error.message || 'Unknown error',
      }
    } finally {
      this.executing = false
    }
  }

  render() {
    return html`
      <h1>🚀 Backend CLI Interface</h1>
      <h2>Verfügbare Commands</h2>

      ${this.loading
        ? html`<div class="loading">Commands werden geladen...</div>`
        : html`
            <div class="commands-grid">
              ${this.commands.map(
                (cmd) => html`
                  <div
                    class="command-card"
                    @click=${() => this.handleCommandClick(cmd)}
                  >
                    <div class="command-name">${cmd.name}</div>
                    <div class="command-description">${cmd.description}</div>
                  </div>
                `,
              )}
            </div>
          `}
      ${this.selectedCommand ? this.renderDialog() : ''}
      ${this.lastResult ? this.renderResult() : ''}
    `
  }

  renderDialog() {
    if (!this.selectedCommand) return ''

    const hasParameters = this.selectedCommand.parameters.length > 0

    return html`
      <div class="dialog-overlay" @click=${this.closeDialog}>
        <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
          <div class="dialog-title">${this.selectedCommand.name}</div>
          <div class="dialog-description">
            ${this.selectedCommand.description}
          </div>

          ${!hasParameters
            ? html`
                <div class="no-params-message">
                  Dieser Command benötigt keine Parameter
                </div>
              `
            : html`
                ${this.selectedCommand.parameters.map(
                  (param) => html`
                    <div class="param-input">
                      <label>
                        ${param.name}
                        ${param.required
                          ? html`<span class="required">*</span>`
                          : ''}
                      </label>
                      <div class="param-description">${param.description}</div>
                      ${this.renderParameterInput(param)}
                    </div>
                  `,
                )}
              `}

          <div class="dialog-buttons">
            <button class="btn-cancel" @click=${this.closeDialog}>
              Abbrechen
            </button>
            <button
              class="btn-execute"
              @click=${this.executeCommand}
              ?disabled=${this.executing}
            >
              ${this.executing ? 'Wird ausgeführt...' : 'Ausführen'}
            </button>
          </div>
        </div>
      </div>
    `
  }

  renderParameterInput(param: CommandParameter) {
    const value = this.paramValues[param.name] ?? param.default ?? ''

    switch (param.type) {
      case 'select':
        return html`
          <select
            .value=${value}
            @change=${(e: Event) =>
              this.updateParamValue(
                param.name,
                (e.target as HTMLSelectElement).value,
              )}
          >
            ${param.options?.map(
              (option) => html`
                <option value=${option} ?selected=${option === value}>
                  ${option}
                </option>
              `,
            )}
          </select>
        `

      case 'number':
        return html`
          <input
            type="number"
            .value=${value.toString()}
            @input=${(e: Event) =>
              this.updateParamValue(
                param.name,
                (e.target as HTMLInputElement).value,
              )}
            placeholder=${param.default?.toString() || '0'}
          />
        `

      case 'boolean':
        return html`
          <input
            type="checkbox"
            .checked=${value}
            @change=${(e: Event) =>
              this.updateParamValue(
                param.name,
                (e.target as HTMLInputElement).checked,
              )}
          />
        `

      case 'string':
      default:
        return html`
          <input
            type="text"
            .value=${value}
            @input=${(e: Event) =>
              this.updateParamValue(
                param.name,
                (e.target as HTMLInputElement).value,
              )}
            placeholder=${param.default || ''}
          />
        `
    }
  }

  renderResult() {
    if (!this.lastResult) return ''

    const jsonString = JSON.stringify(this.lastResult, null, 2)

    return html`
      <div
        class="result-container ${this.lastResult.success
          ? 'result-success'
          : 'result-error'}"
      >
        <div class="result-title">
          ${this.lastResult.success ? '✅ Erfolg' : '❌ Fehler'}
        </div>
        <div class="result-content">${jsonString}</div>
        ${this.lastResult.timestamp
          ? html`
              <div class="result-meta">
                Timestamp: ${this.lastResult.timestamp}
              </div>
            `
          : ''}
      </div>
    `
  }
}

customElements.define('simple-start', ReisebusLayout)
