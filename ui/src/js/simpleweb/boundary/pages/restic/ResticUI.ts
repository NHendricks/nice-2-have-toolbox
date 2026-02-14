/**
 * ResticUI - Main container component for Restic backup management
 * Provides a Time Machine-like interface for managing backups
 */

import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import {
  getResticState,
  saveResticState,
} from '../../../services/SessionState.js'
import '../../components/FileCompare'
import type {
  CurrentFileEntry,
  DiffStatus,
  DiffTreeEntry,
  ResticBackupProgress,
  ResticCommandHistory,
  ResticDiffResult,
  ResticFileEntry,
  ResticRepository,
  ResticRetentionPolicy,
  ResticSnapshot,
  ResticStats,
  ResticTab,
  SavedResticConnection,
  SnapshotGroup,
} from './restic.types.js'

// Obfuscation key for password storage (not cryptographically secure, but prevents plain text storage)
const OBFUSCATION_KEY = 'nh-restic-conn-key'

function obfuscatePassword(password: string): string {
  let result = ''
  for (let i = 0; i < password.length; i++) {
    result += String.fromCharCode(
      password.charCodeAt(i) ^
        OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
    )
  }
  return btoa(result)
}

function deobfuscatePassword(obfuscated: string): string {
  try {
    const decoded = atob(obfuscated)
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(
        decoded.charCodeAt(i) ^
          OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length),
      )
    }
    return result
  } catch {
    return obfuscated
  }
}

