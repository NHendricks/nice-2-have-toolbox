import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('nh-json-formatter')
export class JSONFormatter extends LitElement {
  @state() private inputText = ''
  @state() private outputText = ''
  @state() private errorMessage = ''
  @state() private successMessage = ''

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #eaeaea;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      overflow: hidden;
    }

    .container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 1rem;
      gap: 1rem;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .title {
      font-size: 1.5rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .toolbar {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      background: rgba(59, 130, 246, 0.8);
      border: none;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.9rem;
    }

    .btn:hover {
      background: rgba(59, 130, 246, 1);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: rgba(107, 114, 128, 0.6);
    }

    .btn-secondary:hover {
      background: rgba(107, 114, 128, 0.8);
      box-shadow: 0 4px 12px rgba(107, 114, 128, 0.4);
    }

    .btn-success {
      background: rgba(34, 197, 94, 0.8);
    }

    .btn-success:hover {
      background: rgba(34, 197, 94, 1);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    }

    .btn-danger {
      background: rgba(239, 68, 68, 0.8);
    }

    .btn-danger:hover {
      background: rgba(239, 68, 68, 1);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .editor-container {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      min-height: 0;
    }

    .editor-panel {
      display: flex;
      flex-direction: column;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      overflow: hidden;
      backdrop-filter: blur(10px);
    }

    .editor-header {
      padding: 0.75rem 1rem;
      background: rgba(255, 255, 255, 0.08);
      font-weight: 600;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .editor-actions {
      display: flex;
      gap: 0.5rem;
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: #eaeaea;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 1rem;
    }

    .icon-btn:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    textarea {
      flex: 1;
      background: rgba(0, 0, 0, 0.3);
      border: none;
      color: #eaeaea;
      padding: 1rem;
      font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
      font-size: 0.9rem;
      resize: none;
      outline: none;
      line-height: 1.5;
    }

    textarea::placeholder {
      color: rgba(234, 234, 234, 0.4);
    }

    .message {
      padding: 0.75rem 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .error {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #fca5a5;
    }

    .success {
      background: rgba(34, 197, 94, 0.2);
      border: 1px solid rgba(34, 197, 94, 0.4);
      color: #86efac;
    }

    .stats {
      display: flex;
      gap: 1.5rem;
      font-size: 0.85rem;
      color: rgba(234, 234, 234, 0.7);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    @media (max-width: 768px) {
      .editor-container {
        grid-template-columns: 1fr;
        grid-template-rows: 1fr 1fr;
      }

      .toolbar {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `

  private formatJSON() {
    this.clearMessages()
    try {
      const parsed = JSON.parse(this.inputText)
      this.outputText = JSON.stringify(parsed, null, 2)
      this.successMessage = '✓ JSON formatted successfully!'
      setTimeout(() => (this.successMessage = ''), 3000)
    } catch (error) {
      this.errorMessage = `✗ Invalid JSON: ${(error as Error).message}`
      this.outputText = ''
    }
  }

  private minifyJSON() {
    this.clearMessages()
    try {
      const parsed = JSON.parse(this.inputText)
      this.outputText = JSON.stringify(parsed)
      this.successMessage = '✓ JSON minified successfully!'
      setTimeout(() => (this.successMessage = ''), 3000)
    } catch (error) {
      this.errorMessage = `✗ Invalid JSON: ${(error as Error).message}`
      this.outputText = ''
    }
  }

  private validateJSON() {
    this.clearMessages()
    try {
      JSON.parse(this.inputText)
      this.successMessage = '✓ Valid JSON!'
      setTimeout(() => (this.successMessage = ''), 3000)
    } catch (error) {
      this.errorMessage = `✗ Invalid JSON: ${(error as Error).message}`
    }
  }

  private clearInput() {
    this.inputText = ''
    this.outputText = ''
    this.clearMessages()
  }

  private clearOutput() {
    this.outputText = ''
    this.clearMessages()
  }

  private copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      this.successMessage = '✓ Copied to clipboard!'
      setTimeout(() => (this.successMessage = ''), 2000)
    })
  }

  private clearMessages() {
    this.errorMessage = ''
    this.successMessage = ''
  }

  private handleInputChange(e: Event) {
    this.inputText = (e.target as HTMLTextAreaElement).value
    this.clearMessages()
  }

  private getStats(text: string) {
    if (!text) return { chars: 0, lines: 0, size: '0 B' }
    
    const chars = text.length
    const lines = text.split('\n').length
    const bytes = new Blob([text]).size
    
    let size = `${bytes} B`
    if (bytes > 1024) {
      size = `${(bytes / 1024).toFixed(2)} KB`
    }
    if (bytes > 1024 * 1024) {
      size = `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    }
    
    return { chars, lines, size }
  }

  render() {
    const inputStats = this.getStats(this.inputText)
    const outputStats = this.getStats(this.outputText)

    return html`
      <div class="container">
        <div class="header">
          <div class="title">
            <span>📝</span>
            <span>JSON Formatter</span>
          </div>
          <div class="toolbar">
            <button class="btn btn-success" @click=${this.formatJSON}>
              Format
            </button>
            <button class="btn btn-secondary" @click=${this.minifyJSON}>
              Minify
            </button>
            <button class="btn" @click=${this.validateJSON}>
              Validate
            </button>
            <button class="btn btn-danger" @click=${this.clearInput}>
              Clear All
            </button>
          </div>
        </div>

        ${this.errorMessage
          ? html`<div class="message error">${this.errorMessage}</div>`
          : ''}
        ${this.successMessage
          ? html`<div class="message success">${this.successMessage}</div>`
          : ''}

        <div class="editor-container">
          <div class="editor-panel">
            <div class="editor-header">
              <span>Input</span>
              <div class="editor-actions">
                <button
                  class="icon-btn"
                  @click=${() => this.copyToClipboard(this.inputText)}
                  title="Copy"
                  ?disabled=${!this.inputText}
                >
                  📋
                </button>
              </div>
            </div>
            <textarea
              placeholder="Paste your JSON here..."
              .value=${this.inputText}
              @input=${this.handleInputChange}
              spellcheck="false"
            ></textarea>
            <div class="editor-header">
              <div class="stats">
                <span class="stat-item">📊 ${inputStats.chars} chars</span>
                <span class="stat-item">📄 ${inputStats.lines} lines</span>
                <span class="stat-item">💾 ${inputStats.size}</span>
              </div>
            </div>
          </div>

          <div class="editor-panel">
            <div class="editor-header">
              <span>Output</span>
              <div class="editor-actions">
                <button
                  class="icon-btn"
                  @click=${() => this.copyToClipboard(this.outputText)}
                  title="Copy"
                  ?disabled=${!this.outputText}
                >
                  📋
                </button>
                <button
                  class="icon-btn"
                  @click=${this.clearOutput}
                  title="Clear"
                  ?disabled=${!this.outputText}
                >
                  🗑️
                </button>
              </div>
            </div>
            <textarea
              placeholder="Formatted JSON will appear here..."
              .value=${this.outputText}
              readonly
              spellcheck="false"
            ></textarea>
            <div class="editor-header">
              <div class="stats">
                <span class="stat-item">📊 ${outputStats.chars} chars</span>
                <span class="stat-item">📄 ${outputStats.lines} lines</span>
                <span class="stat-item">💾 ${outputStats.size}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nh-json-formatter': JSONFormatter
  }
}
