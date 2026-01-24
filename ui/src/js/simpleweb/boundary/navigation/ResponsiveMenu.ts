import { Router } from '@vaadin/router'
import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import menuConfig from './menu-config.json' with { type: 'json' }

interface MenuItem {
  label: string
  path?: string
  hasSubmenu?: boolean
  submenu?: MenuItem[]
}

interface MenuConfig {
  mainNavigation: MenuItem[]
  bonusActions: MenuItem[]
}

@customElement('responsive-menu')
export class ResponsiveMenu extends LitElement {
  @state() private isMenuOpen = false
  @state() private isPortrait = window.matchMedia('(orientation: portrait)')
    .matches
  @state() private isScrolled = false
  @state() private openSubmenu: string | null = null
  @state() private isActionsOverlayOpen = false

  private scrollHandler?: () => void
  private resizeHandler?: () => void
  private config: MenuConfig = menuConfig as MenuConfig

  static styles = css`
    :host {
      display: block;
      --primary-bg: #1a1a2e;
      --secondary-bg: #16213e;
      --accent-color: #0f3460;
      --highlight-color: #e94560;
      --text-primary: #eaeaea;
      --text-secondary: #a0a0a0;
      --border-color: #2d2d44;
      --transition-speed: 0.3s;
    }

    * {
      box-sizing: border-box;
    }

    /* Portrait Mode - Burger Menu */
    .portrait-header {
      position: fixed;
      top: 0;
      right: 0;
      z-index: 1000;
      padding: 1rem;
    }

    .burger-btn {
      background: var(--secondary-bg);
      border: 2px solid var(--accent-color);
      border-radius: 8px;
      width: 50px;
      height: 50px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      transition: all var(--transition-speed);
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
    }

    .burger-btn:hover {
      background: var(--accent-color);
      transform: scale(1.05);
    }

    .burger-line {
      width: 30px;
      height: 3px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: all var(--transition-speed);
    }

    .burger-btn.open .burger-line:nth-child(1) {
      transform: rotate(45deg) translate(8px, 8px);
    }

    .burger-btn.open .burger-line:nth-child(2) {
      opacity: 0;
    }

    .burger-btn.open .burger-line:nth-child(3) {
      transform: rotate(-45deg) translate(8px, -8px);
    }

    .fullscreen-menu {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        135deg,
        var(--primary-bg) 0%,
        var(--secondary-bg) 100%
      );
      z-index: 999;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-speed);
    }

    .fullscreen-menu.open {
      opacity: 1;
      pointer-events: all;
    }

    .portrait-nav {
      display: flex;
      flex-direction: column;
      gap: clamp(0.5rem, 1.5vh, 1rem);
      width: 85%;
      max-width: 400px;
      max-height: 85vh;
      overflow-y: auto;
    }

    .portrait-nav-item {
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: clamp(0.8rem, 2vh, 1.2rem);
      color: var(--text-primary);
      text-decoration: none;
      font-size: clamp(1rem, 3.5vh, 1.5rem);
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-speed);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .portrait-nav-item-wrapper {
      position: relative;
    }

    .portrait-submenu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-top: 0.5rem;
      margin-left: 1rem;
      margin-right: 1rem;
      padding-left: 0.75rem;
      border-left: 3px solid var(--highlight-color);
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transform: translateY(-10px);
      z-index: 10;
      transition:
        max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s ease,
        transform 0.3s ease,
        margin-top 0.3s ease;
    }

    .portrait-submenu.open {
      max-height: 500px;
      opacity: 1;
      transform: translateY(0);
      margin-top: 0.75rem;
      background: linear-gradient(
        135deg,
        var(--primary-bg) 0%,
        var(--secondary-bg) 100%
      );
    }

    .portrait-submenu-item {
      background: linear-gradient(
        135deg,
        var(--accent-color) 0%,
        rgba(15, 52, 96, 0.8) 100%
      );
      border: 1px solid rgba(233, 69, 96, 0.3);
      border-radius: 6px;
      padding: clamp(0.8rem, 2vh, 1rem);
      color: var(--text-primary);
      text-decoration: none;
      font-size: clamp(0.9rem, 2.5vh, 1.2rem);
      font-weight: 400;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      position: relative;
      overflow: hidden;
    }

    .portrait-submenu-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(233, 69, 96, 0.3),
        transparent
      );
      transition: left 0.5s ease;
    }

    .portrait-submenu-item:hover::before {
      left: 100%;
    }

    .portrait-submenu-item:hover {
      background: linear-gradient(
        135deg,
        var(--highlight-color) 0%,
        rgba(233, 69, 96, 0.9) 100%
      );
      border-color: var(--highlight-color);
      transform: translateX(8px) scale(1.02);
      box-shadow: 0 4px 12px rgba(233, 69, 96, 0.4);
    }

    .portrait-submenu-item:active {
      transform: translateX(6px) scale(0.98);
    }

    .portrait-bonus {
      margin-top: clamp(1rem, 3vh, 2rem);
      padding-top: clamp(1rem, 3vh, 2rem);
      border-top: 2px solid var(--border-color);
      display: flex;
      flex-direction: column;
      gap: clamp(0.4rem, 1.5vh, 0.8rem);
    }

    .portrait-bonus-item {
      background: transparent;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: clamp(0.6rem, 1.5vh, 0.8rem);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: clamp(0.85rem, 2vh, 1rem);
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-speed);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .portrait-bonus-item:hover {
      background: var(--secondary-bg);
      color: var(--text-primary);
      border-color: var(--accent-color);
    }

    /* Actions Overlay (Portrait Mode) */
    .actions-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      z-index: 1001;
      display: flex;
      justify-content: center;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--transition-speed);
      backdrop-filter: blur(5px);
    }

    .actions-overlay.open {
      opacity: 1;
      pointer-events: all;
    }

    .actions-modal {
      background: linear-gradient(
        135deg,
        var(--secondary-bg) 0%,
        var(--primary-bg) 100%
      );
      border: 2px solid var(--accent-color);
      border-radius: 16px;
      padding: 2rem;
      width: 85%;
      max-width: 400px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      position: relative;
      transform: scale(0.8);
      transition: transform var(--transition-speed);
    }

    .actions-overlay.open .actions-modal {
      transform: scale(1);
    }

    .actions-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--border-color);
    }

    .actions-modal-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .close-btn {
      background: transparent;
      border: 2px solid var(--border-color);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      color: var(--text-primary);
      font-size: 1.5rem;
      font-weight: bold;
      transition: all var(--transition-speed);
      line-height: 1;
    }

    .close-btn:hover {
      background: var(--highlight-color);
      border-color: var(--highlight-color);
      transform: rotate(90deg);
    }

    .actions-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .action-item {
      background: var(--accent-color);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.2rem;
      color: var(--text-primary);
      text-decoration: none;
      font-size: 1.2rem;
      font-weight: 500;
      text-align: center;
      cursor: pointer;
      transition: all var(--transition-speed);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .action-item:hover {
      background: var(--highlight-color);
      transform: translateY(-3px);
      box-shadow: 0 6px 16px rgba(233, 69, 96, 0.4);
    }

    /* Landscape Mode - Horizontal Header */
    .landscape-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(
        180deg,
        var(--primary-bg) 0%,
        var(--secondary-bg) 100%
      );
      z-index: 1000;
      transition: all var(--transition-speed);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    }

    .landscape-header.scrolled {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
    }

    .landscape-bonus {
      display: flex;
      justify-content: flex-end;
      gap: 2rem;
      padding: 0.8rem 2rem;
      background: var(--secondary-bg);
      border-bottom: 1px solid var(--border-color);
      transition: all var(--transition-speed);
      max-height: 50px;
      overflow: hidden;
    }

    .landscape-bonus.hidden {
      max-height: 0;
      padding: 0 2rem;
      opacity: 0;
    }

    .landscape-bonus-item {
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all var(--transition-speed);
      white-space: nowrap;
    }

    .landscape-bonus-item:hover {
      color: var(--highlight-color);
    }

    .landscape-main {
      display: flex;
      align-items: center;
      padding: 1rem 2rem;
      gap: 3rem;
      transition: all var(--transition-speed);
    }

    .landscape-header.scrolled .landscape-main {
      padding: 0.5rem 2rem;
    }

    .site-icon {
      font-size: 3rem;
      transition: all var(--transition-speed);
      cursor: pointer;
      filter: drop-shadow(0 0 10px var(--highlight-color));
    }

    .landscape-header.scrolled .site-icon {
      font-size: 2rem;
    }

    .landscape-nav {
      display: flex;
      gap: 2rem;
      align-items: center;
      flex: 1;
    }

    .landscape-nav-item {
      color: var(--text-primary);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 500;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all var(--transition-speed);
      position: relative;
      white-space: nowrap;
    }

    .landscape-nav-item:hover {
      background: var(--accent-color);
      color: var(--highlight-color);
    }

    .submenu-container {
      position: relative;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 0.5rem;
      background: var(--secondary-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
      min-width: 200px;
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transition: all var(--transition-speed);
      pointer-events: none;
    }

    .dropdown.open {
      max-height: 500px;
      opacity: 1;
      pointer-events: all;
    }

    .dropdown-item {
      display: block;
      padding: 1rem 1.5rem;
      color: var(--text-primary);
      text-decoration: none;
      cursor: pointer;
      transition: all var(--transition-speed);
      border-bottom: 1px solid var(--border-color);
    }

    .dropdown-item:last-child {
      border-bottom: none;
    }

    .dropdown-item:hover {
      background: var(--accent-color);
      color: var(--highlight-color);
      padding-left: 2rem;
    }

    /* Hide content based on orientation */
    .portrait-only {
      display: none;
    }

    .landscape-only {
      display: none;
    }

    @media (orientation: portrait) {
      .portrait-only {
        display: block;
      }
      .landscape-only {
        display: none;
      }
    }

    @media (orientation: landscape) {
      .portrait-only {
        display: none;
      }
      .landscape-only {
        display: block;
      }
    }
  `

