import { LitElement, css, html } from 'lit'
import '../navigation/ResponsiveMenu'

export class Faq extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: Arial, sans-serif;
      color: #333;
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
        <h2>Simplify your life</h2>

        <div class="columns">
          <p>
            Programmieren ist wie entrümpeln. Sauber und aufgeräumt steht nichts
            im weg.
          </p>
          <p>
            Das Pojekt wird nicht mittelfristig vergurkt und immer komplexer.
          </p>
        </div>
      </div>
    `
  }
}

customElements.define('simple-faq', Faq)
