import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('rename-dialog')
export class RenameDialog extends LitElement {
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
    .tip-box {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 4px;
      color: #94a3b8;
      font-size: 0.85rem;
    }
  `

  @property({ type: String }) oldName = ''
  @property({ type: String }) newName = ''

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }
  private execute() {
    this.dispatchEvent(new CustomEvent('execute'))
  }
  private updateName(value: string) {
    this.dispatchEvent(new CustomEvent('update-name', { detail: value }))
  }

  render() {
    return html`
      <simple-dialog
        .open=${true}
        .title=${'✏️ rename'}
        .width=${'600px'}
        @dialog-close=${this.close}
      >
        <div style="padding: 1rem;">
          <div class="input-field">
            <label>Rename "${this.oldName}" to:</label>
            <input
              type="text"
              .value=${this.newName}
              placeholder="Enter new name..."
              @input=${(e: Event) =>
                this.updateName((e.target as HTMLInputElement).value)}
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
          <div class="tip-box">
            💡 Tip: Press F2 on any file or folder to rename it. Press ENTER to
            confirm, ESC to cancel.
          </div>
        </div>
        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.close}>cancel (ESC)</button>
          <button class="btn-confirm" @click=${this.execute}>
            rename (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }
}
