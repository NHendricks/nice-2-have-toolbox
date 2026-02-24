import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('help-dialog')
export class HelpDialog extends LitElement {
  static styles = css`
    .help-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.5rem;
      padding: 1rem;
    }
    .help-section h3 {
      color: #0ea5e9;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      border-bottom: 1px solid #475569;
      padding-bottom: 0.5rem;
    }
    .help-item {
      display: flex;
      gap: 1rem;
      align-items: center;
      padding: 0.25rem 0;
    }
    .help-key {
      background: #0f172a;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-family: monospace;
      color: #0ea5e9;
      font-size: 0.85rem;
      min-width: 100px;
      text-align: center;
    }
    .help-description {
      color: #cbd5e1;
      font-size: 0.9rem;
    }
  `

  @property({ type: Boolean }) open = false

  private isMac(): boolean {
    return /mac/i.test(navigator.platform || navigator.userAgent)
  }

  private altKeyLabel(): string {
    return this.isMac() ? '⌥' : 'Alt'
  }

  private driveSelectLabel(): string {
    return this.isMac() ? '⌘+1 / ⌘+2 or ⌥+1 / ⌥+2' : 'Alt+1 / Alt+2'
  }

  private fKeyLabel(key: string): string {
    return this.isMac() ? `${key} (or Fn+${key})` : key
  }

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  render() {
    return html`
      <simple-dialog
        .open=${this.open}
        .title=${'❓ keyboard shortcuts'}
        .width=${'850px'}
        .maxHeight=${'85vh'}
        @dialog-close=${this.close}
      >
        <div>
          Get more help at
          <a target="_blank" href="https://www.nice2havetoolbox.de/"
            >https://www.nice2havetoolbox.de/</a
          >
        </div>
        <div
          style="padding: 0 1rem 0.5rem; color: #94a3b8; font-size: 0.85rem;"
        >
          ${this.isMac()
            ? 'macOS: function keys may require Fn, and Alt = ⌥ (Option).'
            : 'Windows/Linux: shortcuts use standard function and Alt keys.'}
        </div>
        <div class="help-content">
          <div class="help-section">
            <h3>navigation</h3>
            <div class="help-item">
              <div class="help-key">↑ / ↓</div>
              <div class="help-description">move focus</div>
            </div>
            <div class="help-item">
              <div class="help-key">Enter</div>
              <div class="help-description">open / execute</div>
            </div>
            <div class="help-item">
              <div class="help-key">Tab</div>
              <div class="help-description">switch panels</div>
            </div>
            <div class="help-item">
              <div class="help-key">PageUp/Down</div>
              <div class="help-description">page navigation</div>
            </div>
            <div class="help-item">
              <div class="help-key">Home / End</div>
              <div class="help-description">first / last item</div>
            </div>
            <div class="help-item">
              <div class="help-key">
                ${this.altKeyLabel()}+← / ${this.altKeyLabel()}+→
              </div>
              <div class="help-description">history back/forward</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.driveSelectLabel()}</div>
              <div class="help-description">select drive</div>
            </div>
            <div class="help-item">
              <div class="help-key">a-z, 0-9</div>
              <div class="help-description">quick search</div>
            </div>
          </div>
          <div class="help-section">
            <h3>file operations</h3>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F2')}</div>
              <div class="help-description">rename</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F3')}</div>
              <div class="help-description">view file/image</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F4')}</div>
              <div class="help-description">edit file</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F5')}</div>
              <div class="help-description">copy</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F6')}</div>
              <div class="help-description">move</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F8')} / Del</div>
              <div class="help-description">delete</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F10')}</div>
              <div class="help-description">copy selected path</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.fKeyLabel('F12')}</div>
              <div class="help-description">create zip</div>
            </div>
            <div class="help-item">
              <div class="help-key">Ctrl+S</div>
              <div class="help-description">show size</div>
            </div>
          </div>
          <div class="help-section">
            <h3>selection</h3>
            <div class="help-item">
              <div class="help-key">Shift+Click</div>
              <div class="help-description">toggle select</div>
            </div>
            <div class="help-item">
              <div class="help-key">Shift+↑ / ↓</div>
              <div class="help-description">extend selection</div>
            </div>
            <div class="help-item">
              <div class="help-key">Shift+Space</div>
              <div class="help-description">toggle select</div>
            </div>
          </div>
          <div class="help-section">
            <h3>panels</h3>
            <div class="help-item">
              <div class="help-key">Shift+←</div>
              <div class="help-description">sync left to right</div>
            </div>
            <div class="help-item">
              <div class="help-key">Shift+→</div>
              <div class="help-description">sync right to left</div>
            </div>
          </div>
          <div class="help-section">
            <h3>tools</h3>
            <div class="help-item">
              <div class="help-key">Ctrl+F</div>
              <div class="help-description">find files</div>
            </div>
            <div class="help-item">
              <div class="help-key">F9</div>
              <div class="help-description">command dialog</div>
            </div>
            <div class="help-item">
              <div class="help-key">Shift+${this.fKeyLabel('F9')}</div>
              <div class="help-description">open terminal</div>
            </div>
            <div class="help-item">
              <div class="help-key">Shift+${this.fKeyLabel('F10')}</div>
              <div class="help-description">context menu</div>
            </div>
            <div class="help-item">
              <div class="help-key">${this.altKeyLabel()}+F</div>
              <div class="help-description">filter files</div>
            </div>
          </div>
          <div class="help-section">
            <h3>general</h3>
            <div class="help-item">
              <div class="help-key">F1</div>
              <div class="help-description">show help</div>
            </div>
            <div class="help-item">
              <div class="help-key">ESC</div>
              <div class="help-description">close / cancel</div>
            </div>
            <div class="help-item">
              <div class="help-key">← / → (image)</div>
              <div class="help-description">prev / next image</div>
            </div>
          </div>
        </div>
      </simple-dialog>
    `
  }
}
