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

        Get help at
        <a target="_blank" href="https://www.nice2havetoolbox.de/"
          >https://www.nice2havetoolbox.de/</a
        >

        Contribute at
        <a target="_blank" href="https://github.com/NHendricks/nh-toolbox"
          >https://github.com/NHendricks/nh-toolbox</a
        >. If you are new to programming just use Claude Code or Cline in Visual
        Studio Code. Ask your AI for help how to set this up (clone, oinstall
        node and VSCode, install Claude ... lets go).
      </div>
    `
  }
}

customElements.define('nh-faq', Faq)
