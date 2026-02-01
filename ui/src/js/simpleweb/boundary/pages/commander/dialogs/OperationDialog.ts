import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('operation-dialog')
export class OperationDialog extends LitElement {
  static styles = css`
    .input-field {
      margin: 1rem;
    }
    .input-field label {
      display: block;
      margin-bottom: 0.5rem;
      color: #cbd5e1;
    }
    .input-field input {
      width: 100%;
      padding: 0.75rem;
      background: #0f172a;
      border: 2px solid #475569;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 1rem;
      border-radius: 4px;
      box-sizing: border-box;
    }
    .input-field input:focus {
      outline: none;
      border-color: #0ea5e9;
    }
    .dialog-buttons {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      justify-content: flex-end;
    }
    .btn-confirm {
      background: #059669;
      color: #fff;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .btn-cancel {
      background: #475569;
      color: #fff;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
    }
    .progress-box {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 2px solid #0ea5e9;
    }
    .progress-bar {
      width: 100%;
      height: 24px;
      background: #0f172a;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 0.75rem;
    }
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #0ea5e9, #06b6d4);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 0.75rem;
    }
  `

  @property({ type: Object }) data: {
    type: 'copy' | 'move'
    files: string[]
    destination: string
  } | null = null
  @property({ type: Object }) progress: {
    current: number
    total: number
    fileName: string
    percentage: number
  } | null = null

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }
  private execute() {
    this.dispatchEvent(new CustomEvent('execute'))
  }
  private updateDestination(value: string) {
    this.dispatchEvent(new CustomEvent('update-destination', { detail: value }))
  }

  render() {
    if (!this.data) return ''
    const { type, files, destination } = this.data

    return html`
      <simple-dialog
        .open=${true}
        .title=${type === 'copy' ? 'copy' : 'move'}
        .width=${'600px'}
        @dialog-close=${this.progress ? null : this.close}
      >
        <div style="padding: 1rem;">
          <div class="input-field">
            <label
              >${type === 'copy' ? 'copy' : 'move'} ${files.length} files
              to:</label
            >
            <input
              type="text"
              .value=${destination}
              .disabled=${this.progress !== null}
              @input=${(e: Event) =>
                this.updateDestination((e.target as HTMLInputElement).value)}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  this.execute()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  this.close()
                }
              }}
            />
          </div>
          ${this.progress
            ? html`
                <div class="progress-box">
                  <div
                    style="margin-bottom: 0.5rem; color: #0ea5e9; font-weight: bold;"
                  >
                    ⏳ ${type === 'copy' ? 'Copying' : 'Moving'}...
                    ${this.progress.percentage}%
                  </div>
                  <div class="progress-bar">
                    <div
                      class="progress-fill"
                      style="width: ${this.progress.percentage}%;"
                    >
                      ${this.progress.percentage}%
                    </div>
                  </div>
                  <div style="color: #cbd5e1; font-size: 0.85rem;">
                    📁 ${this.progress.current} / ${this.progress.total}
                  </div>
                  <div
                    style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem;"
                  >
                    Current: ${this.progress.fileName}
                  </div>
                </div>
              `
            : html`<div
                style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;"
              >
                ${files.map(
                  (f) => html`<div>• ${f.split(/[/\\]/).pop()}</div>`,
                )}
              </div>`}
        </div>
        <div slot="footer" class="dialog-buttons">
          ${!this.progress
            ? html`
                <button class="btn-cancel" @click=${this.close}>
                  cancel (ESC)
                </button>
                <button class="btn-confirm" @click=${this.execute}>
                  ${type} (ENTER)
                </button>
              `
            : ''}
        </div>
      </simple-dialog>
    `
  }
}
