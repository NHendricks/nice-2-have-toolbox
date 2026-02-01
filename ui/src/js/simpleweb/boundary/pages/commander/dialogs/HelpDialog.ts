import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import '../../../components/SimpleDialog'

@customElement('help-dialog')
export class HelpDialog extends LitElement {
  static styles = css`
    .help-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      min-width: 80px;
      text-align: center;
    }
    .help-description {
      color: #cbd5e1;
      font-size: 0.9rem;
    }
  `

  @property({ type: Boolean }) open = false

  private close() {
    this.dispatchEvent(new CustomEvent('close'))
  }

  render() {
    return html`
      <simple-dialog
        .open=${this.open}
        .title=${'❓ shortcuts'}
        .width=${'700px'}
        .maxHeight=${'80vh'}
        @dialog-close=${this.close}
      >
        <div class="help-content">
          <div class="help-section">
            <h3>navigate</h3>
            <div class="help-item">
              <div class="help-key">↑ / ↓</div>
              <div class="help-description">move focus</div>
            </div>
            <div class="help-item">
              <div class="help-key">Enter</div>
              <div class="help-description">open directory</div>
            </div>
            <div class="help-item">
              <div class="help-key">Tab</div>
              <div class="help-description">switch panels</div>
            </div>
            <div class="help-item">
              <div class="help-key">Alt+1 / Alt+2</div>
              <div class="help-description">select drive</div>
            </div>
          </div>
          <div class="help-section">
            <h3>files</h3>
            <div class="help-item">
              <div class="help-key">F2</div>
              <div class="help-description">rename file/folder</div>
            </div>
            <div class="help-item">
              <div class="help-key">F3</div>
              <div class="help-description">show file/image</div>
            </div>
            <div class="help-item">
              <div class="help-key">F8 / Delete</div>
              <div class="help-description">deletes file</div>
            </div>
            <div class="help-item">
              <div class="help-key">← / →</div>
              <div class="help-description">navigate</div>
            </div>
            <div class="help-item">
              <div class="help-key">double click</div>
              <div class="help-description">open file / folder</div>
            </div>
          </div>
          <div class="help-section">
            <h3>select</h3>
            <div class="help-item">
              <div class="help-key">ctrl+click</div>
              <div class="help-description">(de)select</div>
            </div>
            <div class="help-item">
              <div class="help-key">ctrl+↑ / ctrl+↓</div>
              <div class="help-description">(de)select</div>
            </div>
            <div class="help-item">
              <div class="help-key">ctrl+space</div>
              <div class="help-description">(de)select)</div>
            </div>
          </div>
          <div class="help-section">
            <h3>functions</h3>
            <div class="help-item">
              <div class="help-key">F5</div>
              <div class="help-description">copy</div>
            </div>
            <div class="help-item">
              <div class="help-key">F6</div>
              <div class="help-description">move</div>
            </div>
            <div class="help-item">
              <div class="help-key">F7</div>
              <div class="help-description">refresh</div>
            </div>
            <div class="help-item">
              <div class="help-key">F12</div>
              <div class="help-description">zip files</div>
            </div>
          </div>
          <div class="help-section">
            <h3>other</h3>
            <div class="help-item">
              <div class="help-key">ALT+f</div>
              <div class="help-description">filter files</div>
            </div>
            <div class="help-item">
              <div class="help-key">F1</div>
              <div class="help-description">show help</div>
            </div>
            <div class="help-item">
              <div class="help-key">ESC</div>
              <div class="help-description">close</div>
            </div>
          </div>
        </div>
      </simple-dialog>
    `
  }
}
