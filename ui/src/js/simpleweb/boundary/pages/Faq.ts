import { LitElement, css, html } from 'lit'
import '../navigation/ResponsiveMenu'

export class Faq extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #e2e8f0;
    }

    .content {
      padding: 2rem 1.25rem 3rem;
      max-width: 960px;
      margin: 0 auto;
    }

    h1 {
      margin: 0;
      font-size: clamp(1.8rem, 2.8vw, 2.4rem);
      color: #f8fafc;
    }

    .subtitle {
      margin-top: 0.5rem;
      color: #cbd5e1;
      max-width: 680px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .card {
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 12px;
      padding: 1rem;
      backdrop-filter: blur(4px);
    }

    .card h2 {
      margin: 0 0 0.45rem 0;
      font-size: 1.1rem;
      color: #f8fafc;
    }

    .card p {
      margin: 0;
      color: #cbd5e1;
      font-size: 0.95rem;
      line-height: 1.45;
    }

    a {
      display: inline-block;
      margin-top: 0.8rem;
      color: #93c5fd;
      text-decoration: none;
      font-weight: 600;
    }

    a:hover {
      text-decoration: underline;
    }
  `

  render() {
    return html`
      <div class="content">
        <h1>Help</h1>
        <p class="subtitle">
          Quick links only — full details are on the website and in project
          docs.
        </p>

        <div class="cards">
          <section class="card">
            <h2>Website</h2>
            <p>Guides, updates and general information.</p>
            <a target="_blank" href="https://www.nice2havetoolbox.de/"
              >Open website</a
            >
          </section>

          <section class="card">
            <h2>Releases</h2>
            <p>Latest versions, changelogs and downloadable builds.</p>
            <a
              target="_blank"
              href="https://github.com/NHendricks/nice-2-have-toolbox/releases"
              >Open releases</a
            >
          </section>

          <section class="card">
            <h2>Contribute</h2>
            <p>Ideas, fixes and pull requests are welcome.</p>
            <a target="_blank" href="https://github.com/NHendricks/nh-toolbox"
              >Contribute on GitHub</a
            >
          </section>
        </div>
      </div>
    `
  }
}

customElements.define('nh-faq', Faq)
