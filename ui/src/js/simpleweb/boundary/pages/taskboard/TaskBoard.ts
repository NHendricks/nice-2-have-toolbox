/**
 * TaskBoard - Kanban-style task management board
 */

import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type {
  Category,
  Task,
  TaskPriority,
  TaskStatus,
} from './taskboard.types.js'
import {
  CATEGORY_COLORS,
  COLUMNS,
  DEFAULT_CATEGORY,
  DEFAULT_PERSON,
  PRIORITY_COLORS,
} from './taskboard.types.js'

const DEFAULT_BOARD_TITLE = 'Taskboard'
const README_FILE_NAME = 'readme.txt'
const README_FILE_CONTENT = 'https://www.nice2havetoolbox.de\n'

@customElement('nh-taskboard')
export class TaskBoard extends LitElement {
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
      height: calc(100vh - 2rem);
      display: flex;
      flex-direction: column;
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

    .header h1 {
      margin: 0;
      font-size: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      line-height: 1.2;
    }

    .header-title-main {
      display: inline-flex;
      align-items: center;
    }

    .header-title-group {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }

    .board-title-separator {
      color: #64748b;
      font-weight: 400;
      display: inline-flex;
      align-items: center;
    }

    .board-title {
      color: #cbd5e1;
      font-size: 1.1rem;
      font-weight: 500;
      cursor: text;
      border-bottom: 1px dashed #64748b;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 420px;
      display: inline-flex;
      align-items: center;
      line-height: 1.2;
    }

    .board-title-input {
      background: #0f172a;
      border: 1px solid #64748b;
      border-radius: 4px;
      color: #e2e8f0;
      padding: 0.2rem 0.45rem;
      font-size: 1.05rem;
      font-weight: 500;
      width: 240px;
      max-width: 420px;
      box-sizing: border-box;
      line-height: 1.2;
      height: 2rem;
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .folder-path {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 0.5rem 1rem;
      color: #94a3b8;
      font-size: 0.875rem;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #3b82f6;
      color: white;
    }

    .btn-primary:hover {
      background: #2563eb;
    }

    .btn-secondary {
      background: #475569;
      color: white;
    }

    .btn-secondary:hover {
      background: #64748b;
    }

    .board {
      display: flex;
      gap: 1rem;
      flex: 1;
      overflow-x: auto;
      padding-bottom: 1rem;
    }

    .backlog-section {
      margin-top: 0.5rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      min-height: 52px;
    }

    .backlog-section.expanded {
      min-height: 160px;
    }

    .backlog-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 600;
      color: #cbd5e1;
    }

