import { LitElement, css, html } from 'lit'
import '../navigation/ResponsiveMenu'

export class Commander extends LitElement {
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

        <p>Nutze cline in vscode.</p>
        <p>
          Erstelle einen command im backend Projekt. Cline (KI Claude-Sonnet)
          wird die vorhandenen Strukturen erkennen und analoge Commands bauen.
        </p>
        <p>Das UI zeigt automatisch alle Tasks an.</p>
        <p>Teste die Tasks eigentändig über die cmdline-Funktionalität.</p>
        <p>Lies die readmes und schau in den Code.</p>
        <p>Falls nötig, lass Dir komplexe UI Seite erstelle über Claude.</p>
      </div>
    `
  }
}

customElements.define('simple-faq', Commander)