  connectedCallback() {
    super.connectedCallback()

    // Monitor orientation changes
    const mediaQuery = window.matchMedia('(orientation: portrait)')
    mediaQuery.addEventListener('change', (e) => {
      this.isPortrait = e.matches
      this.isMenuOpen = false
      this.openSubmenu = null
      this.isActionsOverlayOpen = false
    })

    // Monitor scroll in landscape mode
    this.scrollHandler = () => {
      if (!this.isPortrait) {
        this.isScrolled = window.scrollY > 50
      }
    }
    window.addEventListener('scroll', this.scrollHandler)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler)
    }
  }

  private toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
  }

  private toggleSubmenu(menu: string) {
    this.openSubmenu = this.openSubmenu === menu ? null : menu
  }

  private handleNavigation(path: string) {
    console.log('Navigate to:', path)
    this.isMenuOpen = false
    this.openSubmenu = null
    this.isActionsOverlayOpen = false
    // Here you can integrate with your router
    Router.go(path)
  }

  private openActionsOverlay() {
    this.isActionsOverlayOpen = true
  }

  private closeActionsOverlay() {
    this.isActionsOverlayOpen = false
  }

  private handleBackdropClick(e: Event) {
    if ((e.target as HTMLElement).classList.contains('actions-overlay')) {
      this.closeActionsOverlay()
    }
  }

  private renderPortraitMainNav() {
    return this.config.mainNavigation.map((item) => {
      if (item.hasSubmenu && item.submenu) {
        const key = item.label.toLowerCase()

        return html`
          <div class="portrait-nav-item-wrapper">
            <div
              class="portrait-nav-item"
              @click=${() => this.toggleSubmenu(key)}
            >
              ${item.label}
              <span style="float:right">
                ${this.openSubmenu === key ? '✕' : '▸'}
              </span>
            </div>
            <div
              class="portrait-submenu ${this.openSubmenu === key ? 'open' : ''}"
            >
              ${item.submenu.map(
                (sub) => html`
                  <div
                    class="portrait-submenu-item"
                    @click=${() => this.handleNavigation(sub.path || '#')}
                  >
                    ${sub.label}
                  </div>
                `,
              )}
            </div>
          </div>
        `
      }

      return html`
        <div
          class="portrait-nav-item"
          @click=${() => this.handleNavigation(item.path || '#')}
        >
          ${item.label}
        </div>
      `
    })
  }

  private renderActionsOverlay() {
    const aktionenItem = this.config.mainNavigation.find(
      (item) => item.hasSubmenu && item.submenu,
    )
    if (!aktionenItem || !aktionenItem.submenu) return ''

    return html`
      <div
        class="actions-overlay ${this.isActionsOverlayOpen ? 'open' : ''}"
        @click=${this.handleBackdropClick}
      >
        <div class="actions-modal">
          <div class="actions-modal-header">
            <h2 class="actions-modal-title">${aktionenItem.label}</h2>
            <button
              class="close-btn"
              @click=${this.closeActionsOverlay}
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
          <div class="actions-list">
            ${aktionenItem.submenu.map(
              (action) => html`
                <a
                  class="action-item"
                  @click=${() => this.handleNavigation(action.path || '#')}
                >
                  ${action.label}
                </a>
              `,
            )}
          </div>
        </div>
      </div>
    `
  }

  private renderPortraitBonusNav() {
    return this.config.bonusActions.map(
      (item) => html`
        <a
          class="portrait-bonus-item"
          @click=${() => this.handleNavigation(item.path || '#')}
        >
          ${item.label}
        </a>
      `,
    )
  }

  private renderLandscapeMainNav() {
    return this.config.mainNavigation.map((item) => {
      if (item.hasSubmenu && item.submenu) {
        const submenuKey = `${item.label.toLowerCase()}-landscape`
        return html`
          <div class="submenu-container">
            <div
              class="landscape-nav-item"
              @click=${() => this.toggleSubmenu(submenuKey)}
            >
              ${item.label} ${this.openSubmenu === submenuKey ? '▼' : '▶'}
            </div>
            <div
              class="dropdown ${this.openSubmenu === submenuKey ? 'open' : ''}"
            >
              ${item.submenu.map(
                (sub) => html`
                  <a
                    class="dropdown-item"
                    @click=${() => this.handleNavigation(sub.path || '#')}
                  >
                    ${sub.label}
                  </a>
                `,
              )}
            </div>
          </div>
        `
      }
      return html`
        <a
          class="landscape-nav-item"
          @click=${() => this.handleNavigation(item.path || '#')}
        >
          ${item.label}
        </a>
      `
    })
  }

  private renderLandscapeBonusNav() {
    return this.config.bonusActions.map(
      (item) => html`
        <a
          class="landscape-bonus-item"
          @click=${() => this.handleNavigation(item.path || '#')}
        >
          ${item.label}
        </a>
      `,
    )
  }

  render() {
    return html`
      <!-- Portrait Mode -->
      <div class="portrait-only">
        <div class="portrait-header">
          <button
            class="burger-btn ${this.isMenuOpen ? 'open' : ''}"
            @click=${this.toggleMenu}
            aria-label="Menu"
          >
            <span class="burger-line"></span>
            <span class="burger-line"></span>
            <span class="burger-line"></span>
          </button>
        </div>

        <div class="fullscreen-menu ${this.isMenuOpen ? 'open' : ''}">
          <nav class="portrait-nav">
            <!-- Main Navigation -->
            ${this.renderPortraitMainNav()}

            <!-- Bonus Actions -->
            <div class="portrait-bonus">${this.renderPortraitBonusNav()}</div>
          </nav>
        </div>

        <!-- Actions Overlay -->
        ${this.renderActionsOverlay()}
      </div>

      <!-- Landscape Mode -->
      <div class="landscape-only">
        <header class="landscape-header ${this.isScrolled ? 'scrolled' : ''}">
          <!-- Bonus Actions -->
          <div class="landscape-bonus ${this.isScrolled ? 'hidden' : ''}">
            ${this.renderLandscapeBonusNav()}
          </div>

          <!-- Main Navigation -->
          <div class="landscape-main">
            <div class="site-icon" @click=${() => this.handleNavigation('/')}>
              🌐
            </div>
            <nav class="landscape-nav">${this.renderLandscapeMainNav()}</nav>
          </div>
        </header>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'responsive-menu': ResponsiveMenu
  }
}