    .backlog-content {
      padding: 0.5rem;
      min-height: 110px;
      max-height: 280px;
      overflow-y: auto;
      overflow-x: hidden;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .backlog-content.hidden {
      display: none;
    }

    .backlog-toggle-btn {
      background: #334155;
      border: 1px solid #475569;
      border-radius: 6px;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
      padding: 0.2rem 0.55rem;
    }

    .backlog-toggle-btn:hover {
      background: #475569;
    }

    .column {
      flex: 1;
      min-width: 280px;
      max-width: 350px;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      display: flex;
      flex-direction: column;
    }

    .column-header {
      padding: 1rem;
      border-bottom: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .column-title {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .column-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .column-count {
      background: #334155;
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.75rem;
      color: #94a3b8;
    }

    .column-content {
      flex: 1;
      padding: 0.5rem;
      overflow-y: auto;
      overflow-x: hidden;
      min-height: 100px;
      -webkit-overflow-scrolling: touch;
      overscroll-behavior: contain;
    }

    .column-content.drag-over {
      background: rgba(59, 130, 246, 0.1);
      border: 2px dashed #3b82f6;
      border-radius: 4px;
    }

    .task-card {
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      cursor: grab;
      transition: all 0.2s;
    }

    .task-card:hover {
      border-color: #475569;
      transform: translateY(-1px);
    }

    .task-card.dragging {
      opacity: 0.5;
      cursor: grabbing;
    }

    .task-card.editing {
      border-color: #3b82f6;
    }

    .task-card.drag-over {
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }

    .task-priority {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .task-priority:hover {
      filter: brightness(1.1);
    }

    .task-summary {
      font-weight: 500;
      margin-bottom: 0.5rem;
      word-break: break-word;
    }

    .task-summary-input {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.5rem;
      color: #e2e8f0;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .task-description {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-bottom: 0.125rem;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: normal;
      word-break: break-word;
    }

    .task-description-more {
      font-size: 0.8rem;
      line-height: 1;
      color: #94a3b8;
      margin-bottom: 0.5rem;
    }

    .task-description-input {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.5rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      min-height: 60px;
      resize: vertical;
      font-family: inherit;
    }

    .task-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.7rem;
      color: #64748b;
    }

    .task-actions {
      display: flex;
      gap: 0.25rem;
    }

    .task-action-btn {
      background: transparent;
      border: none;
      color: #64748b;
      cursor: pointer;
      padding: 0.25rem;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .task-action-btn:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .task-action-btn.delete:hover {
      background: #7f1d1d;
      color: #fca5a5;
    }

    .add-task-btn {
      width: 100%;
      padding: 0.5rem;
      background: transparent;
      border: 1px dashed #475569;
      border-radius: 4px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .add-task-btn:hover {
      background: #334155;
      border-color: #64748b;
      color: #e2e8f0;
    }

    .priority-select {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .task-edit-form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .task-edit-form .task-summary-input,
    .task-edit-form .task-description-input,
    .task-edit-form .category-select,
    .task-edit-form .priority-select {
      margin-bottom: 0;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #64748b;
      text-align: center;
      padding: 2rem;
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .edit-buttons {
      display: flex;
      gap: 0.25rem;
      justify-content: flex-end;
      margin-top: 0.25rem;
    }

    .btn-small {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    /* Category styles */
    .filter-section {
      margin-bottom: 0.75rem;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 8px;
    }

    .filter-header {
      padding: 0.6rem 0.85rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #cbd5e1;
      font-weight: 600;
    }

    .filter-content {
      padding: 0 0.75rem 0.75rem;
    }

    .filter-content.hidden {
      display: none;
    }

    .top-filters-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.75rem;
      align-items: start;
    }

    @media (max-width: 1200px) {
      .top-filters-row {
        grid-template-columns: 1fr;
      }
    }

    .filter-content .category-bar,
    .filter-content .person-bar {
      margin-bottom: 0;
      padding: 0;
      background: transparent;
      border: none;
      border-radius: 0;
    }

    .category-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      flex-wrap: wrap;
      align-items: center;
    }

    .person-bar {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
      padding: 0.75rem;
      background: #1e293b;
      border-radius: 8px;
      border: 1px solid #334155;
      flex-wrap: wrap;
      align-items: center;
    }

    .category-chip {
      padding: 0.375rem 0.75rem;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 0.375rem;
    }

    .person-chip {
      padding: 0.375rem 0.75rem;
      border-radius: 16px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      border: 2px solid transparent;
      display: flex;
      align-items: center;
      gap: 0.375rem;
      background: #334155;
      color: #cbd5e1;
    }

    .person-name {
      cursor: text;
      text-decoration: underline dotted;
      text-underline-offset: 2px;
    }

    .person-rename-input {
      background: #0f172a;
      border: 1px solid #64748b;
      border-radius: 4px;
      padding: 0.125rem 0.375rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      width: 120px;
      max-width: 160px;
      box-sizing: border-box;
    }

    .category-chip:hover {
      filter: brightness(1.2);
    }

    .person-chip:hover {
      filter: brightness(1.2);
    }

    .category-chip.active {
      border-color: white;
    }

    .person-chip.active {
      border-color: white;
      color: #f8fafc;
    }

    .category-chip.all {
      background: #475569;
      color: white;
    }

    .person-chip.all {
      background: #475569;
      color: white;
    }

    .category-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .add-category-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px dashed #475569;
      border-radius: 16px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .add-person-btn {
      padding: 0.375rem 0.75rem;
      background: transparent;
      border: 1px dashed #475569;
      border-radius: 16px;
      color: #64748b;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .add-category-btn:hover {
      border-color: #64748b;
      color: #e2e8f0;
    }

    .add-person-btn:hover {
      border-color: #64748b;
      color: #e2e8f0;
    }

    .category-input-wrapper {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .person-input-wrapper {
      display: flex;
      gap: 0.25rem;
      align-items: center;
    }

    .category-input {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.375rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      width: 120px;
    }

    .person-input {
      background: #0f172a;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.375rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.8rem;
      width: 120px;
    }

    .task-category {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      border-radius: 8px;
      margin-bottom: 0.375rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      cursor: pointer;
      user-select: none;
    }

    .task-category:hover {
      filter: brightness(1.1);
    }

    .task-person {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      border-radius: 8px;
      margin-bottom: 0.375rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #334155;
      color: #cbd5e1;
      cursor: pointer;
      user-select: none;
    }

    .task-person:hover {
      filter: brightness(1.1);
    }

    .task-person-picker {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
    }

    .person-picker-modal-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 1100;
    }

    .person-picker-modal {
      position: fixed;
      width: min(280px, 100%);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 0.75rem;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }

    .priority-picker-modal-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 1100;
    }

    .priority-picker-modal {
      position: fixed;
      width: min(220px, 100%);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 0.75rem;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }

    .category-picker-modal-overlay {
      position: fixed;
      inset: 0;
      background: transparent;
      z-index: 1100;
    }

    .category-picker-modal {
      position: fixed;
      width: min(260px, 100%);
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 0.75rem;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
    }

    .task-category-picker {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
    }

    .task-priority-picker {
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
    }

    .category-select {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
      margin-bottom: 0.5rem;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .person-select {
      background: #1e293b;
      border: 1px solid #475569;
      border-radius: 4px;
      padding: 0.25rem 0.5rem;
      color: #e2e8f0;
      font-size: 0.75rem;
      cursor: pointer;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
    }

    .delete-category-btn {
      background: transparent;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0;
      margin-left: 0.25rem;
      font-size: 0.7rem;
      opacity: 0.7;
    }

    .delete-category-btn:hover {
      opacity: 1;
    }

    .task-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.25rem;
      z-index: 1000;
      backdrop-filter: blur(2px);
    }

    .task-modal {
      width: min(760px, 100%);
      max-height: min(90vh, 860px);
      overflow: auto;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }

    .task-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid #334155;
    }

    .task-modal-title {
      font-size: 1rem;
      font-weight: 600;
      color: #e2e8f0;
      margin: 0;
    }

    .task-modal-close {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 1.1rem;
      line-height: 1;
      padding: 0.25rem;
      border-radius: 4px;
    }

    .task-modal-close:hover {
      background: #334155;
      color: #e2e8f0;
    }

    .task-modal .task-edit-form {
      gap: 0.75rem;
    }

    .task-modal .task-description-input {
      min-height: 180px;
    }

    .task-modal .task-summary-input,
    .task-modal .task-description-input,
    .task-modal .category-select,
    .task-modal .person-select,
    .task-modal .priority-select {
      font-size: 0.9rem;
    }
  `

  @state() private tasks: Task[] = []
  @state() private folderPath: string = ''
  @state() private editingTaskId: string | null = null
  @state() private editSummary: string = ''
  @state() private editDescription: string = ''
  @state() private editCategory: string = DEFAULT_CATEGORY
  @state() private editPerson: string = DEFAULT_PERSON
  @state() private editPriority: TaskPriority = 'medium'
  @state() private draggedTaskId: string | null = null
  @state() private dragOverTaskId: string | null = null
  @state() private categories: Category[] = []
  @state() private selectedCategory: string | null = null // null = show all
  @state() private persons: string[] = [DEFAULT_PERSON]
  @state() private selectedPerson: string | null = null // null = show all
  @state() private addingCategory: boolean = false
  @state() private newCategoryName: string = ''
  @state() private addingPerson: boolean = false
  @state() private newPersonName: string = ''
  @state() private editingPersonName: string | null = null
  @state() private editPersonNameDraft: string = ''
  @state() private personPickerTaskId: string | null = null
  @state() private personPickerAnchor: { left: number; top: number } | null =
    null
  @state() private categoryPickerTaskId: string | null = null
  @state() private categoryPickerAnchor: { left: number; top: number } | null =
    null
  @state() private priorityPickerTaskId: string | null = null
  @state() private priorityPickerAnchor: { left: number; top: number } | null =
    null
  @state() private pendingNewTask: Task | null = null
  @state() private boardTitle: string = DEFAULT_BOARD_TITLE
  @state() private boardTitleDraft: string = DEFAULT_BOARD_TITLE
  @state() private editingBoardTitle: boolean = false
  @state() private topFiltersExpanded: boolean = false
  @state() private backlogExpanded: boolean = false

  connectedCallback() {
    super.connectedCallback()
    this.loadFolderPath()
  }

  private async loadFolderPath() {
    const savedPath = localStorage.getItem('taskboard-folder')
    if (savedPath) {
      this.folderPath = savedPath
      await this.ensureReadmeFile()
      await this.loadBoardTitle()
      await this.ensureDefaultCategory()
      await this.loadCategories()
      await this.migrateOldTasks()
      await this.loadTasks()
    }
  }

  private getMetadataFilePath(fileName: string): string {
    if (!this.folderPath) return fileName
    const sep = this.folderPath.includes('\\') ? '\\' : '/'
    return `${this.folderPath}${sep}${fileName}`
  }

  private async ensureReadmeFile() {
    if (!this.folderPath) return

    try {
      const listResponse = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', folderPath: this.folderPath },
      )

      if (!listResponse.success) return

      const files = listResponse.data?.files || []
      const hasReadme = files.some(
        (file: { name?: string }) =>
          (file.name || '').toLowerCase() === README_FILE_NAME,
      )

      if (hasReadme) return

      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'write-file',
          filePath: this.getMetadataFilePath(README_FILE_NAME),
          content: README_FILE_CONTENT,
        },
      )
    } catch (error: any) {
      console.error('Failed to ensure readme.txt:', error)
    }
  }

  private async readMetadataFile<T>(fileName: string): Promise<T | null> {
    if (!this.folderPath) return null

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'read',
          filePath: this.getMetadataFilePath(fileName),
        },
      )

      if (!response.success || !response.data?.content) {
        return null
      }

      return JSON.parse(response.data.content) as T
    } catch {
      return null
    }
  }

  private async writeMetadataFile(
    fileName: string,
    data: unknown,
  ): Promise<void> {
    if (!this.folderPath) return

    try {
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'write-file',
          filePath: this.getMetadataFilePath(fileName),
          content: JSON.stringify(data, null, 2),
        },
      )
    } catch (error: any) {
      console.error(`Failed to write ${fileName}:`, error)
    }
  }

  private async loadPersons() {
    const storedPersonsData = await this.readMetadataFile<unknown>(
      'taskboard-persons.json',
    )
    const storedPersons = Array.isArray(storedPersonsData)
      ? storedPersonsData.filter(
          (person): person is string =>
            typeof person === 'string' && person.trim().length > 0,
        )
      : []

    const taskPersons = this.tasks
      .map((task) => task.person)
      .filter(
        (person): person is string => !!person && person.trim().length > 0,
      )

    this.persons = Array.from(
      new Set([DEFAULT_PERSON, ...storedPersons, ...taskPersons]),
    )

    if (this.selectedPerson && !this.persons.includes(this.selectedPerson)) {
      this.selectedPerson = null
    }

    await this.persistPersons()
  }

  private async persistPersons() {
    await this.writeMetadataFile('taskboard-persons.json', this.persons)
  }

  private async persistCategories() {
    await this.writeMetadataFile('taskboard-categories.json', this.categories)
  }

  private async loadBoardTitle() {
    const titleData = await this.readMetadataFile<unknown>(
      'taskboard-title.json',
    )

    let nextTitle = DEFAULT_BOARD_TITLE
    if (typeof titleData === 'string') {
      nextTitle = titleData.trim() || DEFAULT_BOARD_TITLE
    } else if (
      typeof titleData === 'object' &&
      !!titleData &&
      typeof (titleData as { title?: unknown }).title === 'string'
    ) {
      nextTitle =
        ((titleData as { title: string }).title || '').trim() ||
        DEFAULT_BOARD_TITLE
    }

    this.boardTitle = nextTitle
    this.boardTitleDraft = nextTitle
  }

  private async persistBoardTitle() {
    const normalizedTitle = this.boardTitle.trim() || DEFAULT_BOARD_TITLE
    this.boardTitle = normalizedTitle
    this.boardTitleDraft = normalizedTitle
    await this.writeMetadataFile('taskboard-title.json', {
      title: normalizedTitle,
    })
  }

  private async startEditingBoardTitle() {
    if (!this.folderPath) return
    this.editingBoardTitle = true
    this.boardTitleDraft = this.boardTitle
    await this.updateComplete
    const input = this.shadowRoot?.querySelector(
      '.board-title-input',
    ) as HTMLInputElement
    input?.focus()
    input?.select()
  }

  private cancelBoardTitleEdit() {
    this.editingBoardTitle = false
    this.boardTitleDraft = this.boardTitle
  }

  private async saveBoardTitle() {
    this.boardTitle = this.boardTitleDraft.trim() || DEFAULT_BOARD_TITLE
    this.editingBoardTitle = false
    await this.persistBoardTitle()
  }

  private getDefaultPersonForNewTask(): string {
    if (this.selectedPerson) {
      return this.selectedPerson
    }

    const normalizedPersons = Array.from(
      new Set(
        this.persons
          .map((person) => person.trim())
          .filter((person) => person.length > 0 && person !== DEFAULT_PERSON),
      ),
    )

    return normalizedPersons.length === 1
      ? normalizedPersons[0]
      : DEFAULT_PERSON
  }

  private async deletePerson(person: string) {
    if (person === DEFAULT_PERSON) {
      alert('Cannot delete the default person!')
      return
    }

    const tasksWithPerson = this.tasks.filter(
      (t) => (t.person || DEFAULT_PERSON) === person,
    )
    if (tasksWithPerson.length > 0) {
      if (
        !confirm(
          `${tasksWithPerson.length} task(s) are assigned to ${person}. Reassign to ${DEFAULT_PERSON} and delete anyway?`,
        )
      ) {
        return
      }

      for (const task of tasksWithPerson) {
        const updatedTask: Task = {
          ...task,
          person: DEFAULT_PERSON,
          updated: new Date().toISOString(),
        }
        this.tasks = this.tasks.map((t) => (t.id === task.id ? updatedTask : t))
        await this.saveTask(updatedTask)
      }
    }

    this.persons = this.persons.filter((p) => p !== person)
    if (this.selectedPerson === person) {
      this.selectedPerson = null
    }
    await this.persistPersons()
  }

  private startRenamePerson(person: string) {
    if (person === DEFAULT_PERSON) return
    this.editingPersonName = person
    this.editPersonNameDraft = person
  }

  private cancelRenamePerson() {
    this.editingPersonName = null
    this.editPersonNameDraft = ''
  }

  private async saveRenamePerson(oldName: string) {
    const newName = this.editPersonNameDraft.trim()

    if (!newName || newName === oldName) {
      this.cancelRenamePerson()
      return
    }

    if (this.persons.includes(newName)) {
      alert('Person already exists!')
      return
    }

    this.persons = this.persons.map((person) =>
      person === oldName ? newName : person,
    )

    if (this.selectedPerson === oldName) {
      this.selectedPerson = newName
    }
    if (this.editPerson === oldName) {
      this.editPerson = newName
    }

    const tasksToUpdate = this.tasks.filter(
      (task) => (task.person || DEFAULT_PERSON) === oldName,
    )

    if (tasksToUpdate.length > 0) {
      const now = new Date().toISOString()
      const updatedTaskMap = new Map<string, Task>()

      for (const task of tasksToUpdate) {
        const updatedTask: Task = {
          ...task,
          person: newName,
          updated: now,
        }
        updatedTaskMap.set(task.id, updatedTask)
        await this.saveTask(updatedTask)
      }

      this.tasks = this.tasks.map((task) => updatedTaskMap.get(task.id) || task)
    }

    await this.persistPersons()
    this.cancelRenamePerson()
  }

  private getCategoryColor(categoryName: string): string {
    const category = this.categories.find((c) => c.name === categoryName)
    return category?.color || CATEGORY_COLORS[0]
  }

  private async loadCategories() {
    if (!this.folderPath) return

    try {
      const storedCategoriesData = await this.readMetadataFile<unknown>(
        'taskboard-categories.json',
      )
      const storedCategories = Array.isArray(storedCategoriesData)
        ? storedCategoriesData.filter(
            (category): category is Category =>
              typeof category === 'object' &&
              !!category &&
              typeof (category as Category).name === 'string' &&
              typeof (category as Category).color === 'string',
          )
        : []

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', folderPath: this.folderPath },
      )

      console.log('loadCategories response:', response)

      if (response.success) {
        const dirs = response.data?.directories || []
        console.log('Found directories:', dirs)

        const colorByName = new Map<string, string>()
        storedCategories.forEach((category) => {
          colorByName.set(category.name, category.color)
        })

        const mergedNames = Array.from(
          new Set([
            DEFAULT_CATEGORY,
            ...storedCategories.map((category) => category.name),
            ...dirs.map((dir: { name: string }) => dir.name),
          ]),
        )

        this.categories = mergedNames.map((name, index) => ({
          name,
          color:
            colorByName.get(name) ||
            CATEGORY_COLORS[index % CATEGORY_COLORS.length],
        }))

        await this.persistCategories()
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error)
    }
  }

  private async createCategoryFolder(name: string) {
    if (!this.folderPath) return

    try {
      const sep = this.folderPath.includes('\\') ? '\\' : '/'
      const folderPath = `${this.folderPath}${sep}${name}`

      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'create-directory', path: folderPath },
      )

      // Add to categories list if not already present
      if (!this.categories.find((c) => c.name === name)) {
        this.categories = [
          ...this.categories,
          {
            name,
            color:
              CATEGORY_COLORS[this.categories.length % CATEGORY_COLORS.length],
          },
        ]
        await this.persistCategories()
      }
    } catch (error: any) {
      console.log('Category folder:', error.message || 'already exists')
    }
  }

  private async selectFolder() {
    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'show-open-dialog',
        {
          properties: ['openDirectory', 'createDirectory'],
          title: 'Select folder for tasks',
        },
      )

      if (
        response.success &&
        !response.canceled &&
        response.filePaths?.length > 0
      ) {
        this.folderPath = response.filePaths[0]
        localStorage.setItem('taskboard-folder', this.folderPath)
        await this.ensureReadmeFile()
        await this.loadBoardTitle()

        console.log('Selected folder:', this.folderPath)

        // Ensure default category folder exists first
        await this.ensureDefaultCategory()
        console.log('After ensureDefaultCategory, categories:', this.categories)

        await this.loadCategories()
        console.log('After loadCategories, categories:', this.categories)

        await this.migrateOldTasks()
        console.log('After migration')

        await this.loadTasks()
        console.log('After loadTasks, tasks:', this.tasks)
      }
    } catch (error: any) {
      console.error('Failed to select folder:', error)
    }
  }

  private async ensureDefaultCategory() {
    if (!this.folderPath) return

    try {
      // Use path.join equivalent - replace forward slashes with backslashes on Windows
      const sep = this.folderPath.includes('\\') ? '\\' : '/'
      const folderPath = `${this.folderPath}${sep}${DEFAULT_CATEGORY}`

      console.log('Creating default category at:', folderPath)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'create-directory', path: folderPath },
      )
      console.log('Default category folder created:', response)

      // Make sure default category is in the list
      if (!this.categories.find((c) => c.name === DEFAULT_CATEGORY)) {
        this.categories = [
          {
            name: DEFAULT_CATEGORY,
            color: CATEGORY_COLORS[0],
          },
          ...this.categories,
        ]
        await this.persistCategories()
      }
    } catch (error: any) {
      console.log('Default category folder:', error.message || 'error')
    }
  }

  private async migrateOldTasks() {
    if (!this.folderPath) return

    try {
      const sep = this.folderPath.includes('\\') ? '\\' : '/'

      // Check for tasks in root folder (old format)
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', folderPath: this.folderPath },
      )

      if (response.success) {
        const files = response.data?.files || []

        for (const file of files) {
          if (file.name.endsWith('.json') && file.name.startsWith('task-')) {
            try {
              // Read the old task
              const readResponse = await (
                window as any
              ).electron.ipcRenderer.invoke('cli-execute', 'file-operations', {
                operation: 'read',
                filePath: file.path,
              })

              if (readResponse.success && readResponse.data?.content) {
                const task = JSON.parse(readResponse.data.content) as Task

                // Set category if not present
                if (!task.category) {
                  task.category = DEFAULT_CATEGORY
                }

                // Save to category folder
                const newFilePath = `${this.folderPath}${sep}${task.category}${sep}${task.id}.json`
                await (window as any).electron.ipcRenderer.invoke(
                  'cli-execute',
                  'file-operations',
                  {
                    operation: 'write-file',
                    filePath: newFilePath,
                    content: JSON.stringify(task, null, 2),
                  },
                )

                // Delete old file from root
                await (window as any).electron.ipcRenderer.invoke(
                  'cli-execute',
                  'file-operations',
                  { operation: 'delete', sourcePath: file.path },
                )
              }
            } catch (e) {
              console.error('Failed to migrate task:', file.path, e)
            }
          }
        }
      }
    } catch (error: any) {
      console.log('Migration check:', error.message || 'no old tasks found')
    }
  }

  private async loadTasks() {
    if (!this.folderPath) return

    try {
      const tasks: Task[] = []
      const sep = this.folderPath.includes('\\') ? '\\' : '/'

      console.log('Loading tasks from categories:', this.categories)

      for (const category of this.categories) {
        const categoryPath = `${this.folderPath}${sep}${category.name}`
        console.log('Checking category path:', categoryPath)

        const response = await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          { operation: 'list', folderPath: categoryPath },
        )

        console.log(`Files in ${category.name}:`, response)

        if (response.success) {
          const files = response.data?.files || []

          for (const file of files) {
            if (file.name.endsWith('.json')) {
              try {
                const readResponse = await (
                  window as any
                ).electron.ipcRenderer.invoke(
                  'cli-execute',
                  'file-operations',
                  { operation: 'read', filePath: file.path },
                )
                console.log(
                  'Read task file:',
                  file.path,
                  readResponse.data?.content,
                )
                if (readResponse.success && readResponse.data?.content) {
                  const task = JSON.parse(readResponse.data.content) as Task
                  task.category = task.category || category.name
                  task.person = task.person || DEFAULT_PERSON
                  tasks.push(task)
                }
              } catch (e) {
                console.error('Failed to read task file:', file.path, e)
              }
            }
          }
        }
      }

      this.tasks = tasks.sort((a, b) => a.order - b.order)
      await this.loadPersons()
      console.log('Loaded tasks:', this.tasks)
    } catch (error: any) {
      console.error('Failed to load tasks:', error)
    }
  }

  private async saveTask(task: Task, oldCategory?: string) {
    if (!this.folderPath) return

    try {
      const sep = this.folderPath.includes('\\') ? '\\' : '/'

      if (oldCategory && oldCategory !== task.category) {
        const oldFilePath = `${this.folderPath}${sep}${oldCategory}${sep}${task.id}.json`
        await (window as any).electron.ipcRenderer.invoke(
          'cli-execute',
          'file-operations',
          { operation: 'delete', sourcePath: oldFilePath },
        )
      }

      const filePath = `${this.folderPath}${sep}${task.category}${sep}${task.id}.json`
      console.log('Saving task to:', filePath)

      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'write-file',
          filePath,
          content: JSON.stringify(task, null, 2),
        },
      )
      console.log('Save task response:', response)
    } catch (error: any) {
      console.error('Failed to save task:', error)
    }
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async addTask(status: TaskStatus) {
    const now = new Date().toISOString()
    const category = this.selectedCategory || DEFAULT_CATEGORY
    const person = this.getDefaultPersonForNewTask()
    const tasksInColumn = this.tasks.filter((t) => t.status === status)
    const maxOrder =
      tasksInColumn.length > 0
        ? Math.max(...tasksInColumn.map((t) => t.order))
        : -1

    const newTask: Task = {
      id: this.generateId(),
      summary: '',
      description: '',
      status,
      priority: 'medium',
      category,
      person,
      created: now,
      updated: now,
      order: maxOrder + 1,
    }

    this.pendingNewTask = newTask
    this.editingTaskId = newTask.id
    this.editSummary = newTask.summary
    this.editDescription = newTask.description
    this.editCategory = newTask.category
    this.editPerson = person
    this.editPriority = newTask.priority

    if (!this.persons.includes(person)) {
      this.persons = [...this.persons, person]
      this.persistPersons()
    }
  }

  private startEditing(task: Task) {
    this.editingTaskId = task.id
    this.editSummary = task.summary
    this.editDescription = task.description
    this.editCategory = task.category || DEFAULT_CATEGORY
    this.editPerson = task.person || DEFAULT_PERSON
    this.editPriority = task.priority
  }

  private async saveEditing() {
    if (!this.editingTaskId) return

    if (this.pendingNewTask && this.pendingNewTask.id === this.editingTaskId) {
      const createdTask: Task = {
        ...this.pendingNewTask,
        summary: this.editSummary.trim() || 'Untitled',
        description: this.editDescription,
        category: this.editCategory,
        person: this.editPerson || DEFAULT_PERSON,
        priority: this.editPriority,
        updated: new Date().toISOString(),
      }

      this.tasks = [...this.tasks, createdTask]
      await this.saveTask(createdTask)

      if (!this.persons.includes(createdTask.person || DEFAULT_PERSON)) {
        this.persons = [...this.persons, createdTask.person || DEFAULT_PERSON]
        await this.persistPersons()
      }

      this.pendingNewTask = null
      this.editingTaskId = null
      return
    }

    const taskIndex = this.tasks.findIndex((t) => t.id === this.editingTaskId)
    if (taskIndex === -1) return

    const oldTask = this.tasks[taskIndex]
    const categoryChanged = oldTask.category !== this.editCategory

    const updatedTask: Task = {
      ...oldTask,
      summary: this.editSummary.trim() || 'Untitled',
      description: this.editDescription,
      category: this.editCategory,
      person: this.editPerson || DEFAULT_PERSON,
      priority: this.editPriority,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask
    this.tasks = newTasks

    await this.saveTask(
      updatedTask,
      categoryChanged ? oldTask.category : undefined,
    )

    if (!this.persons.includes(updatedTask.person || DEFAULT_PERSON)) {
      this.persons = [...this.persons, updatedTask.person || DEFAULT_PERSON]
      await this.persistPersons()
    }

    this.editingTaskId = null
  }

  private cancelEditing() {
    if (this.pendingNewTask && this.pendingNewTask.id === this.editingTaskId) {
      this.pendingNewTask = null
    }
    this.editingTaskId = null
  }

  private async updateTaskPerson(task: Task, person: string) {
    const normalizedPerson = person || DEFAULT_PERSON

    if ((task.person || DEFAULT_PERSON) === normalizedPerson) {
      this.closePersonPicker()
      return
    }

    if (!this.persons.includes(normalizedPerson)) {
      this.persons = [...this.persons, normalizedPerson]
      await this.persistPersons()
    }

    const updatedTask: Task = {
      ...task,
      person: normalizedPerson,
      updated: new Date().toISOString(),
    }

    this.tasks = this.tasks.map((t) => (t.id === task.id ? updatedTask : t))
    await this.saveTask(updatedTask)
    this.closePersonPicker()
  }

  private async updateTaskPriority(task: Task, priority: TaskPriority) {
    if (task.priority === priority) {
      this.closePriorityPicker()
      return
    }

    const updatedTask: Task = {
      ...task,
      priority,
      updated: new Date().toISOString(),
    }

    this.tasks = this.tasks.map((t) => (t.id === task.id ? updatedTask : t))
    await this.saveTask(updatedTask)
    this.closePriorityPicker()
  }

  private closePersonPicker() {
    this.personPickerTaskId = null
    this.personPickerAnchor = null
  }

  private closeCategoryPicker() {
    this.categoryPickerTaskId = null
    this.categoryPickerAnchor = null
  }

  private closePriorityPicker() {
    this.priorityPickerTaskId = null
    this.priorityPickerAnchor = null
  }

  private async openPersonPicker(taskId: string, trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect()
    const popupWidth = 280
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - popupWidth - 8),
    )
    const top = Math.max(8, rect.bottom + 6)

    this.personPickerTaskId = taskId
    this.personPickerAnchor = { left, top }

    await this.updateComplete

    const picker = this.shadowRoot?.querySelector(
      '.person-picker-modal .task-person-picker',
    ) as HTMLSelectElement | null

    if (!picker) return

    picker.focus()
    try {
      ;(picker as any).showPicker?.()
    } catch {
      picker.click()
    }
  }

  private async openPriorityPicker(taskId: string, trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect()
    const popupWidth = 220
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - popupWidth - 8),
    )
    const top = Math.max(8, rect.bottom + 6)

    this.priorityPickerTaskId = taskId
    this.priorityPickerAnchor = { left, top }

    await this.updateComplete

    const picker = this.shadowRoot?.querySelector(
      '.priority-picker-modal .task-priority-picker',
    ) as HTMLSelectElement | null

    if (!picker) return

    picker.focus()
    try {
      ;(picker as any).showPicker?.()
    } catch {
      picker.click()
    }
  }

  private async openCategoryPicker(taskId: string, trigger: HTMLElement) {
    const rect = trigger.getBoundingClientRect()
    const popupWidth = 260
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - popupWidth - 8),
    )
    const top = Math.max(8, rect.bottom + 6)

    this.categoryPickerTaskId = taskId
    this.categoryPickerAnchor = { left, top }

    await this.updateComplete

    const picker = this.shadowRoot?.querySelector(
      '.category-picker-modal .task-category-picker',
    ) as HTMLSelectElement | null

    if (!picker) return

    picker.focus()
    try {
      ;(picker as any).showPicker?.()
    } catch {
      picker.click()
    }
  }

  private async updateTaskCategory(task: Task, category: string) {
    const taskIndex = this.tasks.findIndex((t) => t.id === task.id)
    if (taskIndex === -1) return

    const oldCategory = task.category
    const updatedTask: Task = {
      ...task,
      category,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask
    this.tasks = newTasks

    await this.saveTask(updatedTask, oldCategory)
  }

  private async deleteTask(task: Task) {
    if (!confirm(`Delete task "${task.summary}"?`)) return

    try {
      const sep = this.folderPath.includes('\\') ? '\\' : '/'
      const filePath = `${this.folderPath}${sep}${task.category}${sep}${task.id}.json`
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'delete', sourcePath: filePath },
      )
      this.tasks = this.tasks.filter((t) => t.id !== task.id)
    } catch (error: any) {
      console.error('Failed to delete task:', error)
    }
  }

  private async deleteCategory(category: Category) {
    if (category.name === DEFAULT_CATEGORY) {
      alert('Cannot delete the default category!')
      return
    }

    const tasksInCategory = this.tasks.filter(
      (t) => t.category === category.name,
    )
    if (tasksInCategory.length > 0) {
      if (
        !confirm(
          `This category contains ${tasksInCategory.length} task(s). Delete anyway? Tasks will be moved to ${DEFAULT_CATEGORY}.`,
        )
      ) {
        return
      }

      for (const task of tasksInCategory) {
        await this.updateTaskCategory(task, DEFAULT_CATEGORY)
      }
    }

    try {
      const sep = this.folderPath.includes('\\') ? '\\' : '/'
      const folderPath = `${this.folderPath}${sep}${category.name}`
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'delete', sourcePath: folderPath },
      )

      this.categories = this.categories.filter((c) => c.name !== category.name)
      await this.persistCategories()

      if (this.selectedCategory === category.name) {
        this.selectedCategory = null
      }
    } catch (error: any) {
      console.error('Failed to delete category:', error)
    }
  }

  // Drag and Drop handlers
  private onDragStart(e: DragEvent, task: Task) {
    this.draggedTaskId = task.id
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', task.id)
    }
  }

  private onDragEnd() {
    this.draggedTaskId = null
    this.dragOverTaskId = null
  }

  private onTaskDragOver(e: DragEvent, task: Task) {
    e.preventDefault()
    e.stopPropagation()
    if (this.draggedTaskId && this.draggedTaskId !== task.id) {
      this.dragOverTaskId = task.id
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move'
      }
    }
  }

  private onTaskDragLeave(_e: DragEvent, task: Task) {
    if (this.dragOverTaskId === task.id) {
      this.dragOverTaskId = null
    }
  }

  private async onTaskDrop(e: DragEvent, dropOnTask: Task) {
    e.preventDefault()
    e.stopPropagation()

    if (!this.draggedTaskId || this.draggedTaskId === dropOnTask.id) return

    const draggedTaskIndex = this.tasks.findIndex(
      (t) => t.id === this.draggedTaskId,
    )
    if (draggedTaskIndex === -1) return

    const draggedTask = this.tasks[draggedTaskIndex]
    const dropTargetIndexBeforeRemoval = this.tasks.findIndex(
      (t) => t.id === dropOnTask.id,
    )

    const newTasks = [...this.tasks]

    // Determine if dragging down (to a later position)
    const isDraggingDown = draggedTaskIndex < dropTargetIndexBeforeRemoval

    // Remove dragged task from array
    newTasks.splice(draggedTaskIndex, 1)

    // Find new position after removal
    let dropTargetIndex = newTasks.findIndex((t) => t.id === dropOnTask.id)

    // If dragging down, insert after the target; if dragging up, insert before
    if (isDraggingDown) {
      dropTargetIndex += 1
    }

    // Update status if moving to different column
    const updatedTask: Task = {
      ...draggedTask,
      status: dropOnTask.status,
      updated: new Date().toISOString(),
    }

    // Insert at the calculated position
    newTasks.splice(dropTargetIndex, 0, updatedTask)

    // Reassign order numbers for all tasks in affected columns
    const affectedStatuses = new Set([draggedTask.status, dropOnTask.status])

    affectedStatuses.forEach((status) => {
      const tasksInColumn = newTasks.filter((t) => t.status === status)

      tasksInColumn.forEach((t, index) => {
        t.order = index
      })
    })

    this.tasks = newTasks
    this.dragOverTaskId = null

    // Save all affected tasks
    const tasksToSave = newTasks.filter((t) => affectedStatuses.has(t.status))
    for (const t of tasksToSave) {
      await this.saveTask(t)
    }

    this.draggedTaskId = null
  }

  private onDragOver(e: DragEvent) {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  private onDragEnter(e: DragEvent) {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.classList.add('drag-over')
  }

  private onDragLeave(e: DragEvent) {
    const target = e.currentTarget as HTMLElement
    const relatedTarget = e.relatedTarget as HTMLElement

    // Only remove drag-over if we're actually leaving the column-content
    // (not just moving over a child element like a task card)
    if (relatedTarget && target.contains(relatedTarget)) {
      return
    }

    target.classList.remove('drag-over')
  }

  private async onDrop(e: DragEvent, newStatus: TaskStatus) {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.classList.remove('drag-over')

    if (!this.draggedTaskId) return

    const taskIndex = this.tasks.findIndex((t) => t.id === this.draggedTaskId)
    if (taskIndex === -1) return

    const task = this.tasks[taskIndex]

    // Update task status and place at end of column
    const updatedTask: Task = {
      ...task,
      status: newStatus,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask

    // Reassign order numbers for all tasks in affected columns
    const affectedStatuses = new Set([task.status, newStatus])

    affectedStatuses.forEach((status) => {
      const tasksInColumn = newTasks
        .filter((t) => t.status === status)
        .sort((a, b) => a.order - b.order)

      tasksInColumn.forEach((t, index) => {
        t.order = index
      })
    })

    this.tasks = newTasks

    // Save all affected tasks
    const tasksToSave = newTasks.filter((t) => affectedStatuses.has(t.status))
    for (const t of tasksToSave) {
      await this.saveTask(t)
    }

    this.draggedTaskId = null
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = String(date.getFullYear())
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year} ${hours}:${minutes}`
  }

  private renderTask(task: Task) {
    const isEditing = this.editingTaskId === task.id
    const isDragging = this.draggedTaskId === task.id
    const isDragOver = this.dragOverTaskId === task.id
    const categoryColor = this.getCategoryColor(task.category)
    const descriptionText = task.description || ''
    const showDescriptionMore = descriptionText.length > 180
    const personName = task.person?.trim() || DEFAULT_PERSON

    return html`
      <div
        class="task-card ${isDragging ? 'dragging' : ''} ${isEditing
          ? 'editing'
          : ''} ${isDragOver ? 'drag-over' : ''}"
        draggable=${isEditing ? 'false' : 'true'}
        @dragstart=${(e: DragEvent) => this.onDragStart(e, task)}
        @dragend=${this.onDragEnd}
        @dragover=${(e: DragEvent) => this.onTaskDragOver(e, task)}
        @dragleave=${(e: DragEvent) => this.onTaskDragLeave(e, task)}
        @drop=${(e: DragEvent) => this.onTaskDrop(e, task)}
      >
        <div
          class="task-category"
          style="background: ${categoryColor}20; color: ${categoryColor}"
          @click=${async (e: Event) => {
            e.stopPropagation()
            if (this.categoryPickerTaskId === task.id) {
              this.closeCategoryPicker()
              return
            }

            this.closePersonPicker()
            this.closePriorityPicker()
            const trigger = e.currentTarget as HTMLElement
            await this.openCategoryPicker(task.id, trigger)
          }}
          title="Click to change category"
        >
          <span
            class="category-dot"
            style="background: ${categoryColor}"
          ></span>
          ${task.category}
        </div>

        <div
          class="task-priority"
          style="background: ${PRIORITY_COLORS[
            task.priority
          ]}20; color: ${PRIORITY_COLORS[task.priority]}"
          @click=${async (e: Event) => {
            e.stopPropagation()
            if (this.priorityPickerTaskId === task.id) {
              this.closePriorityPicker()
              return
            }

            this.closePersonPicker()
            this.closeCategoryPicker()
            const trigger = e.currentTarget as HTMLElement
            await this.openPriorityPicker(task.id, trigger)
          }}
          title="Click to change priority"
        >
          ${task.priority}
        </div>

        <div
          class="task-person"
          @click=${async (e: Event) => {
            e.stopPropagation()
            if (this.personPickerTaskId === task.id) {
              this.closePersonPicker()
              return
            }

            this.closeCategoryPicker()
            this.closePriorityPicker()
            const trigger = e.currentTarget as HTMLElement
            await this.openPersonPicker(task.id, trigger)
          }}
          title="Click to change person"
        >
          👤 ${personName}
        </div>

        <div class="task-summary" @dblclick=${() => this.startEditing(task)}>
          ${task.summary}
        </div>
        ${descriptionText
          ? html`
              <div class="task-description" title=${descriptionText}>
                ${descriptionText}
              </div>
              ${showDescriptionMore
                ? html`<div class="task-description-more">...</div>`
                : ''}
            `
          : ''}

        <div class="task-meta">
          <span>Last edited: ${this.formatDate(task.updated)}</span>
          ${!isEditing
            ? html`
                <div class="task-actions">
                  <button
                    class="task-action-btn"
                    @click=${() => this.startEditing(task)}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    class="task-action-btn delete"
                    @click=${() => this.deleteTask(task)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              `
            : ''}
        </div>
      </div>
    `
  }

  private renderTaskPersonPickerModal() {
    if (!this.personPickerTaskId || !this.personPickerAnchor) return ''

    const task = this.tasks.find((t) => t.id === this.personPickerTaskId)
    if (!task) return ''

    const currentPerson = task.person?.trim() || DEFAULT_PERSON
    const personOptions = Array.from(new Set([currentPerson, ...this.persons]))

    return html`
      <div
        class="person-picker-modal-overlay"
        @click=${() => {
          this.closePersonPicker()
        }}
      >
        <div
          class="person-picker-modal"
          style="left: ${this.personPickerAnchor.left}px; top: ${this
            .personPickerAnchor.top}px;"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <select
            class="task-person-picker"
            .value=${currentPerson}
            @change=${async (e: Event) => {
              await this.updateTaskPerson(
                task,
                (e.target as HTMLSelectElement).value,
              )
            }}
          >
            ${personOptions.map(
              (person) => html`<option value=${person}>${person}</option>`,
            )}
          </select>
        </div>
      </div>
    `
  }

  private renderTaskPriorityPickerModal() {
    if (!this.priorityPickerTaskId || !this.priorityPickerAnchor) return ''

    const task = this.tasks.find((t) => t.id === this.priorityPickerTaskId)
    if (!task) return ''

    return html`
      <div
        class="priority-picker-modal-overlay"
        @click=${() => {
          this.closePriorityPicker()
        }}
      >
        <div
          class="priority-picker-modal"
          style="left: ${this.priorityPickerAnchor.left}px; top: ${this
            .priorityPickerAnchor.top}px;"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <select
            class="task-priority-picker"
            .value=${task.priority}
            @change=${async (e: Event) => {
              await this.updateTaskPriority(
                task,
                (e.target as HTMLSelectElement).value as TaskPriority,
              )
            }}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
      </div>
    `
  }

  private renderTaskCategoryPickerModal() {
    if (!this.categoryPickerTaskId || !this.categoryPickerAnchor) return ''

    const task = this.tasks.find((t) => t.id === this.categoryPickerTaskId)
    if (!task) return ''

    return html`
      <div
        class="category-picker-modal-overlay"
        @click=${() => {
          this.closeCategoryPicker()
        }}
      >
        <div
          class="category-picker-modal"
          style="left: ${this.categoryPickerAnchor.left}px; top: ${this
            .categoryPickerAnchor.top}px;"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <select
            class="task-category-picker"
            .value=${task.category}
            @change=${async (e: Event) => {
              const selectedCategory = (e.target as HTMLSelectElement).value
              if (selectedCategory === task.category) {
                this.closeCategoryPicker()
                return
              }
              await this.updateTaskCategory(task, selectedCategory)
              this.closeCategoryPicker()
            }}
          >
            ${this.categories.map(
              (category) =>
                html`<option value=${category.name}>${category.name}</option>`,
            )}
          </select>
        </div>
      </div>
    `
  }

  private renderTaskModal() {
    if (!this.editingTaskId) return ''

    const editingTask = this.tasks.find((t) => t.id === this.editingTaskId)
    const titleText = editingTask?.summary?.trim()
      ? `Edit Task: ${editingTask.summary}`
      : 'New Task'
    const modalPersonOptions = Array.from(
      new Set([this.editPerson || DEFAULT_PERSON, ...this.persons]),
    )

    return html`
      <div class="task-modal-overlay" @click=${this.cancelEditing}>
        <div class="task-modal" @click=${(e: Event) => e.stopPropagation()}>
          <div class="task-modal-header">
            <h3 class="task-modal-title">${titleText}</h3>
            <button
              class="task-modal-close"
              @click=${this.cancelEditing}
              title="Close"
            >
              ✕
            </button>
          </div>

          <div class="task-edit-form">
            <select
              class="category-select"
              .value=${this.editCategory}
              @change=${(e: Event) => {
                this.editCategory = (e.target as HTMLSelectElement).value
              }}
            >
              ${this.categories.map(
                (cat) => html`<option value=${cat.name}>${cat.name}</option>`,
              )}
            </select>

            <select
              class="person-select"
              .value=${this.editPerson}
              @change=${(e: Event) => {
                this.editPerson = (e.target as HTMLSelectElement).value
              }}
            >
              ${modalPersonOptions.map(
                (person) => html`<option value=${person}>${person}</option>`,
              )}
            </select>

            <input
              type="text"
              class="task-summary-input"
              .value=${this.editSummary}
              @input=${(e: Event) => {
                this.editSummary = (e.target as HTMLInputElement).value
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === 'Enter' && !e.shiftKey) this.saveEditing()
                if (e.key === 'Escape') this.cancelEditing()
              }}
              placeholder="Task summary"
            />

            <textarea
              class="task-description-input"
              .value=${this.editDescription}
              @input=${(e: Event) => {
                this.editDescription = (e.target as HTMLTextAreaElement).value
              }}
              placeholder="Description..."
            ></textarea>

            <select
              class="priority-select"
              .value=${this.editPriority}
              @change=${(e: Event) => {
                this.editPriority = (e.target as HTMLSelectElement)
                  .value as TaskPriority
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>

            <div class="edit-buttons">
              <button class="btn btn-primary" @click=${this.saveEditing}>
                Save
              </button>
              <button class="btn btn-secondary" @click=${this.cancelEditing}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `
  }

  private renderColumn(column: {
    id: TaskStatus
    label: string
    color: string
  }) {
    const columnTasks = this.tasks
      .filter((t) => {
        const statusMatch = t.status === column.id
        const categoryMatch =
          !this.selectedCategory || t.category === this.selectedCategory
        const personMatch =
          !this.selectedPerson ||
          (t.person || DEFAULT_PERSON) === this.selectedPerson
        return statusMatch && categoryMatch && personMatch
      })
      .sort((a, b) => a.order - b.order)

    return html`
      <div class="column">
        <div class="column-header">
          <div class="column-title">
            <span
              class="column-indicator"
              style="background: ${column.color}"
            ></span>
            ${column.label}
          </div>
          <span class="column-count">${columnTasks.length}</span>
        </div>
        <div
          class="column-content"
          @dragover=${this.onDragOver}
          @dragenter=${this.onDragEnter}
          @dragleave=${this.onDragLeave}
          @drop=${(e: DragEvent) => this.onDrop(e, column.id)}
        >
          ${columnTasks.map((task) => this.renderTask(task))}
          <button class="add-task-btn" @click=${() => this.addTask(column.id)}>
            + Add Task
          </button>
        </div>
      </div>
    `
  }

  private renderBacklog() {
    const backlogTasks = this.tasks
      .filter((t) => {
        const statusMatch = t.status === 'backlog'
        const categoryMatch =
          !this.selectedCategory || t.category === this.selectedCategory
        const personMatch =
          !this.selectedPerson ||
          (t.person || DEFAULT_PERSON) === this.selectedPerson
        return statusMatch && categoryMatch && personMatch
      })
      .sort((a, b) => a.order - b.order)

    return html`
      <div
        class="backlog-section ${this.backlogExpanded ? 'expanded' : ''}"
        @dragover=${this.onDragOver}
        @dragenter=${this.onDragEnter}
        @dragleave=${this.onDragLeave}
        @drop=${(e: DragEvent) => this.onDrop(e, 'backlog')}
      >
        <div class="backlog-header">
          <span>🗂️ Backlog</span>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="column-count">${backlogTasks.length}</span>
            <button
              class="backlog-toggle-btn"
              @click=${(e: Event) => {
                e.stopPropagation()
                this.backlogExpanded = !this.backlogExpanded
              }}
            >
              ${this.backlogExpanded ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div
          class="column-content backlog-content ${this.backlogExpanded
            ? ''
            : 'hidden'}"
          @dragover=${this.onDragOver}
          @dragenter=${this.onDragEnter}
          @dragleave=${this.onDragLeave}
          @drop=${(e: DragEvent) => this.onDrop(e, 'backlog')}
        >
          ${backlogTasks.map((task) => this.renderTask(task))}
          <button class="add-task-btn" @click=${() => this.addTask('backlog')}>
            + Add Backlog Task
          </button>
        </div>
      </div>
    `
  }

  private renderTopFilters() {
    return html`
      <div class="filter-section">
        <div class="filter-header">
          <span>🔎 Filters</span>
          <button
            class="backlog-toggle-btn"
            @click=${() => {
              this.topFiltersExpanded = !this.topFiltersExpanded
            }}
          >
            ${this.topFiltersExpanded ? 'Hide' : 'Show'}
          </button>
        </div>

        <div class="filter-content ${this.topFiltersExpanded ? '' : 'hidden'}">
          <div class="top-filters-row">
            ${this.renderCategoryBar()} ${this.renderPersonBar()}
          </div>
        </div>
      </div>
    `
  }

  private renderCategoryBar() {
    return html`
      <div class="category-bar">
        <div
          class="category-chip all ${this.selectedCategory === null
            ? 'active'
            : ''}"
          @click=${() => {
            this.selectedCategory = null
          }}
        >
          All Tasks (${this.tasks.length})
        </div>
        ${this.categories.map(
          (category) => html`
            <div
              class="category-chip ${this.selectedCategory === category.name
                ? 'active'
                : ''}"
              style="background: ${category.color}30; color: ${category.color}"
              @click=${() => {
                this.selectedCategory = category.name
              }}
            >
              <span
                class="category-dot"
                style="background: ${category.color}"
              ></span>
              ${category.name}
              (${this.tasks.filter((t) => t.category === category.name).length})
              ${category.name !== DEFAULT_CATEGORY
                ? html`
                    <span
                      class="delete-category-btn"
                      @click=${(e: Event) => {
                        e.stopPropagation()
                        this.deleteCategory(category)
                      }}
                      title="Delete category"
                    >
                      ×
                    </span>
                  `
                : ''}
            </div>
          `,
        )}
        ${this.addingCategory
          ? html`
              <div class="category-input-wrapper">
                <input
                  type="text"
                  class="category-input"
                  placeholder="Category name"
                  .value=${this.newCategoryName}
                  @input=${(e: Event) => {
                    this.newCategoryName = (e.target as HTMLInputElement).value
                  }}
                  @keydown=${async (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && this.newCategoryName.trim()) {
                      const name = this.newCategoryName.trim()
                      if (this.categories.find((c) => c.name === name)) {
                        alert('Category already exists!')
                        return
                      }
                      await this.createCategoryFolder(name)
                      this.newCategoryName = ''
                      this.addingCategory = false
                    }
                    if (e.key === 'Escape') {
                      this.addingCategory = false
                      this.newCategoryName = ''
                    }
                  }}
                  @blur=${() => {
                    setTimeout(() => {
                      this.addingCategory = false
                      this.newCategoryName = ''
                    }, 200)
                  }}
                />
              </div>
            `
          : html`
              <button
                class="add-category-btn"
                @click=${async () => {
                  this.addingCategory = true
                  await this.updateComplete
                  const input = this.shadowRoot?.querySelector(
                    '.category-input',
                  ) as HTMLInputElement
                  input?.focus()
                }}
              >
                + Add Category
              </button>
            `}
      </div>
    `
  }

  private renderPersonBar() {
    return html`
      <div class="person-bar">
        <div
          class="person-chip all ${this.selectedPerson === null
            ? 'active'
            : ''}"
          @click=${() => {
            this.selectedPerson = null
          }}
        >
          All Persons
        </div>
        ${this.persons.map(
          (person) => html`
            <div
              class="person-chip ${this.selectedPerson === person
                ? 'active'
                : ''}"
              @click=${() => {
                this.selectedPerson = person
              }}
            >
              👤
              ${this.editingPersonName === person
                ? html`
                    <input
                      class="person-rename-input"
                      list="person-name-options"
                      .value=${this.editPersonNameDraft}
                      @click=${(e: Event) => e.stopPropagation()}
                      @input=${(e: Event) => {
                        this.editPersonNameDraft = (
                          e.target as HTMLInputElement
                        ).value
                      }}
                      @keydown=${async (e: KeyboardEvent) => {
                        e.stopPropagation()
                        if (e.key === 'Enter') {
                          await this.saveRenamePerson(person)
                        }
                        if (e.key === 'Escape') {
                          this.cancelRenamePerson()
                        }
                      }}
                      @blur=${async () => {
                        await this.saveRenamePerson(person)
                      }}
                    />
                  `
                : html`
                    <span
                      class="person-name"
                      @click=${(e: Event) => {
                        e.stopPropagation()
                        this.startRenamePerson(person)
                      }}
                      title="Click to rename"
                    >
                      ${person}
                    </span>
                  `}
              (${this.tasks.filter(
                (t) => (t.person || DEFAULT_PERSON) === person,
              ).length})
              ${person !== DEFAULT_PERSON
                ? html`
                    <span
                      class="delete-category-btn"
                      @click=${(e: Event) => {
                        e.stopPropagation()
                        this.deletePerson(person)
                      }}
                      title="Delete person"
                    >
                      ×
                    </span>
                  `
                : ''}
            </div>
          `,
        )}
        ${this.addingPerson
          ? html`
              <div class="person-input-wrapper">
                <input
                  type="text"
                  class="person-input"
                  placeholder="Person name"
                  .value=${this.newPersonName}
                  @input=${(e: Event) => {
                    this.newPersonName = (e.target as HTMLInputElement).value
                  }}
                  @keydown=${async (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && this.newPersonName.trim()) {
                      const name = this.newPersonName.trim()
                      if (this.persons.includes(name)) {
                        alert('Person already exists!')
                        return
                      }
                      this.persons = [...this.persons, name]
                      await this.persistPersons()
                      this.newPersonName = ''
                      this.addingPerson = false
                    }
                    if (e.key === 'Escape') {
                      this.addingPerson = false
                      this.newPersonName = ''
                    }
                  }}
                  @blur=${() => {
                    setTimeout(() => {
                      this.addingPerson = false
                      this.newPersonName = ''
                    }, 200)
                  }}
                />
              </div>
            `
          : html`
              <button
                class="add-person-btn"
                @click=${async () => {
                  this.addingPerson = true
                  await this.updateComplete
                  const input = this.shadowRoot?.querySelector(
                    '.person-input',
                  ) as HTMLInputElement
                  input?.focus()
                }}
              >
                + Add Person
              </button>
            `}
        <datalist id="person-name-options">
          ${this.persons
            .filter((person) => person !== this.editingPersonName)
            .map((person) => html`<option value=${person}></option>`)}
        </datalist>
      </div>
    `
  }

