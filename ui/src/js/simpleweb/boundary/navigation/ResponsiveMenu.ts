import { Router } from '@vaadin/router'
import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import menuConfig from './menu-config.json' with { type: 'json' }

interface MenuItem {
  label: string
  path?: string
  icon?: string
  hasSubmenu?: boolean
  submenu?: MenuItem[]
}

interface PageSettings {
  forcePortrait?: boolean
  addBodyClass?: string
}

interface MenuConfig {
  mainNavigation: MenuItem[]
  bonusActions: MenuItem[]
  pageSettings?: Record<string, PageSettings>
}

// Helper function to get initial page settings before component instantiation
function getInitialPageSettings(): PageSettings | undefined {
  const config = menuConfig as MenuConfig
  // Default to "/" for initial load
  return config.pageSettings?.['/']
}

@customElement('responsive-menu')
export class ResponsiveMenu extends LitElement {
  // Initialize with settings from config to avoid flash
  private static initialSettings = getInitialPageSettings()

  @state() private isMenuOpen = false
  @state() private isPortrait =
    ResponsiveMenu.initialSettings?.forcePortrait ||
    window.matchMedia('(orientation: portrait)').matches
  @state() private isScrolled = false
  @state() private openSubmenu: string | null = null
  @state() private isActionsOverlayOpen = false
  @state() private openFolderMenu: MenuItem | null = null
  @property({ type: Boolean, reflect: true, attribute: 'force-portrait' })
  public forcePortrait = ResponsiveMenu.initialSettings?.forcePortrait ?? false

  private scrollHandler?: () => void
  private resizeHandler?: () => void
  private config: MenuConfig = menuConfig as MenuConfig

  constructor() {
    super()
    // Apply initial body class immediately to prevent flash
    const initialSettings = ResponsiveMenu.initialSettings
    if (initialSettings?.addBodyClass) {
      document.body.classList.add(initialSettings.addBodyClass)
    }
  }

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

