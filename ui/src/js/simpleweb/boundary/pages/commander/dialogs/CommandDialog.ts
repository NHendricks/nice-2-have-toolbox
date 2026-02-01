import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('command-dialog')
export class CommandDialog extends LitElement {
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
  `

  @property({ type: String }) command = ''
  @property({ type: String }) workingDir = ''

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }
  private execute() {
    this.dispatchEvent(new CustomEvent('execute'))
  }
  private updateCommand(value: string) {
    this.dispatchEvent(new CustomEvent('update-command', { detail: value }))
  }

  render() {
    return html`
      <simple-dialog
        .open=${true}
        .title=${'⚡ execute'}
        .width=${'600px'}
        @dialog-close=${this.close}
      >
        <div style="padding: 1rem;">
          <div class="input-field">
            <label>execute in: ${this.workingDir}</label>
            <input
              type="text"
              .value=${this.command}
              placeholder="z.B. dir, ls, git status..."
              @input=${(e: Event) =>
                this.updateCommand((e.target as HTMLInputElement).value)}
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
        </div>
        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.close}>cancel (ESC)</button>
          <button class="btn-confirm" @click=${this.execute}>
            execute (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }
}
