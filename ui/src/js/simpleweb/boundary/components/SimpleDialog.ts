import { LitElement, css, html } from 'lit'
import { property } from 'lit/decorators.js'

export class SimpleDialog extends LitElement {
  static styles = css`
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: #252526;
      border: 1px solid #3c3c3c;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
    }

    .dialog-header {
      background: #333333;
      padding: 0.75rem 1rem;
      font-weight: 600;
      color: #cccccc;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #3c3c3c;
    }

    .dialog-title {
      font-size: 1rem;
    }

    .dialog-close {
      background: transparent;
      border: 1px solid #3c3c3c;
      color: #cccccc;
      padding: 0.3rem 0.6rem;
      border-radius: 3px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .dialog-close:hover {
      background: #f48771;
      color: #1e1e1e;
      border-color: #f48771;
    }

    .dialog-content {
      flex: 1;
      overflow: auto;
      padding: 1rem;
      background: #1e1e1e;
      color: #cccccc;
      font-family: 'Consolas', 'Courier New', monospace;
    }

    .dialog-footer {
      background: #333333;
      padding: 0.5rem 1rem;
      font-size: 0.85rem;
      color: #858585;
      border-top: 1px solid #3c3c3c;
    }
  `

  @property({ type: Boolean })
  open = false

  @property({ type: String })
  title = ''

  @property({ type: String })
  width = '600px'

  @property({ type: String })
  height = 'auto'

  @property({ type: String })
  maxHeight = '80vh'

  @property({ type: Boolean })
  showCloseButton = true

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.handleKeyDown)
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.handleKeyDown)
    super.disconnectedCallback()
  }

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.close()
    }
  }

  handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget) {
      this.close()
    }
  }

  close() {
    this.dispatchEvent(new CustomEvent('dialog-close'))
  }

  render() {
    if (!this.open) return null

    return html`
      <div class="dialog-overlay" @click=${this.handleOverlayClick}>
        <div
          class="dialog"
          style="width: ${this.width}; height: ${this
            .height}; max-height: ${this.maxHeight};"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <div class="dialog-header">
            <span class="dialog-title">${this.title}</span>
            ${this.showCloseButton
              ? html`
                  <button class="dialog-close" @click=${this.close}>ESC</button>
                `
              : ''}
            <slot name="header-actions"></slot>
          </div>
          <div class="dialog-content">
            <slot></slot>
          </div>
          ${this.hasFooterSlot()
            ? html`
                <div class="dialog-footer">
                  <slot name="footer"></slot>
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }

  private hasFooterSlot(): boolean {
    const slot = this.querySelector('[slot="footer"]')
    return slot !== null
  }
}

customElements.define('simple-dialog', SimpleDialog)