    @keyframes subtlePulse {
      0%, 100% {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(255, 255, 255, 0.2);
      }
      50% {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5), 0 0 8px 2px rgba(255, 255, 255, 0.15);
      }
    }

    .burger-btn {
      background: rgba(255, 255, 255, 0.12);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 14px;
      width: 52px;
      height: 52px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 5px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(255, 255, 255, 0.2);
      position: relative;
    }

    .burger-btn::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 16px;
      padding: 2px;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.05));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .burger-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: scale(1.08);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 255, 255, 0.2);
    }

    .burger-btn:hover::after {
      opacity: 1;
    }

    .burger-btn:active {
      transform: scale(0.95);
    }

    :host([force-portrait]) .burger-btn {
      opacity: 0.5;
      animation: subtlePulse 4s ease-in-out infinite;
    }

    :host([force-portrait]) .burger-btn:hover {
      opacity: 1;
      animation: none;
    }

    /* TEMPORARY override when force-portrait just activated */
    :host([force-portrait]) .burger-btn.force-visible {
      opacity: 1;
      animation: none;
    }

    .burger-line {
      width: 28px;
      height: 3px;
      background: var(--text-primary);
      border-radius: 2px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
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
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
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
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: clamp(1rem, 3vh, 2rem);
      width: 90%;
      max-width: 600px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 2rem 1rem;
      justify-items: center;
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
    }

    .portrait-nav::-webkit-scrollbar {
      width: 6px;
    }

    .portrait-nav::-webkit-scrollbar-track {
      background: transparent;
    }

    .portrait-nav::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.3);
      border-radius: 3px;
    }

    .portrait-nav::-webkit-scrollbar-thumb:hover {
      background-color: rgba(255, 255, 255, 0.5);
    }

    .portrait-nav-item {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 18px;
      padding: 1.2rem 0.8rem;
      color: var(--text-primary);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 110px;
      height: 110px;
      text-align: center;
      position: relative;
    }

    .portrait-nav-item:hover {
      background: rgba(255, 255, 255, 0.15);
      transform: scale(1.05);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
    }

    .portrait-nav-item:active {
      transform: scale(0.95);
    }

    .app-icon {
      font-size: 3rem;
      line-height: 1;
      filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    }

    .app-label {
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* Folder popup styles */
    .folder-popup {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      z-index: 1002;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }

    .folder-popup.open {
      opacity: 1;
      pointer-events: all;
    }

    .folder-popup-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 2rem;
      color: var(--text-primary);
    }

    .folder-popup-icon {
      font-size: 2.5rem;
      filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));
    }

    .folder-popup-title {
      font-size: 1.8rem;
      font-weight: 600;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .folder-popup-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 1.5rem;
      width: 90%;
      max-width: 500px;
      justify-items: center;
      padding: 1rem;
    }

    .folder-popup-item {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 18px;
      padding: 1.2rem 0.8rem;
      color: var(--text-primary);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 110px;
      height: 110px;
      text-align: center;
    }

    .folder-popup-item:hover {
      background: rgba(255, 255, 255, 0.18);
      transform: scale(1.08);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
    }

    .folder-popup-item:active {
      transform: scale(0.95);
    }

    .folder-popup-close {
      position: absolute;
      bottom: 3rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 0.8rem 2rem;
      color: var(--text-primary);
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .folder-popup-close:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateX(-50%) scale(1.05);
    }

    .folder-indicator {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 0.7rem;
      opacity: 0.7;
    }

    .portrait-bonus {
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      justify-content: center;
      gap: 1rem;
      width: 100%;
    }

    .portrait-bonus-item {
      background: transparent;
      border: none;
      padding: 0.5rem 1rem;
      color: rgba(255, 255, 255, 0.6);
      text-decoration: none;
      font-size: 0.8rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .portrait-bonus-item:hover {
      color: rgba(255, 255, 255, 0.9);
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

    /* Responsive adjustments for menu button */
    @media (max-width: 768px) {
      .portrait-header {
        padding: 0.75rem;
      }

      .burger-btn {
        width: 48px;
        height: 48px;
      }
    }

    @media (max-width: 480px) {
      .portrait-header {
        padding: 0.5rem;
      }

      .burger-btn {
        width: 46px;
        height: 46px;
      }

      .burger-line {
        width: 26px;
      }
    }

    /* Ensure button is visible on touch devices */
    @media (hover: none) and (pointer: coarse) {
      :host([force-portrait]) .burger-btn {
        opacity: 0.65;
      }
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

    // Apply page settings for current route
    const initialPath = this.getCurrentRoutePath()
    this.applyPageSettings(initialPath)

    // Also try again after a short delay in case router hasn't initialized yet
    setTimeout(() => {
      const delayedPath = this.getCurrentRoutePath()
      this.applyPageSettings(delayedPath)
    }, 100)

    // Monitor orientation changes
    const mediaQuery = window.matchMedia('(orientation: portrait)')
    mediaQuery.addEventListener('change', (e) => {
      // Use forced orientation if set, otherwise use actual orientation
      this.isPortrait = this.forcePortrait ? true : e.matches
      this.isMenuOpen = false
      this.openSubmenu = null
      this.isActionsOverlayOpen = false
    })

    // Monitor scroll in landscape mode
    this.scrollHandler = () => {
      // Consider forcePortrait when determining scroll behavior
      const effectivePortrait = this.forcePortrait || this.isPortrait
      if (!effectivePortrait) {
        this.isScrolled = window.scrollY > 50
      }
    }
    window.addEventListener('scroll', this.scrollHandler)

    // Listen for route changes
    window.addEventListener('vaadin-router-location-changed', (e: Event) => {
      const customEvent = e as CustomEvent
      const pathname =
        customEvent.detail?.location?.pathname || this.getCurrentRoutePath()
      this.applyPageSettings(pathname)
    })
  }

  private getCurrentRoutePath(): string {
    // Try to get the path from hash (for hash-based routing in Electron)
    if (window.location.hash) {
      // Hash could be "#/" or "#/moneyfinder" etc
      const hash = window.location.hash
      if (hash.startsWith('#/')) {
        return hash.slice(1) // Remove the # prefix
      } else if (hash.startsWith('#')) {
        const hashPath = hash.slice(1)
        return hashPath.startsWith('/') ? hashPath : '/' + hashPath
      }
    }

    // For file:// protocol, the pathname is the file path, so we need to detect this
    const pathname = window.location.pathname
    const protocol = window.location.protocol

    // If using file:// protocol, default to '/' since router uses hash or internal state
    if (protocol === 'file:') {
      return '/'
    }

    // For http/https, check if pathname looks like a file path
    if (
      pathname.endsWith('.html') ||
      pathname.includes('\\') ||
      pathname.length > 50
    ) {
      return '/'
    }

    return pathname || '/'
  }

  private triggerForcePortraitOpacityHint() {
    const btn = this.renderRoot.querySelector(
      '.burger-btn',
    ) as HTMLElement | null

    if (!btn) return

    // sofort sichtbar
    btn.classList.add('force-visible')

    // nach 0.5s wieder zurück
    setTimeout(() => {
      btn.classList.remove('force-visible')
    }, 500)
  }

  private applyPageSettings(routePath?: string) {
    const currentPath = routePath || this.getCurrentRoutePath()
    const pageSettings = this.config.pageSettings?.[currentPath]

    if (pageSettings) {
      // Apply forcePortrait setting
      if (pageSettings.forcePortrait !== undefined) {
        const wasForced = this.forcePortrait
        this.forcePortrait = pageSettings.forcePortrait

        // nur beim AKTIVIEREN
        if (!wasForced && this.forcePortrait) {
          this.updateComplete.then(() => {
            this.triggerForcePortraitOpacityHint()
          })
        }
      }

      // Apply body class
      if (pageSettings.addBodyClass) {
        document.body.classList.add(pageSettings.addBodyClass)
      }
    } else {
      // Reset to defaults if no settings for this page
      this.forcePortrait = false

      // Remove all page-specific body classes
      if (this.config.pageSettings) {
        Object.values(this.config.pageSettings).forEach((settings) => {
          if (settings.addBodyClass) {
            document.body.classList.remove(settings.addBodyClass)
          }
        })
      }
    }

    // Update isPortrait based on forcePortrait
    if (this.forcePortrait) {
      this.isPortrait = true
    } else {
      this.isPortrait = window.matchMedia('(orientation: portrait)').matches
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler)
    }
  }

  private toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen
    if (!this.isMenuOpen) {
      this.openFolderMenu = null
    }
  }

  private openFolder(item: MenuItem) {
    this.openFolderMenu = item
  }

  private closeFolder() {
    this.openFolderMenu = null
  }

  private toggleSubmenu(menu: string) {
    this.openSubmenu = this.openSubmenu === menu ? null : menu
  }

  private handleNavigation(path: string) {
    this.isMenuOpen = false
    this.openSubmenu = null
    this.isActionsOverlayOpen = false
    this.openFolderMenu = null

    // Check if path is external URL
    if (path.startsWith('http://') || path.startsWith('https://')) {
      window.open(path, '_blank')
    } else {
      // Here you can integrate with your router
      Router.go(path)
    }
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
        return html`
          <div class="portrait-nav-item" @click=${() => this.openFolder(item)}>
            <div class="app-icon">${item.icon || '📂'}</div>
            <div class="app-label">${item.label}</div>
            <span class="folder-indicator">▸</span>
          </div>
        `
      }

      return html`
        <div
          class="portrait-nav-item"
          @click=${() => this.handleNavigation(item.path || '#')}
        >
          <div class="app-icon">${item.icon || '📱'}</div>
          <div class="app-label">${item.label}</div>
        </div>
      `
    })
  }

  private renderFolderPopup() {
    if (!this.openFolderMenu || !this.openFolderMenu.submenu) {
      return ''
    }

    return html`
      <div class="folder-popup ${this.openFolderMenu ? 'open' : ''}">
        <div class="folder-popup-header">
          <div class="folder-popup-icon">
            ${this.openFolderMenu.icon || '📂'}
          </div>
          <div class="folder-popup-title">${this.openFolderMenu.label}</div>
        </div>

        <div class="folder-popup-grid">
          ${this.openFolderMenu.submenu.map(
            (subItem) => html`
              <div
                class="folder-popup-item"
                @click=${() => this.handleNavigation(subItem.path || '#')}
              >
                <div class="app-icon">${subItem.icon || '📱'}</div>
                <div class="app-label">${subItem.label}</div>
              </div>
            `,
          )}
        </div>

        <button class="folder-popup-close" @click=${this.closeFolder}>
          Close
        </button>
      </div>
    `
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
              aria-label="Close"
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
    if (!this.config.bonusActions || this.config.bonusActions.length === 0) {
      return ''
    }
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
    // Use forced portrait mode if set
    const effectivePortrait = this.forcePortrait || this.isPortrait

    return html`
      <!-- Portrait Mode -->
      <div
        class="portrait-only"
        style="${this.forcePortrait ? 'display: block !important;' : ''}"
      >
        <div class="portrait-header">
          <button
            class="burger-btn ${this.isMenuOpen ? 'open' : ''}"
            @click=${this.toggleMenu}
            aria-label="${this.isMenuOpen ? 'Close menu' : 'Open menu'}"
            title="${this.isMenuOpen ? 'Close menu' : 'Open app menu'}"
          >
            <span class="burger-line"></span>
            <span class="burger-line"></span>
            <span class="burger-line"></span>
          </button>
        </div>

        <div class="fullscreen-menu ${this.isMenuOpen ? 'open' : ''}">
          <div class="portrait-nav">
            <!-- Main Navigation Grid -->
            ${this.renderPortraitMainNav()}
          </div>

          <!-- Bonus Actions -->
          <div class="portrait-bonus">${this.renderPortraitBonusNav()}</div>
        </div>

        <!-- Folder Popup -->
        ${this.renderFolderPopup()}

        <!-- Actions Overlay -->
        ${this.renderActionsOverlay()}
      </div>

      <!-- Landscape Mode -->
      <div
        class="landscape-only"
        style="${this.forcePortrait ? 'display: none !important;' : ''}"
      >
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
