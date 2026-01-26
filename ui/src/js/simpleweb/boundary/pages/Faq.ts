import { LitElement, css, html } from 'lit'
import '../navigation/ResponsiveMenu'

export class Faq extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      color: #777;
    }

    /* Inhalt */
    .content {
      padding: 2rem;
      max-width: 1000px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 0.5rem;
    }

    h2 {
      margin-top: 2rem;
      color: #475569;
    }

    .columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 1rem;
    }

    @media (max-width: 768px) {
      .columns {
        grid-template-columns: 1fr;
      }
    }
  `

  render() {
    return html`
      <div class="content">
        <h1>FAQ</h1>
        <h2>Simplify all of your utility tasks in 1 app</h2>

        <p>Use cline in vscode.</p>
        <p>
          Create a command in the backend project. Cline (KI Claude-Sonnet) will
          see the existing structures and build it accordingly.
        </p>
        <p>
          In the UI use the menu at the top right corner to test your backend
          services separately. If something is missing extends the help of the
          backend.
        </p>
        <p>Read the readmes and look at the code.</p>
        <p>
          Complex UI is cheap to generate using AI, fixing is much more
          expensive.
        </p>
      </div>
    `
  }
}

customElements.define('nh-faq', Faq)
