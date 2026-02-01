/**
 * Commander component styles
 */

import { css } from 'lit'

export const commanderStyles = css`
  :host {
    display: block;
    font-family: 'Courier New', monospace;
    color: #fff;
    background: #000;
    width: 100%;
    height: 100vh;
    overflow: hidden;
    box-sizing: border-box;
  }

  .commander-container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    box-sizing: border-box;
  }

  .toolbar {
    background: #1e293b;
    padding: 0.5rem 1rem;
    border-bottom: 2px solid #334155;
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .toolbar-title {
    font-weight: bold;
    font-size: 1.1rem;
  }

  .panes-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    background: #334155;
    flex: 1;
    overflow: hidden;
  }

  .pane {
    background: #0f172a;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pane.active {
    background: #1e293b;
  }

  .pane-header {
    background: #475569;
    padding: 0.5rem 1rem;
    font-weight: bold;
    color: #fbbf24;
    border-bottom: 1px solid #64748b;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
  }

  .pane-header:hover {
    background: #5a6f86;
  }

  .pane.active .pane-header {
    background: #0e5ae9;
    color: #fff;
  }

  .pane.active .pane-header:hover {
    background: #0284c7;
  }

  .path-display {
    font-size: 0.9rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .drive-selector {
    width: 400px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
  }

  .drive-list {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    overflow-y: auto;
    flex: 1;
  }

  .drive-item {
    padding: 1rem;
    background: #0f172a;
    border: 2px solid #475569;
    border-radius: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 1rem;
    transition: all 0.2s;
  }

  .drive-item:hover {
    background: #1e293b;
    border-color: #0ea5e9;
    transform: translateX(4px);
  }

  .drive-item.focused {
    background: #1e293b;
    border-color: #0ea5e9;
    outline: 2px solid #0ea5e9;
    transform: translateX(4px);
  }

  .drive-icon {
    font-size: 2rem;
  }

  .drive-info {
    flex: 1;
  }

  .drive-label {
    font-size: 1.1rem;
    font-weight: bold;
    color: #fbbf24;
  }

  .drive-path {
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .item-count {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .file-list {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0.5rem;
  }

  .file-item {
    padding: 0rem 0rem;
    cursor: pointer;
    display: grid;
    grid-template-columns: 20px 1fr auto;
    gap: 0.8rem;
    align-items: center;
    border-radius: 4px;
    white-space: nowrap;
    font-size: 0.8rem;
  }

  .file-item:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .file-item.focused {
    background: #475569;
    outline: 2px solid #0ea5e9;
  }

  .file-item.selected {
    color: #fbbf24;
  }

  .file-item.selected.focused {
    color: #fbbf24;
  }

  .file-item.selected .file-name,
  .file-item.selected.focused .file-name {
    color: #fbbf24;
  }

  .file-name {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .file-name.directory {
    color: rgb(117 233 106);
  }

  .file-size {
    font-size: 0.85rem;
    color: #94a3b8;
    text-align: right;
  }

  .filter-bar {
    padding: 0.5rem 1rem;
    background: #1e293b;
    border-bottom: 1px solid #334155;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .filter-input {
    flex: 1;
    padding: 0.5rem;
    background: #0f172a;
    border: 2px solid #0ea5e9;
    color: #fff;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    border-radius: 4px;
  }

  .filter-input:focus {
    outline: none;
    border-color: #fbbf24;
  }

  .filter-label {
    color: #0ea5e9;
    font-size: 0.85rem;
    font-weight: bold;
  }

  .function-bar {
    background: #1e293b;
    border-top: 2px solid #334155;
    padding: 0.5rem;
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .function-key,
  .function-key-top {
    flex: 1;
    background: #475569;
    border: 1px solid #64748b;
    padding: 0.05rem;
    text-align: center;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
    max-width: 7em;
  }

  .function-key-top {
    margin-right: 4em;
  }

  .function-key:hover {
    background: #0ea5e9;
    transform: translateY(-2px);
  }

  .function-key-label {
    display: block;
    font-size: 0.75rem;
    color: #94a3b8;
    margin-bottom: 0.2rem;
  }

  .function-key-action {
    display: block;
    font-size: 0.9rem;
    font-weight: bold;
    color: #fff;
  }

  .status-bar {
    background: #334155;
    padding: 0.5rem 1rem;
    border-top: 1px solid #475569;
    font-size: 0.85rem;
    color: #cbd5e1;
  }

  .status-bar.success {
    background: #059669;
  }

  .status-bar.error {
    background: #dc2626;
  }

  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: #1e293b;
    border: 2px solid #0ea5e9;
    border-radius: 8px;
    width: 90%;
    height: 80%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .dialog-header {
    background: #0ea5e9;
    padding: 1rem;
    font-weight: bold;
    color: #fff;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .dialog-title {
    font-size: 1.1rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dialog-close {
    background: #dc2626;
    border: none;
    color: #fff;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
  }

  .dialog-close:hover {
    background: #b91c1c;
  }

  .dialog-content {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background: #0f172a;
    color: #e2e8f0;
    font-family: 'Courier New', monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .dialog-content.image-viewer {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: #000;
  }

  .dialog-content.image-viewer img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .dialog-footer {
    background: #334155;
    padding: 0.5rem 1rem;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .help-dialog {
    width: 700px;
    max-height: 80vh;
  }

  .help-content {
    padding: 1.5rem;
    overflow-y: auto;
  }

  .help-section {
    margin-bottom: 1.5rem;
  }

  .help-section h3 {
    color: #fbbf24;
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    border-bottom: 2px solid #475569;
    padding-bottom: 0.5rem;
  }

  .help-item {
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 1rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #334155;
  }

  .help-key {
    color: #0ea5e9;
    font-weight: bold;
    font-family: 'Courier New', monospace;
  }

  .help-description {
    color: #cbd5e1;
  }

  .input-dialog {
    width: 600px;
    height: auto;
  }

  .input-field {
    margin: 1rem;
  }

  .input-field label {
    display: block;
    margin-bottom: 0.5rem;
    color: #cbd5e1;
  }

  .input-field input {
    width: 100%;
    padding: 0.75rem;
    background: #0f172a;
    border: 2px solid #475569;
    color: #fff;
    font-family: 'Courier New', monospace;
    font-size: 1rem;
    border-radius: 4px;
  }

  .input-field input:focus {
    outline: none;
    border-color: #0ea5e9;
  }

  .dialog-buttons {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    justify-content: flex-end;
  }

  .dialog-buttons button {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    font-size: 0.9rem;
  }

  .btn-confirm {
    background: #059669;
    color: #fff;
  }

  .btn-confirm:hover {
    background: #047857;
  }

  .btn-cancel {
    background: #475569;
    color: #fff;
  }

  .btn-cancel:hover {
    background: #64748b;
  }

  @media (max-width: 768px) {
    .panes-container {
      grid-template-columns: 1fr;
    }
  }
`
