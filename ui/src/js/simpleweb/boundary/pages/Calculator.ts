import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'

@customElement('nh-calculator')
export class Calculator extends LitElement {
  @state() private expression = '0'
  @state() private preview = ''
  private readonly keydownHandler = (e: KeyboardEvent) => this.handleKeydown(e)

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #eaeaea;
      font-family:
        -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

    .calculator-card {
      flex: 1;
      max-width: 460px;
      width: 100%;
      align-self: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 1rem;
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }

    .display {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 0.85rem 1rem;
      min-height: 84px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      overflow: hidden;
    }

    .preview {
      font-size: 0.85rem;
      color: rgba(234, 234, 234, 0.7);
      min-height: 1.2rem;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .expression {
      font-size: 2rem;
      font-weight: 600;
      text-align: right;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .keys {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.6rem;
    }

    button {
      border: none;
      border-radius: 10px;
      padding: 0.85rem 0.5rem;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      color: #eaeaea;
      background: rgba(255, 255, 255, 0.09);
      transition: all 0.15s ease;
    }

    button:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: translateY(-1px);
    }

    button:active {
      transform: translateY(0);
    }

    .op {
      background: rgba(59, 130, 246, 0.45);
    }

    .op:hover {
      background: rgba(59, 130, 246, 0.65);
    }

    .danger {
      background: rgba(239, 68, 68, 0.55);
    }

    .danger:hover {
      background: rgba(239, 68, 68, 0.72);
    }

    .equal {
      background: rgba(34, 197, 94, 0.6);
      grid-column: span 2;
    }

    .equal:hover {
      background: rgba(34, 197, 94, 0.78);
    }

    .zero {
      grid-column: span 2;
    }

    .hint {
      text-align: center;
      font-size: 0.8rem;
      color: rgba(234, 234, 234, 0.65);
    }
  `

  private clearAll() {
    this.expression = '0'
    this.preview = ''
  }

  private backspace() {
    if (this.expression.length <= 1) {
      this.expression = '0'
      this.preview = ''
      return
    }

    this.expression = this.expression.slice(0, -1)
    this.updatePreview()
  }

  private appendToken(value: string) {
    if (this.expression === '0' && /[0-9.]/.test(value)) {
      this.expression = value === '.' ? '0.' : value
    } else {
      const last = this.expression[this.expression.length - 1]
      const isOperator = /[+\-*/]/.test(value)
      const lastIsOperator = /[+\-*/]/.test(last)

      if (isOperator && lastIsOperator) {
        this.expression = this.expression.slice(0, -1) + value
      } else {
        this.expression += value
      }
    }

    this.updatePreview()
  }

  private sanitizeExpression(input: string): string {
    return input.replace(/[^0-9+\-*/().]/g, '')
  }

  private evaluateExpression(raw: string): number {
    const sanitized = this.sanitizeExpression(raw)
    if (!sanitized) return 0

    const result = Function(`"use strict"; return (${sanitized})`)()
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new Error('Invalid result')
    }
    return result
  }

  private formatResult(value: number): string {
    if (Number.isInteger(value)) return String(value)
    return String(parseFloat(value.toFixed(10)))
  }

  private updatePreview() {
    try {
      const result = this.evaluateExpression(this.expression)
      this.preview = this.formatResult(result)
    } catch {
      this.preview = ''
    }
  }

  private calculate() {
    try {
      const result = this.evaluateExpression(this.expression)
      this.expression = this.formatResult(result)
      this.preview = ''
    } catch {
      this.preview = 'Error'
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    const key = e.key

    if (
      /^[0-9]$/.test(key) ||
      ['+', '-', '*', '/', '.', '(', ')'].includes(key)
    ) {
      e.preventDefault()
      this.appendToken(key)
      return
    }

    if (key === 'Enter' || key === '=') {
      e.preventDefault()
      this.calculate()
      return
    }

    if (key === 'Backspace') {
      e.preventDefault()
      this.backspace()
      return
    }

    if (key === 'Escape') {
      e.preventDefault()
      this.clearAll()
    }
  }

  connectedCallback() {
    super.connectedCallback()
    window.addEventListener('keydown', this.keydownHandler)
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.keydownHandler)
    super.disconnectedCallback()
  }

  render() {
    return html`
      <div class="container">
        <div class="header">
          <div class="title">
            <span>🧮</span>
            <span>Calculator</span>
          </div>
        </div>

        <div class="calculator-card">
          <div class="display">
            <div class="preview">
              ${this.preview ? `= ${this.preview}` : ''}
            </div>
            <div class="expression">${this.expression}</div>
          </div>

          <div class="keys">
            <button class="danger" @click=${this.clearAll}>AC</button>
            <button class="danger" @click=${this.backspace}>⌫</button>
            <button class="op" @click=${() => this.appendToken('(')}>(</button>
            <button class="op" @click=${() => this.appendToken(')')}>)</button>

            <button @click=${() => this.appendToken('7')}>7</button>
            <button @click=${() => this.appendToken('8')}>8</button>
            <button @click=${() => this.appendToken('9')}>9</button>
            <button class="op" @click=${() => this.appendToken('/')}>÷</button>

            <button @click=${() => this.appendToken('4')}>4</button>
            <button @click=${() => this.appendToken('5')}>5</button>
            <button @click=${() => this.appendToken('6')}>6</button>
            <button class="op" @click=${() => this.appendToken('*')}>×</button>

            <button @click=${() => this.appendToken('1')}>1</button>
            <button @click=${() => this.appendToken('2')}>2</button>
            <button @click=${() => this.appendToken('3')}>3</button>
            <button class="op" @click=${() => this.appendToken('-')}>−</button>

            <button class="zero" @click=${() => this.appendToken('0')}>
              0
            </button>
            <button @click=${() => this.appendToken('.')}>.</button>
            <button class="op" @click=${() => this.appendToken('+')}>+</button>

            <button class="equal" @click=${this.calculate}>=</button>
          </div>

          <div class="hint">
            Keyboard supported: numbers, + - * /, Enter, Backspace, Esc
          </div>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nh-calculator': Calculator
  }
}