  render() {
    return html`
      <div class="content">
        <div class="header">
          <h1>
            <span class="header-title-main">📋 Nice2Have Taskboard</span>
            ${this.folderPath
              ? html`
                  <span class="header-title-group">
                    <span class="board-title-separator">-</span>
                    ${this.editingBoardTitle
                      ? html`
                          <input
                            class="board-title-input"
                            .value=${this.boardTitleDraft}
                            @input=${(e: Event) => {
                              this.boardTitleDraft = (
                                e.target as HTMLInputElement
                              ).value
                            }}
                            @keydown=${async (e: KeyboardEvent) => {
                              if (e.key === 'Enter') {
                                await this.saveBoardTitle()
                              }
                              if (e.key === 'Escape') {
                                this.cancelBoardTitleEdit()
                              }
                            }}
                            @blur=${async () => {
                              await this.saveBoardTitle()
                            }}
                          />
                        `
                      : html`
                          <span
                            class="board-title"
                            title="Click to edit board title"
                            @click=${async () => {
                              await this.startEditingBoardTitle()
                            }}
                          >
                            ${this.boardTitle}
                          </span>
                        `}
                  </span>
                `
              : ''}
          </h1>
          <div class="header-actions">
            ${this.folderPath
              ? html`<span class="folder-path" title=${this.folderPath}
                  >${this.folderPath}</span
                >`
              : ''}
            <button class="btn btn-secondary" @click=${this.selectFolder}>
              ${this.folderPath ? 'Change Folder' : 'Select Folder'}
            </button>
            ${this.folderPath
              ? html`<button
                  class="btn btn-secondary"
                  @click=${async () => {
                    await this.loadCategories()
                    await this.loadTasks()
                  }}
                >
                  🔄 Refresh
                </button>`
              : ''}
          </div>
        </div>

        ${this.folderPath
          ? html`
              ${this.renderTopFilters()}
              <div class="board">
                ${COLUMNS.map((column) => this.renderColumn(column))}
              </div>
              ${this.renderBacklog()} ${this.renderTaskModal()}
              ${this.renderTaskPersonPickerModal()}
              ${this.renderTaskPriorityPickerModal()}
              ${this.renderTaskCategoryPickerModal()}
            `
          : html`
              <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h2>Welcome to Taskboard</h2>
                <p>Select a folder to store your tasks</p>
                <button class="btn btn-primary" @click=${this.selectFolder}>
                  Select Folder
                </button>
              </div>
            `}
      </div>
    `
  }
}
