import { css } from 'lit'

export const commanderStyles = css`
  :host {
    --bg-app: #0d0d0f;
    --bg-panel: #151517;
    --bg-panel-active: #1c1c1f;
    --bg-header: #1f1f23;
    --bg-toolbar: #1a1a1d;
    --bg-hover: #242429;

    --text-primary: #f5f5f7;
    --text-secondary: #a1a1aa;
    --text-muted: #71717a;

    --accent: #0a84ff;
    --accent-strong: #409cff;
    --warning: #ff9f0a;
    --success: #30d158;
    --danger: #ff453a;

    --border: #2a2a2e;
    /* ========= BASE ========= */

    display: block;
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-primary);
    background: var(--bg-app);
    width: 100%;
    height: 100vh;
    overflow: hidden;
    box-sizing: border-box;
  }

  * {
    transition:
      background 0.15s ease,
      border-color 0.15s ease,
      color 0.15s ease,
      transform 0.1s ease;
  }

  .commander-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
  }

  /* ========= TOOLBAR ========= */

  .toolbar {
    background: var(--bg-toolbar);
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .toolbar-title {
    font-weight: 600;
    font-size: 1.05rem;
    letter-spacing: 0.5px;
  }

  .toolbar-right {
    display: flex;
    gap: 1rem;
  }

  /* ========= PANES ========= */

  .panes-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1px;
    background: var(--border);
    flex: 1;
    overflow: hidden;
  }

  .pane {
    background: var(--bg-panel);
    display: flex;
    flex-direction: column;
    opacity: 0.85;
    overflow: hidden;
    min-height: 0;
  }

  .pane.active {
    background: var(--bg-panel-active);
    opacity: 1;
    box-shadow: inset 0 0 0 2px var(--accent);
  }

  .pane-header {
    background: var(--bg-header);
    padding: 0.6rem 1rem;
    font-weight: 500;
    border-bottom: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .pane.active .pane-header {
    background: var(--accent);
    color: white;
  }

  .pane-header:hover {
    background: var(--bg-hover);
  }

  .path-display {
    font-size: 0.85rem;
    color: var(--text-primary);
  }

  /* ========= FILE LIST ========= */

  .file-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5rem;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .file-item {
    display: grid;
    grid-template-columns: 20px 1fr 75px 55px;
    gap: 0.8rem;
    align-items: center;
    padding: 0.2rem 0.4rem;
    border-radius: 6px;
    font-size: 0.85rem;
    cursor: pointer;
  }

  .file-item:hover {
    background: var(--bg-hover);
  }

  .file-item.focused {
    outline: 2px solid var(--accent);
    background: var(--bg-hover);
  }

  .file-item.selected {
    background: rgba(255, 159, 10, 0.15);
    color: var(--warning);
  }

  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 300;
  }

  .file-name.directory {
    color: var(--success);
    font-weight: 500;
  }

  .file-size {
    font-size: 0.7rem;
    color: var(--text-secondary);
    text-align: right;
  }

  .file-date {
    font-size: 0.7rem;
    color: var(--text-muted);
    text-align: right;
  }

  /* ========= FILTER ========= */

  .filter-bar {
    padding: 0.5rem 1rem;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .filter-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--accent);
  }

  .filter-input {
    flex: 1;
    padding: 0.5rem;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    color: var(--text-primary);
    font-family: inherit;
  }

  .filter-input:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
  }

  /* ========= FUNCTION BAR ========= */

  .function-bar {
    background: var(--bg-toolbar);
    border-top: 1px solid var(--border);
    padding: 0.6rem;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .function-key {
    flex: 1;
    max-width: 7em;
    padding: 0.4rem 0.3rem;
    border-radius: 8px;
    background: var(--bg-panel);
    border: 1px solid var(--border);
    cursor: pointer;
  }

  .function-key:hover {
    background: var(--accent);
    color: white;
    transform: translateY(-2px);
  }

  .function-key-label {
    font-size: 0.7rem;
    color: var(--text-secondary);
  }

  .function-key-action {
    font-weight: 600;
    font-size: 0.85rem;
  }

  /* ========= STATUS ========= */

  .status-bar {
    background: var(--bg-header);
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    color: var(--text-secondary);
  }

  .status-bar.success {
    background: var(--success);
    color: black;
  }

  .status-bar.error {
    background: var(--danger);
    color: white;
  }

  /* ========= DIALOG ========= */

  .dialog-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dialog {
    background: var(--bg-panel);
    border-radius: 12px;
    border: 1px solid var(--border);
    width: 90%;
    height: 80%;
    display: flex;
    flex-direction: column;
  }

  .dialog-header {
    background: var(--accent);
    padding: 1rem;
    font-weight: 600;
    color: white;
  }

  .dialog-content {
    flex: 1;
    padding: 1rem;
    overflow: auto;
    background: var(--bg-panel-active);
    color: var(--text-primary);
    font-family: inherit;
  }

  .dialog-footer {
    background: var(--bg-header);
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  /* ========= RESPONSIVE ========= */

  @media (max-width: 768px) {
    .panes-container {
      grid-template-columns: 1fr;
    }
  }
`
