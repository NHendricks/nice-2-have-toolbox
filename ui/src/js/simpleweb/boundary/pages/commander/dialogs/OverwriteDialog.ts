import { LitElement, html, css } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('overwrite-dialog')
export class OverwriteDialog extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: #1e293b;
      border-radius: 8px;
      border: 2px solid #0ea5e9;
      padding: 2rem;
      max-width: 400px;
      width: 90%;
      color: #fff;
      box-shadow: 0 4px 32px #0008;
    }
    .dialog-title {
      font-size: 1.2rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
    .dialog-message {
      margin-bottom: 1.5rem;
      color: #cbd5e1;
    }
    .dialog-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-weight: bold;
      cursor: pointer;
      font-size: 0.9rem;
      white-space: nowrap;
    }
    .btn-overwrite {
      background: #059669;
      color: #fff;
    }
    .btn-skip {
      background: #475569;
      color: #fff;
    }
    .btn-cancel {
      background: #ef4444;
      color: #fff;
    }
    .btn-overwrite-all {
      background: #0369a1;
      color: #fff;
    }
  `

  @property({ type: String }) fileName = ''
  @property({ type: String }) destination = ''
  @property({ type: String }) type: 'copy' | 'move' = 'copy'

  private onOverwrite() {
    this.dispatchEvent(new CustomEvent('overwrite', { bubbles: true, composed: true }))
  }
  private onOverwriteAll() {
    this.dispatchEvent(new CustomEvent('overwrite-all', { bubbles: true, composed: true }))
  }
  private onSkip() {
    this.dispatchEvent(new CustomEvent('skip', { bubbles: true, composed: true }))
  }
  private onCancel() {
    this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }))
  }

  render() {
    return html`
      <div class="dialog">
        <div class="dialog-title">File exists</div>
        <div class="dialog-message">
          ${this.type === 'copy' ? 'Copy' : 'Move'} <b>${this.fileName}</b> to <b>${this.destination}</b>?<br />
          The file already exists. What do you want to do?
        </div>
        <div class="dialog-buttons">
          <button class="btn-overwrite" @click=${this.onOverwrite}>Overwrite</button>
          <button class="btn-overwrite-all" @click=${this.onOverwriteAll}>Overwrite All</button>
          <button class="btn-skip" @click=${this.onSkip}>Skip</button>
          <button class="btn-cancel" @click=${this.onCancel}>Cancel</button>
        </div>
      </div>
    `
  }
}
