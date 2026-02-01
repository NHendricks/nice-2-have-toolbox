import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('delete-dialog')
export class DeleteDialog extends LitElement {
  static styles = css`
    .dialog-buttons {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      justify-content: flex-end;
    }
    .btn-confirm {
      background: #dc2626;
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

  @property({ type: Array }) files: string[] = []

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }
  private execute() {
    this.dispatchEvent(new CustomEvent('execute'))
  }

  render() {
    if (this.files.length === 0) return ''

    return html`
      <simple-dialog
        .open=${true}
        .title=${'🗑️ confirm'}
        .width=${'600px'}
        @dialog-close=${this.close}
      >
        <div style="padding: 1rem;">
          <div style="margin-bottom: 1rem; color: #fbbf24; font-weight: bold;">
            ⚠️ really delete ${this.files.length} files?
          </div>
          <div style="margin-top: 1rem; color: #94a3b8; font-size: 0.9rem;">
            ${this.files.map(
              (f) => html`<div>• ${f.split(/[/\\]/).pop()}</div>`,
            )}
          </div>
        </div>
        <div slot="footer" class="dialog-buttons">
          <button class="btn-cancel" @click=${this.close}>cancel (ESC)</button>
          <button class="btn-confirm" @click=${this.execute}>
            confirm (ENTER)
          </button>
        </div>
      </simple-dialog>
    `
  }
}