@customElement('nh-restic')
export class ResticUI extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #e2e8f0;
      background: #0f172a;
      min-height: 100vh;
    }

    .content {
      padding: 1rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #f8fafc;
    }

    .subtitle {
      color: #94a3b8;
      font-size: 0.9rem;
    }

    .repo-config {
      padding: 1rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      margin-bottom: 1rem;
    }

    .repo-form {
      display: grid;
      grid-template-columns: 1fr 200px auto;
      gap: 0.75rem;
      align-items: end;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .form-group label {
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .form-group input {
      padding: 0.5rem 0.75rem;
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.9rem;
    }

    .form-group input:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .repo-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.5rem;
      background: #0f172a;
      border-radius: 4px;
      font-size: 0.85rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .status-dot.connected {
      background: #22c55e;
    }

    .status-dot.disconnected {
      background: #ef4444;
    }

    .status-dot.warning {
      background: #f59e0b;
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px 8px 0 0;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .tab.active {
      background: #0ea5e9;
      border-color: #0ea5e9;
      color: white;
    }

    .tab-content {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 0 8px 8px 8px;
      padding: 1rem;
      min-height: 400px;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.85rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #0ea5e9;
      color: white;
    }

    .btn-primary:hover {
      background: #0284c7;
    }

    .btn-primary:disabled {
      background: #475569;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #475569;
      color: white;
    }

    .btn-secondary:hover {
      background: #64748b;
    }

    .btn-danger {
      background: #dc2626;
      color: white;
    }

    .btn-danger:hover {
      background: #b91c1c;
    }

    .btn-small {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    /* Backup Panel Styles */
    .backup-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .backup-paths {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .backup-paths h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .path-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .path-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }

    .backup-progress {
      margin-top: 1rem;
      padding: 1rem;
      background: #0f172a;
      border-radius: 8px;
    }

    .progress-bar-container {
      height: 24px;
      background: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      margin: 0.5rem 0;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #0ea5e9, #22c55e);
      border-radius: 12px;
      transition: width 0.3s ease;
    }

    .progress-bar-text {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    .progress-details {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #94a3b8;
    }

    .current-file {
      font-family: monospace;
      font-size: 0.75rem;
      color: #64748b;
      margin-top: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Browse Panel Styles */
    .browse-panel {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 1rem;
      height: 500px;
    }

    .browse-panel.diff-mode {
      display: flex;
      flex-direction: column;
      height: auto;
    }

    .browse-panel.diff-mode .timeline {
      max-height: 200px;
      margin-bottom: 1rem;
    }

    .browse-panel.diff-mode .file-browser {
      flex: 1;
      min-height: 600px;
    }

    .timeline {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .timeline h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .timeline-group {
      margin-bottom: 1rem;
    }

    .timeline-group-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #f59e0b;
      margin-bottom: 0.5rem;
      padding-left: 1.5rem;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .timeline-item:hover {
      background: #1e293b;
    }

    .timeline-item.selected {
      background: #0ea5e9;
    }

    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #475569;
      margin-top: 4px;
      flex-shrink: 0;
    }

    .timeline-item.selected .timeline-dot {
      background: white;
    }

    .timeline-info {
      flex: 1;
      min-width: 0;
    }

    .timeline-time {
      font-weight: 600;
      font-size: 0.9rem;
      color: #e2e8f0;
    }

    .timeline-paths {
      font-size: 0.75rem;
      color: #94a3b8;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-browser {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
    }

    .file-browser h3 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-bottom: 0.75rem;
      font-size: 0.85rem;
      color: #94a3b8;
      overflow-x: auto;
    }

    .breadcrumb-item {
      padding: 0.25rem 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      cursor: pointer;
      white-space: nowrap;
    }

    .breadcrumb-item:hover {
      background: #334155;
    }

    .file-list {
      flex: 1;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 4px;
    }

    .file-item {
      display: grid;
      grid-template-columns: 1fr 100px 150px;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid #0f172a;
      font-size: 0.85rem;
      cursor: pointer;
    }

    .file-item:hover {
      background: #334155;
    }

    .file-item.selected {
      background: #0ea5e9;
    }

    .file-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .file-size {
      text-align: right;
      color: #94a3b8;
    }

    .file-date {
      text-align: right;
      color: #64748b;
    }

    .file-actions {
      display: flex;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #1e293b;
      border-radius: 0 0 4px 4px;
    }

    /* Tree View Styles */
    .tree-container {
      flex: 1;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 4px;
      padding: 0.5rem 0;
    }

    .tree-node {
      user-select: none;
    }

    .tree-item {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.35rem 0.5rem;
      cursor: pointer;
      font-size: 0.85rem;
      border-radius: 2px;
    }

    .tree-item:hover {
      background: #334155;
    }

    .tree-item.directory {
      color: #e2e8f0;
    }

    .tree-item.file {
      color: #94a3b8;
    }

    .tree-toggle {
      width: 16px;
      font-size: 0.7rem;
      color: #64748b;
      flex-shrink: 0;
    }

    input[type='checkbox']:checked {
      background-color: blue;
    }

    input[type='checkbox']:checked::after {
      content: '';
      position: absolute;
      left: 4px;
      top: 0px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    input[type='checkbox'] {
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;

      width: 18px;
      height: 18px;
      border: 2px solid blue;
      border-radius: 4px;
      background-color: white;
      cursor: pointer;
      display: inline-block;
      position: relative;
    }

    .tree-icon {
      flex-shrink: 0;
    }

    .tree-name {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-size {
      color: #64748b;
      font-size: 0.75rem;
      margin-left: auto;
      padding-left: 1rem;
    }

    .tree-children {
      /* Children are indented via padding-left in renderTreeNode */
    }

    /* Timeline Diff Mode Styles */
    .diff-mode-toggle {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #0f172a;
      border-radius: 6px;
      align-items: center;
    }

    .timeline-slider-container {
      margin: 1rem 0;
      padding: 1rem;
      background: #0f172a;
      border-radius: 6px;
    }

    .timeline-slider {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      height: 8px;
      background: #475569;
      border-radius: 4px;
      outline: none;
    }

    .timeline-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: #0ea5e9;
      border-radius: 50%;
      cursor: pointer;
    }

    .timeline-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: #0ea5e9;
      border-radius: 50%;
      cursor: pointer;
      border: none;
    }

    .timeline-label {
      display: flex;
      justify-content: space-between;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .timeline-ticks {
      position: relative;
      height: 20px;
      margin-top: 0.5rem;
    }

    .timeline-tick {
      position: absolute;
      width: 12px;
      height: 12px;
      background: #475569;
      border: 2px solid #0f172a;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      cursor: pointer;
      transition: all 0.2s;
    }

    .timeline-tick:hover {
      background: #0ea5e9;
      transform: translate(-50%, -50%) scale(1.3);
    }

    .timeline-tick.active {
      background: #0ea5e9;
      box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
    }

    .timeline-tick-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.25rem 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      font-size: 0.75rem;
      color: #e2e8f0;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
      margin-bottom: 0.5rem;
    }

    .timeline-tick:hover .timeline-tick-tooltip {
      opacity: 1;
    }

    .diff-trees-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      min-height: 600px;
      height: auto;
    }

    .diff-tree-panel {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .diff-tree-panel h4 {
      margin: 0 0 0.75rem 0;
      font-size: 1rem;
      color: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .diff-stats {
      font-size: 0.75rem;
      color: #64748b;
      display: flex;
      gap: 1rem;
    }

    .diff-stat {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .diff-stat-added {
      color: #22c55e;
    }

    .diff-stat-removed {
      color: #ef4444;
    }

    .diff-stat-modified {
      color: #f59e0b;
    }

    .tree-item.diff-added {
      background: rgba(34, 197, 94, 0.1);
      border-left: 3px solid #22c55e;
    }

    .tree-item.diff-removed {
      background: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      opacity: 0.7;
      text-decoration: line-through;
    }

    .tree-item.diff-modified {
      background: rgba(245, 158, 11, 0.1);
      border-left: 3px solid #f59e0b;
    }

    .tree-item.clickable {
      cursor: pointer;
    }
    .tree-item.clickable:hover {
      background: rgba(245, 158, 11, 0.25);
    }

    .tree-item.diff-unchanged {
      opacity: 0.6;
    }

    .tree-scroll {
      flex: 1;
      overflow-y: auto;
      background: #1e293b;
      border-radius: 4px;
      padding: 0.5rem;
    }

    /* Retention Panel Styles */
    .retention-panel {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .retention-config {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .retention-config h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    .retention-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .retention-field label {
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .retention-field input {
      width: 80px;
      padding: 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      text-align: center;
    }

    .retention-preview {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .retention-preview h3 {
      margin: 0 0 1rem 0;
      font-size: 1rem;
      color: #e2e8f0;
    }

    /* Health Panel Styles */
    .health-panel {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .health-card {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .health-card h3 {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .health-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #22c55e;
    }

    .health-actions {
      grid-column: span 3;
      display: flex;
      gap: 1rem;
    }

    /* History Panel Styles */
    .history-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .history-entry {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      border-left: 4px solid;
    }

    .history-entry.success {
      border-left-color: #22c55e;
    }

    .history-entry.error {
      border-left-color: #ef4444;
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .history-operation {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      flex: 1;
      overflow-x: auto;
    }

    .history-operation code {
      color: #e2e8f0;
      background: #1e293b;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      white-space: nowrap;
    }

    .history-icon {
      font-weight: bold;
      font-size: 1.2rem;
    }

    .history-entry.success .history-icon {
      color: #22c55e;
    }

    .history-entry.error .history-icon {
      color: #ef4444;
    }

    .history-meta {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.85rem;
      color: #94a3b8;
    }

    .history-time {
      color: #64748b;
    }

    .history-duration {
      color: #0ea5e9;
      font-family: monospace;
    }

    .history-params {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .param-tag {
      background: #1e293b;
      color: #94a3b8;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: monospace;
    }

    .history-output,
    .history-error {
      margin-top: 0.5rem;
      padding: 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      font-size: 0.85rem;
      font-family: monospace;
    }

    .history-output {
      color: #94a3b8;
    }

    .history-error {
      color: #fca5a5;
      background: #7f1d1d;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid #0ea5e9;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .message {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .message.success {
      background: #14532d;
      color: #86efac;
      border: 1px solid #22c55e;
    }

    .message.error {
      background: #7f1d1d;
      color: #fca5a5;
      border: 1px solid #ef4444;
    }

    .message.info {
      background: #1e3a5f;
      color: #93c5fd;
      border: 1px solid #3b82f6;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #64748b;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .not-installed {
      padding: 2rem;
      text-align: center;
    }

    .not-installed h2 {
      color: #f59e0b;
      margin-bottom: 1rem;
    }

    .not-installed p {
      color: #94a3b8;
      margin-bottom: 1rem;
    }

    .not-installed a {
      color: #0ea5e9;
    }

    /* Compare Panel Styles */
    .compare-panel {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .compare-selectors {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 1rem;
      align-items: start;
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
    }

    .compare-selector {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .compare-selector h4 {
      margin: 0;
      font-size: 0.9rem;
      color: #94a3b8;
    }

    .compare-selector select {
      padding: 0.5rem;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      color: #e2e8f0;
      font-size: 0.85rem;
    }

    .compare-selector select:focus {
      outline: none;
      border-color: #0ea5e9;
    }

    .compare-arrow {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      color: #64748b;
      padding-top: 1.5rem;
    }

    .compare-actions {
      display: flex;
      justify-content: center;
    }

    .diff-results {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .diff-section {
      background: #0f172a;
      border-radius: 8px;
      padding: 1rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .diff-section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .diff-section.added h4 {
      color: #22c55e;
    }

    .diff-section.removed h4 {
      color: #ef4444;
    }

    .diff-section.modified h4 {
      color: #f59e0b;
    }

    .diff-count {
      font-size: 0.75rem;
      padding: 0.15rem 0.5rem;
      border-radius: 10px;
      background: currentColor;
      color: #0f172a;
      font-weight: 700;
    }

    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .diff-item {
      font-family: monospace;
      font-size: 0.8rem;
      padding: 0.25rem 0.5rem;
      background: #1e293b;
      border-radius: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diff-item.added {
      border-left: 3px solid #22c55e;
    }

    .diff-item.removed {
      border-left: 3px solid #ef4444;
    }

    .diff-item.modified {
      border-left: 3px solid #f59e0b;
    }

    .compare-summary {
      display: flex;
      gap: 2rem;
      justify-content: center;
      padding: 1rem;
      background: #0f172a;
      border-radius: 8px;
    }

    .summary-stat {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .summary-stat.added {
      color: #22c55e;
    }

    .summary-stat.removed {
      color: #ef4444;
    }

    .summary-stat.modified {
      color: #f59e0b;
    }

    .summary-stat .count {
      font-weight: 700;
      font-size: 1.25rem;
    }
  `

  @state() private activeTab: ResticTab = 'backup'
  @state() private repository: ResticRepository | null = null
  @state() private repoPath: string = ''
  @state() private repoPassword: string = ''
  @state() private snapshots: ResticSnapshot[] = []
  @state() private selectedSnapshot: ResticSnapshot | null = null
  @state() private browseEntries: ResticFileEntry[] = []
  @state() private browsePath: string = '/'
  @state() private isLoading: boolean = false
  @state() private loadingMessage: string = ''
  @state() private message: {
    type: 'success' | 'error' | 'info'
    text: string
  } | null = null
  @state() private resticInstalled: boolean | null = null
  @state() private resticVersion: string = ''

  // Backup state
  @state() private backupPaths: string[] = []
  @state() private backupProgress: ResticBackupProgress | null = null
  @state() private isBackingUp: boolean = false

  // Stats
  @state() private stats: ResticStats | null = null

  // Retention policy
  @state() private retentionPolicy: ResticRetentionPolicy = {
    keepLast: 5,
    keepDaily: 7,
    keepWeekly: 4,
    keepMonthly: 12,
    keepYearly: 2,
  }

  // Compare state
  @state() private compareSnapshot1: ResticSnapshot | null = null
  @state() private compareSnapshot2: ResticSnapshot | null = null
  @state() private diffResult: ResticDiffResult | null = null
  @state() private isComparing: boolean = false

  // Saved connections
  @state() private savedConnections: SavedResticConnection[] = []
  @state() private connectionName: string = ''

  // Tree view state for file browser
  @state() private expandedPaths: Set<string> = new Set()
  @state() private selectedFiles: Set<string> = new Set()

  // Command history
  @state() private commandHistory: ResticCommandHistory[] = []
  private readonly MAX_HISTORY_ENTRIES = 100 // Maximum number of history entries to keep

  // Timeline diff mode state
  @state() private timelineDiffMode: boolean = false
  @state() private timelineDiffSnapshot: ResticSnapshot | null = null
  @state() private timelineDiffResult: {
    snapshotTree: Map<string, ResticFileEntry[]>
    currentFsTree: Map<string, DiffTreeEntry[]>
    comparison: {
      added: Set<string>
      removed: Set<string>
      modified: Set<string>
      unchanged: Set<string>
    }
  } | null = null
  @state() private timelineSliderPosition: number = 0
  @state() private isDiffLoading: boolean = false
  @state() private diffFileCompare: {
    leftPath: string
    rightPath: string
  } | null = null
  private sliderDebounceTimer: any = null

  connectedCallback() {
    super.connectedCallback()
    this.checkResticInstalled()
    this.loadSavedConnections()

    // Restore session state
    const savedState = getResticState()
    if (savedState.activeTab) this.activeTab = savedState.activeTab as ResticTab
    if (savedState.repoPath) this.repoPath = savedState.repoPath
    if (savedState.repoPassword) this.repoPassword = savedState.repoPassword
    if (savedState.backupPaths) this.backupPaths = savedState.backupPaths
    if (savedState.connectionName)
      this.connectionName = savedState.connectionName
    if (savedState.retentionPolicy) {
      this.retentionPolicy = {
        ...this.retentionPolicy,
        ...savedState.retentionPolicy,
      }
    }
    // Repository and snapshots
    if (savedState.repository) this.repository = savedState.repository
    if (savedState.snapshots) this.snapshots = savedState.snapshots
    if (savedState.selectedSnapshot)
      this.selectedSnapshot = savedState.selectedSnapshot
    if (savedState.browseEntries) this.browseEntries = savedState.browseEntries
    if (savedState.browsePath) this.browsePath = savedState.browsePath
    if (savedState.stats) this.stats = savedState.stats
    // Comparison state
    if (savedState.compareSnapshot1)
      this.compareSnapshot1 = savedState.compareSnapshot1
    if (savedState.compareSnapshot2)
      this.compareSnapshot2 = savedState.compareSnapshot2
    if (savedState.diffResult) this.diffResult = savedState.diffResult
    // File browser state
    if (savedState.expandedPaths)
      this.expandedPaths = new Set(savedState.expandedPaths)
    if (savedState.selectedFiles)
      this.selectedFiles = new Set(savedState.selectedFiles)
    // Timeline diff mode state
    if (savedState.timelineDiffMode) {
      this.timelineDiffMode = savedState.timelineDiffMode
    }
    if (savedState.timelineDiffSnapshot) {
      this.timelineDiffSnapshot = savedState.timelineDiffSnapshot
    }
    if (savedState.timelineDiffResult) {
      // Reconstruct Maps from serialized arrays and Sets from arrays
      const comp = savedState.timelineDiffResult.comparison
      this.timelineDiffResult = {
        snapshotTree: new Map(savedState.timelineDiffResult.snapshotTree),
        currentFsTree: new Map(savedState.timelineDiffResult.currentFsTree),
        comparison: {
          added: new Set(comp.added),
          removed: new Set(comp.removed),
          modified: new Set(comp.modified),
          unchanged: new Set(comp.unchanged),
        },
      }
    }
    if (savedState.timelineSliderPosition !== undefined) {
      this.timelineSliderPosition = savedState.timelineSliderPosition
    }

    // Set default repository path if none exists
    if (!this.repoPath) {
      // Fire and forget - will set path asynchronously
      this.setDefaultRepositoryPath().catch((err) =>
        console.error('[ResticUI] Failed to set default path:', err),
      )
    }

    // Listen for backup progress events
    // Note: preload strips the event, so we only receive the data
    ;(window as any).electron?.ipcRenderer?.on(
      'restic-backup-progress',
      (data: any) => {
        console.log('[Restic] Progress received:', data)
        this.backupProgress = data
        this.requestUpdate()
      },
    )
  }

  private async setDefaultRepositoryPath() {
    // Get the actual user home directory from the main process
    try {
      const homePath = await (window as any).electron.ipcRenderer.invoke(
        'get-home-path',
      )
      const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0
      if (isWindows) {
        this.repoPath = `${homePath}\\backup_restic`
      } else {
        this.repoPath = `${homePath}/backup_restic`
      }
      console.log('[ResticUI] Set default repository path:', this.repoPath)
    } catch (error) {
      console.error('[ResticUI] Failed to get home path:', error)
      // Fallback to generic path
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
      const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0

      if (isMac) {
        this.repoPath = '/Users/user/backup_restic'
      } else if (isWindows) {
        this.repoPath = 'C:/Users/user/backup_restic'
      } else {
        // Linux
        this.repoPath = '/home/user/backup_restic'
      }
      console.log('[ResticUI] Set fallback repository path:', this.repoPath)
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    // Save session state when navigating away
    saveResticState({
      activeTab: this.activeTab,
      repoPath: this.repoPath,
      repoPassword: this.repoPassword,
      backupPaths: this.backupPaths,
      connectionName: this.connectionName,
      retentionPolicy: {
        keepLast: this.retentionPolicy.keepLast,
        keepHourly: this.retentionPolicy.keepHourly,
        keepDaily: this.retentionPolicy.keepDaily,
        keepWeekly: this.retentionPolicy.keepWeekly,
        keepMonthly: this.retentionPolicy.keepMonthly,
        keepYearly: this.retentionPolicy.keepYearly,
      },
      // Repository and snapshots
      repository: this.repository,
      snapshots: this.snapshots,
      selectedSnapshot: this.selectedSnapshot,
      browseEntries: this.browseEntries,
      browsePath: this.browsePath,
      stats: this.stats,
      // Comparison state
      compareSnapshot1: this.compareSnapshot1,
      compareSnapshot2: this.compareSnapshot2,
      diffResult: this.diffResult,
      // File browser state
      expandedPaths: Array.from(this.expandedPaths),
      selectedFiles: Array.from(this.selectedFiles),
    })
  }

  private loadSavedConnections() {
    try {
      const saved = localStorage.getItem('restic-connections')
      if (saved) {
        this.savedConnections = JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load saved restic connections:', error)
      this.savedConnections = []
    }
  }

  private persistSavedConnections() {
    localStorage.setItem(
      'restic-connections',
      JSON.stringify(this.savedConnections),
    )
  }

  private saveCurrentConnection() {
    if (!this.connectionName.trim()) {
      this.showMessage('error', 'Please enter a connection name')
      return
    }
    if (!this.repoPath) {
      this.showMessage('error', 'Please enter a repository path')
      return
    }
    if (!this.repoPassword) {
      this.showMessage('error', 'Please enter a password')
      return
    }

    const connection: SavedResticConnection = {
      name: this.connectionName.trim(),
      repoPath: this.repoPath,
      passwordObfuscated: obfuscatePassword(this.repoPassword),
      backupPaths:
        this.backupPaths.length > 0 ? [...this.backupPaths] : undefined,
    }

    // Check if connection with same name exists
    const existingIndex = this.savedConnections.findIndex(
      (c) => c.name === connection.name,
    )
    if (existingIndex >= 0) {
      this.savedConnections[existingIndex] = connection
    } else {
      this.savedConnections = [...this.savedConnections, connection]
    }

    this.persistSavedConnections()
    this.showMessage('success', `Connection "${connection.name}" saved`)
    this.connectionName = ''
  }

  private loadConnection(connection: SavedResticConnection) {
    this.repoPath = connection.repoPath
    this.repoPassword = deobfuscatePassword(connection.passwordObfuscated)
    this.connectionName = connection.name
    // Restore saved backup paths
    if (connection.backupPaths?.length) {
      this.backupPaths = [...connection.backupPaths]
    }
  }

  private deleteConnection(name: string, event: Event) {
    event.stopPropagation()
    this.savedConnections = this.savedConnections.filter((c) => c.name !== name)
    this.persistSavedConnections()
    this.showMessage('info', `Connection "${name}" deleted`)
  }

  private updateConnectionBackupPaths() {
    // Auto-save backup paths to the current connection (if one is loaded)
    if (!this.connectionName) return
    const index = this.savedConnections.findIndex(
      (c) => c.name === this.connectionName,
    )
    if (index >= 0) {
      this.savedConnections[index] = {
        ...this.savedConnections[index],
        backupPaths:
          this.backupPaths.length > 0 ? [...this.backupPaths] : undefined,
      }
      this.persistSavedConnections()
    }
  }

  private async exportConnections() {
    if (this.savedConnections.length === 0) {
      this.showMessage('error', 'No connections to export')
      return
    }

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-save-dialog',
        {
          title: 'Export Restic Connections',
          defaultPath: 'restic-connections.json',
          filters: [{ name: 'JSON', extensions: ['json'] }],
        },
      )

      if (response.success && !response.canceled && response.filePath) {
        // Write connections to file via backend
        const writeResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: 'write-file',
            filePath: response.filePath,
            content: JSON.stringify(this.savedConnections, null, 2),
          },
        )

        if (writeResponse.success) {
          this.showMessage(
            'success',
            `Exported ${this.savedConnections.length} connections`,
          )
        } else {
          this.showMessage('error', writeResponse.error || 'Failed to export')
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private async importConnections() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          title: 'Import Restic Connections',
          filters: [{ name: 'JSON', extensions: ['json'] }],
          properties: ['openFile'],
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        // Read connections from file via backend
        const readResponse = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          {
            operation: 'read',
            filePath: response.filePaths[0],
          },
        )

        if (readResponse.success && readResponse.data?.content) {
          const imported = JSON.parse(
            readResponse.data.content,
          ) as SavedResticConnection[]

          if (!Array.isArray(imported)) {
            this.showMessage('error', 'Invalid file format')
            return
          }

          // Merge with existing connections (skip duplicates by name)
          let addedCount = 0
          for (const conn of imported) {
            if (conn.name && conn.repoPath && conn.passwordObfuscated) {
              const exists = this.savedConnections.some(
                (c) => c.name === conn.name,
              )
              if (!exists) {
                this.savedConnections = [...this.savedConnections, conn]
                addedCount++
              }
            }
          }

          this.persistSavedConnections()
          this.showMessage('success', `Imported ${addedCount} new connections`)
        } else {
          this.showMessage('error', readResponse.error || 'Failed to read file')
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private async checkResticInstalled() {
    try {
      const response = await this.invokeRestic({ operation: 'check-installed' })
      if (response.success && response.data) {
        this.resticInstalled = response.data.installed
        this.resticVersion = response.data.version || ''
      }
    } catch (error) {
      this.resticInstalled = false
    }
  }

  private async invokeRestic(params: any): Promise<any> {
    const commandId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const startTime = Date.now()

    // Sanitize params for history (remove sensitive data)
    const sanitizedParams = {
      ...params,
      password: params.password ? '***' : undefined,
      repoPath: params.repoPath || this.repoPath,
    }

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'restic',
        {
          ...params,
          repoPath: params.repoPath || this.repoPath,
          password: params.password || this.repoPassword,
        },
      )

      const duration = Date.now() - startTime
      const success = response?.success !== false

      // Extract command line from response
      const commandLine =
        response?.data?.commandLine || response?.commandLine || undefined

      // Add to command history
      this.addCommandToHistory({
        id: commandId,
        timestamp: new Date(startTime),
        operation: params.operation || 'unknown',
        commandLine,
        params: sanitizedParams,
        success,
        duration,
        output: this.formatCommandOutput(response),
        error: success ? undefined : response?.error || 'Unknown error',
      })

      return response
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Add failed command to history
      this.addCommandToHistory({
        id: commandId,
        timestamp: new Date(startTime),
        operation: params.operation || 'unknown',
        params: sanitizedParams,
        success: false,
        duration,
        error: error.message || 'Unknown error',
      })

      throw error
    }
  }

  private addCommandToHistory(entry: ResticCommandHistory) {
    // Add new entry at the beginning
    this.commandHistory = [entry, ...this.commandHistory].slice(
      0,
      this.MAX_HISTORY_ENTRIES,
    )
  }

  private formatCommandOutput(response: any): string | undefined {
    if (!response) return undefined

    // Try to create a readable summary of the response
    if (response.data) {
      const data = response.data
      if (data.snapshots) return `Found ${data.snapshots.length} snapshots`
      if (data.entries) return `Listed ${data.entries.length} entries`
      if (data.summary)
        return `${data.summary.total_files_processed || 0} files processed`
      if (data.stats)
        return `Total size: ${this.formatSize(data.stats.total_size || 0)}`
      if (typeof data === 'string') return data.substring(0, 500)
    }

    if (response.message) return response.message.substring(0, 500)
    if (response.success) return 'Command completed successfully'

    return undefined
  }

  private async connectRepository() {
    if (!this.repoPath || !this.repoPassword) {
      this.showMessage('error', 'Please enter repository path and password')
      return
    }

    this.isLoading = true
    this.loadingMessage = 'Connecting to repository...'

    try {
      // Try to get snapshots to verify connection
      const response = await this.invokeRestic({ operation: 'snapshots' })
      const result = response.data || response

      console.log('[ResticUI] Connect response:', response)
      console.log('[ResticUI] Connect result:', result)

      // Check both IPC success AND restic command success
      // Only connect if BOTH are successful
      if (response.success && result.success) {
        this.repository = {
          path: this.repoPath,
          password: this.repoPassword,
          isInitialized: true,
        }
        this.snapshots = result.snapshots || []
        // Always load all unique backup paths from ALL snapshots
        if (this.snapshots.length > 0) {
          // Collect all unique paths from all snapshots
          const allPaths = new Set<string>()
          for (const snapshot of this.snapshots) {
            if (snapshot.paths?.length) {
              snapshot.paths.forEach((p: string) => allPaths.add(p))
            }
          }
          if (allPaths.size > 0) {
            this.backupPaths = Array.from(allPaths).sort()
          }
        }
        this.showMessage(
          'success',
          `Connected! Found ${this.snapshots.length} snapshots.`,
        )
        await this.loadStats()
      } else {
        // Connection failed - do NOT set this.repository
        this.repository = null
        const errorMsg = result.error || response.error || 'Failed to connect'
        // Check if repository needs initialization
        if (
          errorMsg.includes('does not exist') ||
          errorMsg.includes('unable to open')
        ) {
          this.showMessage(
            'info',
            'Repository not found. Click "Initialize" to create a new one.',
          )
        } else if (
          errorMsg.includes('wrong password') ||
          errorMsg.includes('no key found')
        ) {
          this.showMessage(
            'error',
            'Wrong password. Please check your credentials.',
          )
        } else {
          this.showMessage('error', errorMsg)
        }
      }
    } catch (error: any) {
      this.repository = null
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async initRepository() {
    if (!this.repoPath || !this.repoPassword) {
      this.showMessage('error', 'Please enter repository path and password')
      return
    }

    this.isLoading = true
    this.loadingMessage = 'Checking if safe to initialize...'

    try {
      // First check if the path is safe for initialization
      const safeCheck = await this.invokeRestic({
        operation: 'check-init-safe',
      })
      if (safeCheck.success && safeCheck.data && !safeCheck.data.safe) {
        this.showMessage(
          'error',
          `Cannot initialize: folder contains ${safeCheck.data.fileCount} files. Use an empty folder or connect to existing repository.`,
        )
        this.isLoading = false
        this.loadingMessage = ''
        return
      }

      this.loadingMessage = 'Initializing repository...'
      const response = await this.invokeRestic({ operation: 'init' })
      const result = response.data || response

      console.log('[ResticUI] Init response:', response)
      console.log('[ResticUI] Init result:', result)

      // Check both IPC success AND restic command success
      if (response.success && result.success) {
        this.repository = {
          path: this.repoPath,
          password: this.repoPassword,
          isInitialized: true,
        }
        this.snapshots = []
        // Clear connection name so user can save as new connection
        // but preserve backupPaths from previous connection
        this.connectionName = ''
        this.showMessage('success', 'Repository initialized successfully!')
      } else {
        const errorMsg =
          result.error || response.error || 'Failed to initialize repository'
        this.showMessage('error', errorMsg)
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async loadSnapshots() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Loading snapshots...'

    try {
      const response = await this.invokeRestic({ operation: 'snapshots' })
      if (response.success) {
        this.snapshots = response.data?.snapshots || []
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async loadStats() {
    if (!this.repository) return

    try {
      const response = await this.invokeRestic({ operation: 'stats' })
      if (response.success) {
        this.stats = response.data?.stats
      }
    } catch (error: any) {
      console.error('Failed to load stats:', error)
    }
  }

  private async selectFolder() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory'],
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        const newPath = response.filePaths[0]
        if (!this.backupPaths.includes(newPath)) {
          this.backupPaths = [...this.backupPaths, newPath]
          this.updateConnectionBackupPaths()
        }
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    }
  }

  private removePath(path: string) {
    this.backupPaths = this.backupPaths.filter((p) => p !== path)
    this.updateConnectionBackupPaths()
  }

  private async startBackup() {
    if (!this.repository || this.backupPaths.length === 0) {
      this.showMessage('error', 'Please select folders to backup')
      return
    }

    this.isBackingUp = true
    this.backupProgress = null

    try {
      const response = await this.invokeRestic({
        operation: 'backup',
        paths: this.backupPaths,
      })

      if (response.success) {
        this.showMessage('success', 'Backup completed successfully!')
        await this.loadSnapshots()
        await this.loadStats()
      } else {
        this.showMessage('error', response.error || 'Backup failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isBackingUp = false
      this.backupProgress = null
    }
  }

  private async selectSnapshot(snapshot: ResticSnapshot) {
    this.selectedSnapshot = snapshot
    this.browsePath = '/'
    await this.loadSnapshotFiles()
  }

  private async loadSnapshotFiles() {
    if (!this.selectedSnapshot) return

    this.isLoading = true
    this.loadingMessage = 'Loading files...'

    try {
      // Don't pass a path - get ALL files recursively for tree view
      const response = await this.invokeRestic({
        operation: 'ls',
        snapshotId: this.selectedSnapshot.short_id || this.selectedSnapshot.id,
        // No path = get all files recursively
      })

      if (response.success) {
        this.browseEntries = response.data?.entries || []
        // Build tree and auto-expand single-child paths
        const tree = this.buildFileTree(this.browseEntries)
        const rootEntries = this.getRootEntries(tree)
        this.expandedPaths = this.computeAutoExpandPaths(tree, rootEntries)
        // Reset file selection
        this.selectedFiles = new Set()
      } else {
        this.showMessage('error', response.error || 'Failed to load files')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async navigateToPath(path: string) {
    this.browsePath = path
    await this.loadSnapshotFiles()
  }

  private toggleFileSelection(path: string, event: Event) {
    event.stopPropagation()
    const newSelected = new Set(this.selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    this.selectedFiles = newSelected
  }

  private toggleDirectorySelection(
    path: string,
    tree: Map<string, ResticFileEntry[]>,
    event: Event,
  ) {
    event.stopPropagation()
    const newSelected = new Set(this.selectedFiles)
    const isCurrentlySelected = newSelected.has(path)

    // Get all paths within this directory (recursively)
    const allPaths = this.getAllPathsInDirectory(path, tree)

    if (isCurrentlySelected) {
      // Deselect the directory and all its contents
      newSelected.delete(path)
      allPaths.forEach((p) => newSelected.delete(p))
    } else {
      // Select the directory and all its contents
      newSelected.add(path)
      allPaths.forEach((p) => newSelected.add(p))
    }

    this.selectedFiles = newSelected
  }

  private getAllPathsInDirectory(
    dirPath: string,
    tree: Map<string, ResticFileEntry[]>,
  ): string[] {
    const paths: string[] = []
    const children = tree.get(dirPath) || []

    for (const child of children) {
      paths.push(child.path)
      if (child.type === 'dir') {
        // Recursively get paths from subdirectories
        paths.push(...this.getAllPathsInDirectory(child.path, tree))
      }
    }

    return paths
  }

  private isDirectoryPartiallySelected(
    dirPath: string,
    tree: Map<string, ResticFileEntry[]>,
  ): boolean {
    const allPaths = this.getAllPathsInDirectory(dirPath, tree)
    if (allPaths.length === 0) return false

    const selectedCount = allPaths.filter((p) =>
      this.selectedFiles.has(p),
    ).length

    // Partially selected if some but not all children are selected
    return selectedCount > 0 && selectedCount < allPaths.length
  }

  private async restoreAll() {
    if (!this.selectedSnapshot) return

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select restore destination',
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        this.isLoading = true
        this.loadingMessage = 'Restoring files...'

        const restoreResponse = await this.invokeRestic({
          operation: 'restore',
          snapshotId:
            this.selectedSnapshot.short_id || this.selectedSnapshot.id,
          targetPath: response.filePaths[0],
        })

        if (restoreResponse.success) {
          this.showMessage(
            'success',
            `Files restored to ${response.filePaths[0]}`,
          )
        } else {
          this.showMessage('error', restoreResponse.error || 'Restore failed')
        }

        this.isLoading = false
        this.loadingMessage = ''
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
      this.isLoading = false
    }
  }

  private async restoreSelectedFiles() {
    if (!this.selectedSnapshot || this.selectedFiles.size === 0) return

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select restore destination',
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        this.isLoading = true
        this.loadingMessage = `Restoring ${this.selectedFiles.size} files...`

        const restoreResponse = await this.invokeRestic({
          operation: 'restore',
          snapshotId:
            this.selectedSnapshot.short_id || this.selectedSnapshot.id,
          targetPath: response.filePaths[0],
          includePaths: Array.from(this.selectedFiles),
        })

        if (restoreResponse.success) {
          this.showMessage(
            'success',
            `${this.selectedFiles.size} files restored to ${response.filePaths[0]}`,
          )
          this.selectedFiles = new Set()
        } else {
          this.showMessage('error', restoreResponse.error || 'Restore failed')
        }

        this.isLoading = false
        this.loadingMessage = ''
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
      this.isLoading = false
    }
  }

  private async applyRetentionPolicy() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Applying retention policy...'

    try {
      const response = await this.invokeRestic({
        operation: 'forget',
        policy: this.retentionPolicy,
        prune: true,
      })

      if (response.success) {
        this.showMessage('success', 'Retention policy applied successfully')
        await this.loadSnapshots()
        await this.loadStats()
      } else {
        this.showMessage(
          'error',
          response.error || 'Failed to apply retention policy',
        )
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runCheck() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Checking repository...'

    try {
      const response = await this.invokeRestic({ operation: 'check' })

      if (response.success && response.data?.success) {
        this.showMessage('success', 'Repository check passed!')
      } else {
        this.showMessage(
          'error',
          response.data?.error || response.error || 'Check failed',
        )
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runPrune() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Pruning repository...'

    try {
      const response = await this.invokeRestic({ operation: 'prune' })

      if (response.success) {
        this.showMessage('success', 'Repository pruned successfully')
        await this.loadStats()
      } else {
        this.showMessage('error', response.error || 'Prune failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async runUnlock() {
    if (!this.repository) return

    this.isLoading = true
    this.loadingMessage = 'Unlocking repository...'

    try {
      const response = await this.invokeRestic({ operation: 'unlock' })

      if (response.success) {
        this.showMessage('success', 'Repository unlocked')
      } else {
        this.showMessage('error', response.error || 'Unlock failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isLoading = false
      this.loadingMessage = ''
    }
  }

  private async compareSnapshots() {
    if (!this.compareSnapshot1 || !this.compareSnapshot2) {
      this.showMessage('error', 'Please select two snapshots to compare')
      return
    }

    if (this.compareSnapshot1.id === this.compareSnapshot2.id) {
      this.showMessage('error', 'Please select two different snapshots')
      return
    }

    this.isComparing = true
    this.diffResult = null

    try {
      const response = await this.invokeRestic({
        operation: 'diff',
        snapshotId1: this.compareSnapshot1.short_id || this.compareSnapshot1.id,
        snapshotId2: this.compareSnapshot2.short_id || this.compareSnapshot2.id,
      })

      if (response.success && response.data?.diff) {
        const diff = response.data.diff
        this.diffResult = diff
        const total =
          diff.summary.addedCount +
          diff.summary.removedCount +
          diff.summary.modifiedCount
        this.showMessage(
          'success',
          `Comparison complete: ${total} changes found`,
        )
      } else {
        this.showMessage('error', response.error || 'Comparison failed')
      }
    } catch (error: any) {
      this.showMessage('error', error.message)
    } finally {
      this.isComparing = false
    }
  }

  /**
   * Toggle between normal browse mode and timeline diff mode
   */
  private async toggleDiffMode() {
    this.timelineDiffMode = !this.timelineDiffMode

    if (this.timelineDiffMode) {
      // Entering diff mode - ensure snapshots are loaded
      if (this.snapshots.length === 0) {
        // Load snapshots first if not already loaded
        await this.loadSnapshots()
      }

      // Set slider to most recent snapshot and load comparison
      if (this.snapshots.length > 0) {
        this.timelineSliderPosition = 0 // Most recent is at index 0
        const snapshot = this.snapshots[0]
        await this.loadTimelineSnapshot(snapshot)
      } else {
        this.showMessage('error', 'No snapshots available for comparison')
        this.timelineDiffMode = false // Exit diff mode if no snapshots
      }
    } else {
      // Exiting diff mode - clear diff data
      this.timelineDiffResult = null
      this.timelineDiffSnapshot = null
    }

    saveResticState({ timelineDiffMode: this.timelineDiffMode })
  }

  /**
   * Handle timeline slider input (debounced)
   */
  private handleTimelineSlider(e: Event) {
    const position = parseInt((e.target as HTMLInputElement).value)
    this.timelineSliderPosition = position

    // Debounce: use setTimeout to avoid too many updates while dragging
    if (this.sliderDebounceTimer) {
      clearTimeout(this.sliderDebounceTimer)
    }

    this.sliderDebounceTimer = setTimeout(() => {
      const snapshot = this.snapshots[position]
      if (snapshot) {
        this.loadTimelineSnapshot(snapshot)
      }
    }, 300) // 300ms debounce
  }

  /**
   * Load a snapshot for timeline diff comparison
   */
  private async loadTimelineSnapshot(snapshot: ResticSnapshot) {
    this.timelineDiffSnapshot = snapshot
    this.isDiffLoading = true

    try {
      // 1. Load snapshot files
      const snapshotResult = await this.invokeRestic({
        operation: 'ls',
        snapshotId: snapshot.short_id || snapshot.id,
      })

      if (!snapshotResult.success) {
        throw new Error(snapshotResult.error || 'Failed to load snapshot files')
      }

      // 2. Load current filesystem files
      const currentFsResult = await this.invokeRestic({
        operation: 'list-current-fs',
        paths: snapshot.paths, // Compare same paths that were backed up
      })

      if (!currentFsResult.success) {
        throw new Error(
          currentFsResult.error || 'Failed to load current filesystem',
        )
      }

      // 3. Build trees and compute diff
      const snapshotEntries: ResticFileEntry[] =
        snapshotResult.data?.entries || []
      const currentEntries: CurrentFileEntry[] =
        currentFsResult.data?.entries || []

      // Normalize Restic paths (/C/Users/... -> C:/Users/...) for consistent tree structure
      const normalizedSnapshotEntries = snapshotEntries.map((e) => ({
        ...e,
        path: this.normalizeResticPath(e.path),
      }))

      // Filter snapshot entries: only keep entries STRICTLY INSIDE the backed-up paths
      // restic ls returns ancestor dirs (/D, /D/SynologyDrive) AND the backup path
      // dir itself, but the current FS scan only returns CONTENTS of the backup path.
      // Filter to only contents so both trees show the same level.
      const backupPathsNormalized = snapshot.paths.map((p) =>
        this.normalizePathForComparison(this.normalizeResticPath(p)),
      )
      const filteredSnapshotEntries = normalizedSnapshotEntries.filter((e) => {
        const normalized = this.normalizePathForComparison(e.path)
        return backupPathsNormalized.some((bp) =>
          normalized.startsWith(bp + '/'),
        )
      })

      const snapshotTree = this.buildFileTree(filteredSnapshotEntries)
      const currentFsTree = this.buildCurrentFileTree(currentEntries)

      const comparison = this.computeDiff(
        filteredSnapshotEntries,
        currentEntries,
      )

      this.timelineDiffResult = {
        snapshotTree,
        currentFsTree,
        comparison,
      }

      saveResticState({
        timelineDiffSnapshot: snapshot,
        timelineDiffResult: {
          snapshotTree: Array.from(snapshotTree.entries()),
          currentFsTree: Array.from(currentFsTree.entries()),
          comparison: {
            added: Array.from(comparison.added),
            removed: Array.from(comparison.removed),
            modified: Array.from(comparison.modified),
            unchanged: Array.from(comparison.unchanged),
          },
        },
      })
    } catch (error: any) {
      this.showMessage('error', `Failed to load timeline: ${error.message}`)
    } finally {
      this.isDiffLoading = false
    }
  }

  /**
   * Select a snapshot by index (for clicking on timeline ticks)
   */
  private selectSnapshotByIndex(index: number) {
    this.timelineSliderPosition = index
    const snapshot = this.snapshots[index]
    if (snapshot) {
      this.loadTimelineSnapshot(snapshot)
    }
  }

  private showMessage(type: 'success' | 'error' | 'info', text: string) {
    this.message = { type, text }
    setTimeout(() => {
      this.message = null
    }, 5000)
  }

  private formatSize(bytes: number): string {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i]
  }

  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return date.toLocaleString()
    } catch {
      return dateStr
    }
  }

  private formatTime(dateStr: string): string {
    try {
      const date = new Date(dateStr)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return dateStr
    }
  }

  private groupSnapshots(): SnapshotGroup[] {
    const groups: Map<string, SnapshotGroup> = new Map()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    for (const snapshot of this.snapshots) {
      const date = new Date(snapshot.time)
      date.setHours(0, 0, 0, 0)

      let label: string
      if (date.getTime() === today.getTime()) {
        label = 'Today'
      } else if (date.getTime() === yesterday.getTime()) {
        label = 'Yesterday'
      } else {
        label = date.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      }

      if (!groups.has(label)) {
        groups.set(label, { label, date, snapshots: [] })
      }
      groups.get(label)!.snapshots.push(snapshot)
    }

    // Sort groups by date descending, then sort snapshots within each group
    return Array.from(groups.values())
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map((group) => ({
        ...group,
        snapshots: group.snapshots.sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
        ),
      }))
  }

  private getBreadcrumbs(): string[] {
    if (this.browsePath === '/') return ['/']
    const parts = this.browsePath.split('/').filter((p) => p)
    return ['/', ...parts]
  }

  // Tree node interface for file browser
  private getParentPath(path: string): string {
    // Handle both Windows (C:\foo\bar) and Unix (/foo/bar) paths
    // Normalize to forward slashes for consistency
    const normalized = path.replace(/\\/g, '/')

    // Handle Windows drive roots like C:/ - they have no parent (return empty string)
    if (/^[A-Za-z]:\/$/.test(normalized)) {
      return ''
    }

    const lastSlash = normalized.lastIndexOf('/')

    // Handle Unix root /
    if (normalized === '/') return ''

    // Handle paths with no slashes
    if (lastSlash <= 0) return '/'

    // Handle files directly in drive root like C:/file
    if (lastSlash === 2 && normalized[1] === ':') {
      // Path like C:/file - parent is C:/
      return normalized.substring(0, 3)
    }
    return normalized.substring(0, lastSlash)
  }

  private buildFileTree(
    entries: ResticFileEntry[],
  ): Map<string, ResticFileEntry[]> {
    // Group entries by their parent directory
    const tree = new Map<string, ResticFileEntry[]>()

    for (const entry of entries) {
      // Normalize path for consistent handling
      const normalizedPath = entry.path.replace(/\\/g, '/')
      const parentPath = this.getParentPath(normalizedPath)

      if (!tree.has(parentPath)) {
        tree.set(parentPath, [])
      }
      // Store entry with normalized path
      tree.get(parentPath)!.push({ ...entry, path: normalizedPath })
    }

    // Sort each directory's children (folders first, then alphabetically)
    tree.forEach((children, _path) => {
      children.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        return a.name.localeCompare(b.name)
      })
    })

    return tree
  }

  private toggleTreeNode(path: string) {
    const newExpanded = new Set(this.expandedPaths)
    if (newExpanded.has(path)) {
      newExpanded.delete(path)
    } else {
      newExpanded.add(path)
    }
    this.expandedPaths = newExpanded
  }

  private renderTreeNode(
    entry: ResticFileEntry,
    tree: Map<string, ResticFileEntry[]>,
    depth: number = 0,
  ): any {
    const isDir = entry.type === 'dir'
    const isExpanded = this.expandedPaths.has(entry.path)
    const isSelected = this.selectedFiles.has(entry.path)
    const isPartiallySelected =
      isDir &&
      !isSelected &&
      this.isDirectoryPartiallySelected(entry.path, tree)
    const children = isDir ? tree.get(entry.path) || [] : []
    const indent = depth * 20

    return html`
      <div class="tree-node">
        <div
          class="tree-item ${isDir ? 'directory' : 'file'} ${isSelected
            ? 'selected'
            : ''}"
          style="padding-left: ${indent + 8}px"
          @click=${() => isDir && this.toggleTreeNode(entry.path)}
        >
          <span
            class="tree-toggle"
            style="visibility: ${isDir && children.length > 0
              ? 'visible'
              : 'hidden'}"
          >
            ${isExpanded ? '▼' : '▶'}
          </span>
          <input
            type="checkbox"
            .checked=${isSelected}
            .indeterminate=${isPartiallySelected}
            @click=${(e: Event) =>
              isDir
                ? this.toggleDirectorySelection(entry.path, tree, e)
                : this.toggleFileSelection(entry.path, e)}
          />
          <span class="tree-icon">${isDir ? '📁' : '📄'}</span>
          <span class="tree-name">${entry.name}</span>
          ${!isDir
            ? html`<span class="tree-size"
                >${this.formatSize(entry.size)}</span
              >`
            : ''}
        </div>
        ${isDir && isExpanded
          ? html`
              <div class="tree-children">
                ${children.map((child) =>
                  this.renderTreeNode(child, tree, depth + 1),
                )}
              </div>
            `
          : ''}
      </div>
    `
  }

  private getRootEntries(
    tree: Map<string, ResticFileEntry[]>,
  ): ResticFileEntry[] {
    // Find the root entries - entries whose parent is '/' or a Windows drive root
    const rootEntries: ResticFileEntry[] = []
    const allPaths = new Set<string>()

    // Collect all entry paths (normalized)
    tree.forEach((entries) => {
      entries.forEach((e) => allPaths.add(e.path))
    })

    // Find entries that don't have their parent in allPaths (they are roots)
    tree.forEach((entries, parentPath) => {
      // Root conditions: empty parent, Unix root '/', Windows drive root like 'C:/', or parent not in tree
      const isEmptyParent = parentPath === ''
      const isUnixRoot = parentPath === '/'
      const isWindowsDriveRoot = /^[A-Za-z]:\/$/.test(parentPath)
      const parentNotInTree = !allPaths.has(parentPath)

      if (
        isEmptyParent ||
        isUnixRoot ||
        isWindowsDriveRoot ||
        parentNotInTree
      ) {
        rootEntries.push(...entries)
      }
    })

    // Sort (folders first, then alphabetically)
    rootEntries.sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1
      if (a.type !== 'dir' && b.type === 'dir') return 1
      return a.name.localeCompare(b.name)
    })

    return rootEntries
  }

  /**
   * Auto-expand directories that have only one child until reaching
   * a directory with multiple children
   */
  private computeAutoExpandPaths(
    tree: Map<string, ResticFileEntry[]>,
    rootEntries: ResticFileEntry[],
  ): Set<string> {
    const expanded = new Set<string>()

    const expandSingleChildPath = (entry: ResticFileEntry) => {
      if (entry.type !== 'dir') return

      const children = tree.get(entry.path) || []
      // Only auto-expand if there's exactly 1 child
      if (children.length === 1) {
        expanded.add(entry.path)
        // Continue expanding if the single child is also a directory
        expandSingleChildPath(children[0])
      } else if (children.length > 1) {
        // Stop here - user will manually expand further
        return
      }
    }

    // Start from each root entry
    for (const entry of rootEntries) {
      expandSingleChildPath(entry)
    }

    return expanded
  }

  /**
   * Get all parent paths from a path up to the root
   */
  private getAllParentPathsToRoot(path: string): string[] {
    const normalized = path.replace(/\\/g, '/')
    const parts = normalized.split('/').filter((p) => p)
    const parents: string[] = []

    // For Windows paths (C:/Users/...)
    if (normalized.match(/^[A-Za-z]:\//)) {
      const drive = normalized.substring(0, 3) // e.g., "C:/"
      parents.push(drive)

      for (let i = 1; i <= parts.length - 1; i++) {
        const parentPath = drive + parts.slice(1, i + 1).join('/')
        parents.push(parentPath)
      }
    }
    // For Unix paths (/home/user/...)
    else if (normalized.startsWith('/')) {
      parents.push('/')

      for (let i = 0; i < parts.length - 1; i++) {
        const parentPath = '/' + parts.slice(0, i + 1).join('/')
        parents.push(parentPath)
      }
    }

    return parents
  }

  /**
   * Normalize Restic path format to OS path format
   * Converts /C/Users/... -> C:/Users/... on Windows
   * Converts /C or /D -> C:/ or D:/ (drive root)
   * Leaves Unix paths unchanged
   */
  private normalizeResticPath(path: string): string {
    // Convert Restic's Unix-style Windows paths: /C/Users/... -> C:/Users/...
    // Also handle drive root like /C or /D -> C:/ or D:/
    if (path.match(/^\/[A-Za-z](\/|$)/)) {
      const drive = path.substring(1, 2) + ':'
      const rest = path.substring(2)
      return rest ? drive + rest : drive + '/'
    }
    return path
  }

  /**
   * Convert normalized OS path back to Restic format for dump command
   * D:/Users/... -> /D/Users/...
   */
  private denormalizeResticPath(path: string): string {
    if (path.match(/^[A-Za-z]:\//)) {
      return '/' + path[0] + path.substring(2)
    }
    return path
  }

  /**
   * Handle click on a file in the diff tree - open file comparison
   */
  private async handleDiffFileClick(entry: any) {
    const normalized = this.normalizePathForComparison(entry.path)
    if (!this.timelineDiffResult?.comparison.modified.has(normalized)) return

    // Dump snapshot file to temp
    const resticPath = this.denormalizeResticPath(entry.path)
    const dumpResult = await this.invokeRestic({
      operation: 'dump',
      snapshotId:
        this.timelineDiffSnapshot!.short_id || this.timelineDiffSnapshot!.id,
      filePath: resticPath,
    })

    // Check both IPC-level and backend-level success
    if (
      !dumpResult.success ||
      dumpResult.data?.success === false ||
      !dumpResult.data?.tempPath
    ) {
      this.showMessage(
        'error',
        `Failed to dump file: ${dumpResult.data?.error || dumpResult.error || 'Unknown error'}`,
      )
      return
    }

    // Open file-compare: left = snapshot (temp file), right = current file
    this.diffFileCompare = {
      leftPath: dumpResult.data.tempPath,
      rightPath: entry.path,
    }
  }

  /**
   * Normalize path for comparison (handles Windows/Unix and Restic path formats)
   */
  private normalizePathForComparison(path: string): string {
    // Normalize to forward slashes
    let normalized = path.replace(/\\/g, '/')

    // Handle Restic's Unix-style Windows paths: /C/Users/... -> C:/Users/...
    // Also handle drive root like /C or /D -> C:/ or D:/
    if (normalized.match(/^\/[A-Za-z](\/|$)/)) {
      const drive = normalized.substring(1, 2) + ':'
      const rest = normalized.substring(2)
      normalized = rest ? drive + rest : drive + '/'
    }

    // Convert to lowercase for case-insensitive comparison on Windows
    normalized = normalized.toLowerCase()

    return normalized
  }

  /**
   * Add missing parent directories to tree up to the root
   */
  private addParentDirectoriesToRoot(
    tree: Map<string, any[]>,
    entries: any[],
  ): void {
    const allPaths = new Set<string>()

    // Collect all existing paths
    entries.forEach((e) => {
      allPaths.add(e.path.replace(/\\/g, '/'))
    })

    // For each path, ensure all parents exist up to root
    const parentsToAdd = new Set<string>()
    entries.forEach((entry) => {
      const parents = this.getAllParentPathsToRoot(entry.path)
      parents.forEach((parent) => {
        if (!allPaths.has(parent)) {
          parentsToAdd.add(parent)
        }
      })
    })

    // Add missing parent directories to the tree
    parentsToAdd.forEach((parentPath) => {
      const grandParentPath = this.getParentPath(parentPath)
      const name =
        parentPath
          .split('/')
          .filter((p) => p)
          .pop() || parentPath

      if (!tree.has(grandParentPath)) {
        tree.set(grandParentPath, [])
      }

      // Add as a directory entry
      tree.get(grandParentPath)!.push({
        path: parentPath,
        name: name,
        type: 'dir' as const,
        status: 'unchanged' as DiffStatus,
      })
    })

    // Sort all children after adding parents
    tree.forEach((children) => {
      children.sort((a, b) => {
        if (a.type === 'dir' && b.type !== 'dir') return -1
        if (a.type !== 'dir' && b.type === 'dir') return 1
        return a.name.localeCompare(b.name)
      })
    })
  }

  /**
   * Build tree structure from current filesystem entries
   */
  private buildCurrentFileTree(
    entries: CurrentFileEntry[],
  ): Map<string, DiffTreeEntry[]> {
    const tree = new Map<string, DiffTreeEntry[]>()

    for (const entry of entries) {
      const normalizedPath = entry.path.replace(/\\/g, '/')
      const parentPath = this.getParentPath(normalizedPath)

      if (!tree.has(parentPath)) {
        tree.set(parentPath, [])
      }

      tree.get(parentPath)!.push({
        path: normalizedPath,
        name: entry.name,
        type: entry.type,
        status: 'unchanged',
        currentEntry: entry,
      })
    }

    return tree
  }

  /**
   * Compute diff between snapshot and current filesystem
   */
  private computeDiff(
    snapshotEntries: ResticFileEntry[],
    currentEntries: CurrentFileEntry[],
  ): {
    added: Set<string>
    removed: Set<string>
    modified: Set<string>
    unchanged: Set<string>
  } {
    const snapshotMap = new Map<string, ResticFileEntry>()
    const currentMap = new Map<string, CurrentFileEntry>()

    // Build lookup maps - only compare FILES, not directories
    snapshotEntries
      .filter((e) => e.type !== 'dir')
      .forEach((e) => {
        const normalizedPath = this.normalizePathForComparison(e.path)
        snapshotMap.set(normalizedPath, e)
      })
    currentEntries
      .filter((e) => e.type !== 'dir')
      .forEach((e) => {
        const normalizedPath = this.normalizePathForComparison(e.path)
        currentMap.set(normalizedPath, e)
      })

    const added = new Set<string>()
    const removed = new Set<string>()
    const modified = new Set<string>()
    const unchanged = new Set<string>()

    // Find removed and modified
    snapshotMap.forEach((snapEntry, path) => {
      const currEntry = currentMap.get(path)

      if (!currEntry) {
        removed.add(path)
      } else {
        // Check if modified (compare size only - mtime changes are too common for false positives)
        // Note: This won't detect edits that don't change file size
        const sizeChanged = snapEntry.size !== currEntry.size

        if (sizeChanged) {
          modified.add(path)
        } else {
          unchanged.add(path)
        }
      }
    })

    // Find added
    currentMap.forEach((currEntry, path) => {
      if (!snapshotMap.has(path)) {
        added.add(path)
      }
    })

    return { added, removed, modified, unchanged }
  }

  render() {
    if (this.resticInstalled === null) {
      return html`
        <div class="content">
          <div class="header">
            <div>
              <h1>Nice2Have Restic UI</h1>
              <div class="subtitle">Checking restic installation...</div>
            </div>
          </div>
          <div class="tab-content">
            <div class="empty-state">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      `
    }

    if (!this.resticInstalled) {
      return html`
        <div class="content">
          <div class="header">
            <div>
              <h1>Nice2Have Restic UI</h1>
              <div class="subtitle">Time Machine-like backup management</div>
            </div>
          </div>
          <div class="tab-content">
            <div class="not-installed">
              <h2>Restic Not Installed</h2>
              <p>
                Restic backup tool is not installed on your system. Please
                install it to use this feature.
              </p>
              <p>
                <a href="https://restic.net" target="_blank">
                  Download restic from restic.net
                </a>
              </p>
            </div>
          </div>
        </div>
      `
    }

    return html`
      <div class="content">
        <div class="header">
          <div>
            <h1>Nice2Have Restic UI</h1>
            <div class="subtitle">Time Machine-like backup management</div>
          </div>
          ${this.resticVersion
            ? html`<span style="color: #64748b; font-size: 0.8rem"
                >${this.resticVersion}</span
              >`
            : ''}
        </div>

        ${this.message
          ? html`<div class="message ${this.message.type}">
              ${this.message.text}
            </div>`
          : ''}

        <div class="repo-config">
          ${this.savedConnections.length > 0
            ? html`
                <div
                  style="margin-bottom: 1rem; padding: 0.75rem; background: #0f172a; border-radius: 6px;"
                >
                  <div
                    style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem;"
                  >
                    <span
                      style="color: #f59e0b; font-weight: 600; font-size: 0.85rem;"
                    >
                      Saved Connections
                    </span>
                    <div style="display: flex; gap: 0.5rem;">
                      <button
                        class="btn btn-small btn-secondary"
                        @click=${this.exportConnections}
                        title="Export connections to file"
                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                      >
                        Export
                      </button>
                      <button
                        class="btn btn-small btn-secondary"
                        @click=${this.importConnections}
                        title="Import connections from file"
                        style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                  <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                    ${this.savedConnections.map(
                      (conn) => html`
                        <div
                          style="display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 0.75rem; background: #1e293b; border-radius: 4px; cursor: pointer; border: 1px solid #334155;"
                          @click=${() => this.loadConnection(conn)}
                        >
                          <span style="color: #0ea5e9; font-weight: 600;"
                            >${conn.name}</span
                          >
                          <span style="color: #64748b; font-size: 0.8rem;"
                            >${conn.repoPath.length > 30
                              ? conn.repoPath.substring(0, 30) + '...'
                              : conn.repoPath}</span
                          >
                          <button
                            style="background: #dc2626; color: white; border: none; padding: 0.15rem 0.4rem; border-radius: 3px; cursor: pointer; font-size: 0.75rem;"
                            @click=${(e: Event) =>
                              this.deleteConnection(conn.name, e)}
                            title="Delete connection"
                          >
                            ×
                          </button>
                        </div>
                      `,
                    )}
                  </div>
                </div>
              `
            : html`
                <div style="margin-bottom: 0.5rem; text-align: right;">
                  <button
                    class="btn btn-small btn-secondary"
                    @click=${this.importConnections}
                    title="Import connections from file"
                    style="padding: 0.2rem 0.5rem; font-size: 0.75rem;"
                  >
                    Import Connections
                  </button>
                </div>
              `}
          <div class="repo-form">
            <div class="form-group">
              <label>Repository Path</label>
              <input
                type="text"
                placeholder="/path2/repo or sftp:user@host:/path2/restic"
                .value=${this.repoPath}
                @input=${(e: Event) =>
                  (this.repoPath = (e.target as HTMLInputElement).value)}
                ?disabled=${this.isLoading}
              />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Repository password"
                .value=${this.repoPassword}
                @input=${(e: Event) =>
                  (this.repoPassword = (e.target as HTMLInputElement).value)}
                ?disabled=${this.isLoading}
              />
            </div>
            <div style="display: flex; gap: 0.5rem">
              <button
                class="btn btn-primary"
                @click=${this.connectRepository}
                ?disabled=${this.isLoading}
              >
                ${this.isLoading
                  ? html`<span class="spinner"></span>`
                  : 'Connect'}
              </button>
              <button
                class="btn btn-secondary"
                @click=${this.initRepository}
                ?disabled=${this.isLoading}
              >
                Initialize
              </button>
            </div>
          </div>
          <div
            style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #334155;"
          >
            <input
              type="text"
              placeholder="Connection name..."
              style="flex: 1; padding: 0.4rem 0.6rem; background: #0f172a; border: 1px solid #475569; border-radius: 4px; color: #e2e8f0; font-size: 0.85rem;"
              .value=${this.connectionName}
              @input=${(e: Event) =>
                (this.connectionName = (e.target as HTMLInputElement).value)}
              ?disabled=${this.isLoading}
            />
            <button
              class="btn btn-secondary"
              style="white-space: nowrap;"
              @click=${this.saveCurrentConnection}
              ?disabled=${this.isLoading ||
              !this.repoPath ||
              !this.repoPassword}
            >
              Save Connection
            </button>
          </div>
          ${this.repository
            ? html`
                <div class="repo-status">
                  <span class="status-dot connected"></span>
                  <span>Connected to ${this.repository.path}</span>
                  <span style="margin-left: auto; color: #64748b">
                    ${this.snapshots.length} snapshots
                    ${this.stats
                      ? html` | ${this.formatSize(this.stats.total_size)}`
                      : ''}
                  </span>
                </div>
              `
            : ''}
        </div>

        ${this.repository
          ? html`
              <div class="tabs">
                <div
                  class="tab ${this.activeTab === 'backup' ? 'active' : ''}"
                  @click=${() => (this.activeTab = 'backup')}
                >
                  Backup
                </div>
                <div
                  class="tab ${this.activeTab === 'browse' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'browse'
                    this.loadSnapshots()
                  }}
                >
                  Browse History
                </div>
                <div
                  class="tab ${this.activeTab === 'compare' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'compare'
                    this.loadSnapshots()
                  }}
                >
                  Compare
                </div>
                <div
                  class="tab ${this.activeTab === 'retention' ? 'active' : ''}"
                  @click=${() => (this.activeTab = 'retention')}
                >
                  Retention
                </div>
                <div
                  class="tab ${this.activeTab === 'health' ? 'active' : ''}"
                  @click=${() => {
                    this.activeTab = 'health'
                    this.loadStats()
                  }}
                >
                  Health
                </div>
                <div
                  class="tab ${this.activeTab === 'history' ? 'active' : ''}"
                  @click=${() => (this.activeTab = 'history')}
                >
                  History
                </div>
              </div>

              <div class="tab-content">
                ${this.activeTab === 'backup' ? this.renderBackupPanel() : ''}
                ${this.activeTab === 'browse' ? this.renderBrowsePanel() : ''}
                ${this.activeTab === 'compare' ? this.renderComparePanel() : ''}
                ${this.activeTab === 'retention'
                  ? this.renderRetentionPanel()
                  : ''}
                ${this.activeTab === 'health' ? this.renderHealthPanel() : ''}
                ${this.activeTab === 'history' ? this.renderHistoryPanel() : ''}
              </div>
            `
          : html`
              <div class="tab-content">
                <div class="empty-state">
                  <div class="empty-state-icon">🔐</div>
                  <div>Enter repository path and password to connect</div>
                </div>
              </div>
            `}
      </div>
    `
  }

  private renderBackupPanel() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem;">
        <!-- Paths section -->
        <div
          class="backup-paths"
          style="background: #0f172a; border-radius: 8px; padding: 1rem;"
        >
          <div class="path-list" style="margin-bottom: 0.75rem;">
            ${this.backupPaths.length === 0
              ? html`<div
                  style="color: #64748b; font-size: 0.9rem; padding: 1rem; text-align: center;"
                >
                  No folders selected. Add a folder to backup.
                </div>`
              : this.backupPaths.map(
                  (path) => html`
                    <div
                      class="path-item"
                      style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.75rem; background: #1e293b; border-radius: 4px; margin-bottom: 0.5rem;"
                    >
                      <span
                        style="font-family: monospace; font-size: 0.9rem; color: #e2e8f0;"
                        >${path}</span
                      >
                      <button
                        class="btn btn-small btn-danger"
                        @click=${() => this.removePath(path)}
                        style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
                      >
                        ×
                      </button>
                    </div>
                  `,
                )}
          </div>
          <div style="display: flex; gap: 0.75rem;">
            <button
              class="btn btn-secondary"
              @click=${this.selectFolder}
              style="flex: 1;"
            >
              + Add Folder
            </button>
            <button
              class="btn btn-primary"
              @click=${this.startBackup}
              ?disabled=${this.backupPaths.length === 0 || this.isBackingUp}
              style="flex: 2; font-weight: 600;"
            >
              ${this.isBackingUp ? 'Backing up...' : 'Backup Now'}
            </button>
          </div>
        </div>

        <!-- Progress section (only shown when backing up) -->
        ${this.isBackingUp
          ? html`
              <div
                class="backup-progress"
                style="background: #0f172a; border-radius: 8px; padding: 1rem;"
              >
                <h3
                  style="margin: 0 0 0.75rem 0; font-size: 1rem; color: #e2e8f0;"
                >
                  Backup in Progress
                </h3>
                <div class="progress-bar-container">
                  <div
                    class="progress-bar"
                    style="width: ${(this.backupProgress?.percentDone || 0) *
                    100}%"
                  ></div>
                  <div class="progress-bar-text">
                    ${Math.round(
                      (this.backupProgress?.percentDone || 0) * 100,
                    )}%
                  </div>
                </div>
                <div class="progress-details">
                  <span>
                    ${this.backupProgress?.filesDone || 0} /
                    ${this.backupProgress?.totalFiles || 0} files
                  </span>
                  <span>
                    ${this.formatSize(this.backupProgress?.bytesDone || 0)} /
                    ${this.formatSize(this.backupProgress?.totalBytes || 0)}
                  </span>
                </div>
                ${this.backupProgress?.currentFile
                  ? html`<div class="current-file">
                      ${this.backupProgress.currentFile}
                    </div>`
                  : ''}
              </div>
            `
          : ''}
      </div>
    `
  }

  /**
   * Render normal timeline with mode toggle button
   */
  private renderNormalTimeline(groups: SnapshotGroup[]) {
    return html`
      ${groups.length > 0
        ? html`
            <div class="diff-mode-toggle">
              <button
                class="btn btn-small btn-secondary"
                @click=${this.toggleDiffMode}
              >
                📊 Timeline Compare
              </button>
            </div>
          `
        : ''}
      ${groups.length === 0
        ? html`<div style="color: #64748b; font-size: 0.85rem">
            No snapshots yet
          </div>`
        : groups.map(
            (group) => html`
              <div class="timeline-group">
                <div class="timeline-group-label">${group.label}</div>
                ${group.snapshots.map(
                  (snapshot) => html`
                    <div
                      class="timeline-item ${this.selectedSnapshot?.id ===
                      snapshot.id
                        ? 'selected'
                        : ''}"
                      @click=${() => this.selectSnapshot(snapshot)}
                    >
                      <div class="timeline-dot"></div>
                      <div class="timeline-info">
                        <div class="timeline-time">
                          ${this.formatTime(snapshot.time)}
                        </div>
                        <div class="timeline-paths">
                          ${snapshot.paths?.join(', ')}
                        </div>
                      </div>
                    </div>
                  `,
                )}
              </div>
            `,
          )}
    `
  }

  /**
   * Render diff mode timeline with slider
   */
  private renderDiffModeTimeline(groups: SnapshotGroup[]) {
    return html`
      <div class="diff-mode-toggle">
        ${this.snapshots.length === 0
          ? html`<div style="color: #64748b; font-size: 0.85rem">
              No snapshots
            </div>`
          : html`
            <div class="timeline-slider-container">
              <label
                style="font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem; display: block;"
              >
                Browse Timeline
              </label>
              <input
                type="range"
                class="timeline-slider"
                min="0"
                max="${this.snapshots.length - 1}"
                step="1"
                .value="${String(this.timelineSliderPosition)}"
                @input=${this.handleTimelineSlider}
                style="margin-bottom: 0;"
              />
              <div class="timeline-ticks">
                ${this.snapshots.map(
                  (snapshot, index) => html`
                    <div
                      class="timeline-tick ${this.timelineSliderPosition ===
                      index
                        ? 'active'
                        : ''}"
                      style="left: ${(index /
                        Math.max(this.snapshots.length - 1, 1)) *
                      100}%; top: 50%;"
                      @click=${() => this.selectSnapshotByIndex(index)}
                    >
                      <div class="timeline-tick-tooltip">
                        ${this.formatDate(snapshot.time)}
                      </div>
                    </div>
                  `,
                )}
              </div>
            </div>
        <button
          class="btn btn-small btn-secondary"
          @click=${this.toggleDiffMode}
        >
          ← Back
        </button>
      </div>
          `}
      </div>
    `
  }

  /**
   * Render diff mode header with stats
   */
  private renderDiffModeHeader() {
    if (!this.timelineDiffResult) {
      return html`<h3>Loading comparison...</h3>`
    }

    const stats = this.timelineDiffResult.comparison

    return html`
      <div style="margin-bottom: 1rem;">
        <h3 style="margin: 0 0 0.5rem 0;">Timeline Comparison</h3>
        <div class="diff-stats">
          <div class="diff-stat diff-stat-added">
            <span>●</span>
            <span>${stats.added.size} Added</span>
          </div>
          <div class="diff-stat diff-stat-removed">
            <span>●</span>
            <span>${stats.removed.size} Removed</span>
          </div>
          <div class="diff-stat diff-stat-modified">
            <span>●</span>
            <span>${stats.modified.size} Modified</span>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Render normal browse header
   */
  private renderNormalBrowseHeader() {
    return html`
      <h3>
        ${this.selectedSnapshot
          ? html`Files in
            ${this.selectedSnapshot.short_id || this.selectedSnapshot.id}
            ${this.browseEntries.length > 0
              ? html`<span
                  style="color: #64748b; font-weight: normal; font-size: 0.85rem; margin-left: 0.5rem;"
                >
                  (${this.browseEntries.filter((e) => e.type === 'file').length}
                  files)
                </span>`
              : ''}`
          : 'Select a snapshot'}
      </h3>
    `
  }

  /**
   * Render normal tree view
   */
  private renderNormalTree() {
    return html`
      <div class="tree-container">
        ${this.isLoading
          ? html`<div class="empty-state"><span class="spinner"></span></div>`
          : this.browseEntries.length === 0
            ? html`<div class="empty-state">No files</div>`
            : (() => {
                const tree = this.buildFileTree(this.browseEntries)
                const rootEntries = this.getRootEntries(tree)
                return rootEntries.map((entry) =>
                  this.renderTreeNode(entry, tree, 0),
                )
              })()}
      </div>
    `
  }

  /**
   * Render side-by-side diff trees
   */
  private renderDiffTrees() {
    if (this.isDiffLoading) {
      return html`
        <div class="empty-state">
          <span class="spinner"></span>
          <div>Computing differences...</div>
        </div>
      `
    }

    if (!this.timelineDiffResult) {
      return html`<div class="empty-state">No comparison data</div>`
    }

    const snapshotRootEntries = this.getRootEntries(
      this.timelineDiffResult.snapshotTree,
    )
    const currentRootEntries = this.getRootEntries(
      this.timelineDiffResult.currentFsTree as any,
    )

    const snapshotDate = this.timelineDiffSnapshot?.time
      ? new Date(this.timelineDiffSnapshot.time).toLocaleString()
      : this.timelineDiffSnapshot?.short_id || ''

    return html`
      <div class="diff-trees-container">
        <div class="diff-tree-panel">
          <h4>
            <span>Snapshot (${snapshotDate})</span>
          </h4>
          <div class="tree-scroll">
            ${snapshotRootEntries.map((entry) =>
              this.renderDiffTreeNode(
                entry,
                this.timelineDiffResult!.snapshotTree,
                0,
                'snapshot',
              ),
            )}
          </div>
        </div>

        <div class="diff-tree-panel">
          <h4>
            <span>Current Filesystem</span>
          </h4>
          <div class="tree-scroll">
            ${currentRootEntries.map((entry) =>
              this.renderDiffTreeNode(
                entry,
                this.timelineDiffResult!.currentFsTree as any,
                0,
                'current',
              ),
            )}
          </div>
        </div>
      </div>
      ${this.diffFileCompare
        ? html`<file-compare
            .leftPath=${this.diffFileCompare.leftPath}
            .rightPath=${this.diffFileCompare.rightPath}
            @close=${() => {
              this.diffFileCompare = null
            }}
          ></file-compare>`
        : ''}
    `
  }

  /**
   * Check if a directory has any changed children recursively
   */
  private hasChangedChildrenRecursive(
    dirPath: string,
    tree: Map<string, any[]>,
    side: 'snapshot' | 'current',
  ): boolean {
    if (!this.timelineDiffResult) return false

    const comp = this.timelineDiffResult.comparison
    const normalizedDirPath = this.normalizePathForComparison(dirPath)
    const prefix = normalizedDirPath + '/'

    // Check if any changed path starts with this directory path
    const setsToCheck: Set<string>[] = [comp.modified]
    if (side === 'current') setsToCheck.push(comp.added)
    if (side === 'snapshot') setsToCheck.push(comp.removed)

    for (const pathSet of setsToCheck) {
      for (const changedPath of pathSet) {
        if (changedPath.startsWith(prefix)) return true
      }
    }
    return false
  }

  /**
   * Render a single tree node in diff mode
   */
  private renderDiffTreeNode(
    entry: ResticFileEntry | DiffTreeEntry,
    tree: Map<string, any[]>,
    depth: number,
    side: 'snapshot' | 'current',
  ): any {
    const isDir = entry.type === 'dir'
    const isExpanded = this.expandedPaths.has(entry.path)
    const children = isDir ? tree.get(entry.path) || [] : []
    const indent = depth * 20

    // Determine diff status - ALWAYS look up in comparison arrays
    // (don't use the 'status' field from tree building as it's never updated)
    const comp = this.timelineDiffResult!.comparison
    const normalizedEntryPath = this.normalizePathForComparison(entry.path)
    let diffStatus: DiffStatus = 'unchanged'
    if (comp.added.has(normalizedEntryPath)) diffStatus = 'added'
    else if (comp.removed.has(normalizedEntryPath)) diffStatus = 'removed'
    else if (comp.modified.has(normalizedEntryPath)) diffStatus = 'modified'

    // Filter: only show relevant items for each side
    if (side === 'snapshot' && diffStatus === 'added') return null
    if (side === 'current' && diffStatus === 'removed') return null

    // Hide unchanged files (but keep directories that might contain changed files)
    if (diffStatus === 'unchanged' && !isDir) return null

    // Hide unchanged directories that don't have any changed children
    if (diffStatus === 'unchanged' && isDir) {
      const hasChangedChildren = this.hasChangedChildrenRecursive(
        entry.path,
        tree,
        side,
      )
      if (!hasChangedChildren) return null
    }

    const isClickable = !isDir && diffStatus === 'modified'

    return html`
      <div class="tree-node">
        <div
          class="tree-item ${isDir
            ? 'directory'
            : 'file'} diff-${diffStatus} ${isClickable ? 'clickable' : ''}"
          style="padding-left: ${indent + 8}px"
          @click=${() => {
            if (isDir) this.toggleTreeNode(entry.path)
            else if (isClickable) this.handleDiffFileClick(entry)
          }}
        >
          <span
            class="tree-toggle"
            style="visibility: ${isDir && children.length > 0
              ? 'visible'
              : 'hidden'}"
          >
            ${isExpanded ? '▼' : '▶'}
          </span>
          <span class="tree-icon">${isDir ? '📁' : '📄'}</span>
          <span class="tree-name">${entry.name}</span>
          ${!isDir && 'size' in entry
            ? html`<span class="tree-size"
                >${this.formatSize(entry.size)}</span
              >`
            : ''}
        </div>
        ${isDir && isExpanded
          ? html`
              <div class="tree-children">
                ${children.map((child) =>
                  this.renderDiffTreeNode(child, tree, depth + 1, side),
                )}
              </div>
            `
          : ''}
      </div>
    `
  }

  private renderBrowsePanel() {
    const groups = this.groupSnapshots()

    return html`
      <div class="browse-panel ${this.timelineDiffMode ? 'diff-mode' : ''}">
        <div class="timeline">
          <h3>Snapshots</h3>

          ${!this.timelineDiffMode ? this.renderNormalTimeline(groups) : ''}
          ${this.timelineDiffMode ? this.renderDiffModeTimeline(groups) : ''}
        </div>

        <div class="file-browser">
          ${this.timelineDiffMode
            ? this.renderDiffModeHeader()
            : this.renderNormalBrowseHeader()}
          ${this.timelineDiffMode
            ? this.renderDiffTrees()
            : this.selectedSnapshot
              ? html`
                  ${this.renderNormalTree()}
                  <div class="file-actions">
                    <button
                      class="btn btn-primary"
                      @click=${this.restoreSelectedFiles}
                      ?disabled=${this.selectedFiles.size === 0}
                    >
                      Restore Selected (${this.selectedFiles.size})
                    </button>
                    <button class="btn btn-secondary" @click=${this.restoreAll}>
                      Restore All
                    </button>
                  </div>
                `
              : html`
                  <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div>Select a snapshot to browse files</div>
                  </div>
                `}
        </div>
      </div>
    `
  }

  private renderComparePanel() {
    return html`
      <div class="compare-panel">
        <div class="compare-selectors">
          <div class="compare-selector">
            <h4>Snapshot 1 (older)</h4>
            <select
              @change=${(e: Event) => {
                const id = (e.target as HTMLSelectElement).value
                this.compareSnapshot1 =
                  this.snapshots.find((s) => s.id === id) || null
                this.diffResult = null
              }}
            >
              <option value="">Select a snapshot...</option>
              ${this.snapshots.map(
                (s) => html`
                  <option
                    value=${s.id}
                    ?selected=${this.compareSnapshot1?.id === s.id}
                  >
                    ${s.short_id || s.id.substring(0, 8)} -
                    ${this.formatDate(s.time)}
                  </option>
                `,
              )}
            </select>
            ${this.compareSnapshot1
              ? html`
                  <div
                    style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem"
                  >
                    ${this.compareSnapshot1.paths?.join(', ')}
                  </div>
                `
              : ''}
          </div>

          <div class="compare-arrow">→</div>

          <div class="compare-selector">
            <h4>Snapshot 2 (newer)</h4>
            <select
              @change=${(e: Event) => {
                const id = (e.target as HTMLSelectElement).value
                this.compareSnapshot2 =
                  this.snapshots.find((s) => s.id === id) || null
                this.diffResult = null
              }}
            >
              <option value="">Select a snapshot...</option>
              ${this.snapshots.map(
                (s) => html`
                  <option
                    value=${s.id}
                    ?selected=${this.compareSnapshot2?.id === s.id}
                  >
                    ${s.short_id || s.id.substring(0, 8)} -
                    ${this.formatDate(s.time)}
                  </option>
                `,
              )}
            </select>
            ${this.compareSnapshot2
              ? html`
                  <div
                    style="font-size: 0.8rem; color: #64748b; margin-top: 0.25rem"
                  >
                    ${this.compareSnapshot2.paths?.join(', ')}
                  </div>
                `
              : ''}
          </div>
        </div>

        <div class="compare-actions">
          <button
            class="btn btn-primary"
            @click=${this.compareSnapshots}
            ?disabled=${!this.compareSnapshot1 ||
            !this.compareSnapshot2 ||
            this.isComparing}
            style="padding: 0.75rem 2rem"
          >
            ${this.isComparing ? html`<span class="spinner"></span>` : ''}
            Compare Snapshots
          </button>
        </div>

        ${this.diffResult
          ? html`
              <div class="compare-summary">
                <div class="summary-stat added">
                  <span class="count"
                    >${this.diffResult.summary.addedCount}</span
                  >
                  <span>Added</span>
                </div>
                <div class="summary-stat removed">
                  <span class="count"
                    >${this.diffResult.summary.removedCount}</span
                  >
                  <span>Removed</span>
                </div>
                <div class="summary-stat modified">
                  <span class="count"
                    >${this.diffResult.summary.modifiedCount}</span
                  >
                  <span>Modified</span>
                </div>
              </div>

              <div class="diff-results">
                <div class="diff-section added">
                  <h4>
                    Added
                    <span class="diff-count"
                      >${this.diffResult.summary.addedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.added.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files added
                        </div>`
                      : this.diffResult.added.map(
                          (path) => html`
                            <div class="diff-item added" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>

                <div class="diff-section removed">
                  <h4>
                    Removed
                    <span class="diff-count"
                      >${this.diffResult.summary.removedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.removed.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files removed
                        </div>`
                      : this.diffResult.removed.map(
                          (path) => html`
                            <div class="diff-item removed" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>

                <div class="diff-section modified">
                  <h4>
                    Modified
                    <span class="diff-count"
                      >${this.diffResult.summary.modifiedCount}</span
                    >
                  </h4>
                  <div class="diff-list">
                    ${this.diffResult.modified.length === 0
                      ? html`<div style="color: #64748b; font-size: 0.85rem">
                          No files modified
                        </div>`
                      : this.diffResult.modified.map(
                          (path) => html`
                            <div class="diff-item modified" title=${path}>
                              ${path}
                            </div>
                          `,
                        )}
                  </div>
                </div>
              </div>
            `
          : html`
              <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div>
                  Select two snapshots and click Compare to see the differences
                </div>
              </div>
            `}
      </div>
    `
  }

  private renderRetentionPanel() {
    return html`
      <div class="retention-panel">
        <div class="retention-config">
          <h3>Retention Policy</h3>
          <div class="retention-field">
            <label>Keep last</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepLast || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepLast: parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep daily</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepDaily || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepDaily:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep weekly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepWeekly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepWeekly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep monthly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepMonthly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepMonthly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <div class="retention-field">
            <label>Keep yearly</label>
            <input
              type="number"
              min="0"
              .value=${String(this.retentionPolicy.keepYearly || 0)}
              @input=${(e: Event) => {
                this.retentionPolicy = {
                  ...this.retentionPolicy,
                  keepYearly:
                    parseInt((e.target as HTMLInputElement).value) || 0,
                }
              }}
            />
          </div>
          <button
            class="btn btn-danger"
            @click=${this.applyRetentionPolicy}
            ?disabled=${this.isLoading}
            style="margin-top: 1rem; width: 100%"
          >
            Apply Policy & Prune
          </button>
        </div>

        <div class="retention-preview">
          <h3>Current Snapshots</h3>
          <div style="font-size: 0.9rem; color: #94a3b8">
            Total: ${this.snapshots.length} snapshots
          </div>
          <div style="margin-top: 1rem; max-height: 300px; overflow-y: auto">
            ${this.snapshots.map(
              (s) => html`
                <div
                  style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #334155; font-size: 0.85rem"
                >
                  <span>${s.short_id || s.id.substring(0, 8)}</span>
                  <span style="color: #64748b">${this.formatDate(s.time)}</span>
                </div>
              `,
            )}
          </div>
        </div>
      </div>
    `
  }

  private renderHealthPanel() {
    return html`
      <div class="health-panel">
        <div class="health-card">
          <h3>Total Size</h3>
          <div class="health-value">
            ${this.stats ? this.formatSize(this.stats.total_size) : '-'}
          </div>
        </div>

        <div class="health-card">
          <h3>Total Files</h3>
          <div class="health-value">
            ${this.stats?.total_file_count?.toLocaleString() || '-'}
          </div>
        </div>

        <div class="health-card">
          <h3>Snapshots</h3>
          <div class="health-value">${this.snapshots.length}</div>
        </div>

        <div class="health-actions">
          <button
            class="btn btn-primary"
            @click=${this.runCheck}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading && this.loadingMessage.includes('Check')
              ? html`<span class="spinner"></span>`
              : ''}
            Check Repository
          </button>
          <button
            class="btn btn-secondary"
            @click=${this.runPrune}
            ?disabled=${this.isLoading}
          >
            ${this.isLoading && this.loadingMessage.includes('Prune')
              ? html`<span class="spinner"></span>`
              : ''}
            Prune Unused Data
          </button>
          <button
            class="btn btn-secondary"
            @click=${this.runUnlock}
            ?disabled=${this.isLoading}
          >
            Unlock Repository
          </button>
          <button class="btn btn-secondary" @click=${this.loadStats}>
            Refresh Stats
          </button>
        </div>
      </div>
    `
  }

  private renderHistoryPanel() {
    return html`
      <div class="history-panel">
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;"
        >
          <h3 style="margin: 0;">Command History</h3>
          <button
            class="btn btn-secondary"
            @click=${() => (this.commandHistory = [])}
            ?disabled=${this.commandHistory.length === 0}
          >
            Clear History
          </button>
        </div>

        ${this.commandHistory.length === 0
          ? html`
              <div class="empty-state">
                <div class="empty-state-icon">📜</div>
                <div>No commands executed yet</div>
              </div>
            `
          : html`
              <div class="history-list">
                ${this.commandHistory.map(
                  (cmd) => html`
                    <div
                      class="history-entry ${cmd.success ? 'success' : 'error'}"
                    >
                      <div class="history-header">
                        <div class="history-operation">
                          <span class="history-icon"
                            >${cmd.success ? '✓' : '✗'}</span
                          >
                          <code
                            style="font-family: monospace; font-size: 0.9rem;"
                            >${cmd.commandLine || cmd.operation}</code
                          >
                        </div>
                        <div class="history-meta">
                          <span class="history-time"
                            >${this.formatHistoryTime(cmd.timestamp)}</span
                          >
                          ${cmd.duration
                            ? html`<span class="history-duration"
                                >${cmd.duration}ms</span
                              >`
                            : ''}
                        </div>
                      </div>

                      ${!cmd.commandLine &&
                      cmd.params &&
                      Object.keys(cmd.params).length > 0
                        ? html`
                            <div class="history-params">
                              ${Object.entries(cmd.params)
                                .filter(([key]) => key !== 'password')
                                .map(
                                  ([key, value]) => html`
                                    <span class="param-tag"
                                      >${key}:
                                      ${this.formatParamValue(value)}</span
                                    >
                                  `,
                                )}
                            </div>
                          `
                        : ''}
                      ${cmd.output
                        ? html`
                            <div class="history-output">
                              <strong>Output:</strong> ${cmd.output}
                            </div>
                          `
                        : ''}
                      ${cmd.error
                        ? html`
                            <div class="history-error">
                              <strong>Error:</strong> ${cmd.error}
                            </div>
                          `
                        : ''}
                    </div>
                  `,
                )}
              </div>
            `}
      </div>
    `
  }

  private formatHistoryTime(timestamp: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)

    if (diffSec < 60) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHour < 24) return `${diffHour}h ago`

    return timestamp.toLocaleString()
  }

  private formatParamValue(value: any): string {
    if (value === undefined || value === null) return '-'
    if (typeof value === 'boolean') return value ? 'yes' : 'no'
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : '[]'
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }
}
