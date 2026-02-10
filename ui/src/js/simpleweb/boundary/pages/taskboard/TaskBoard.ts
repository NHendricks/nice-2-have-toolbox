/**
 * TaskBoard - Kanban-style task management board
 */

import { LitElement, css, html } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import type { Task, TaskStatus, TaskPriority } from './taskboard.types.js'
import { COLUMNS, PRIORITY_COLORS } from './taskboard.types.js'

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
      min-height: 100px;
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

    .task-priority {
      display: inline-block;
      padding: 0.125rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .task-summary {
      font-weight: 500;
      margin-bottom: 0.5rem;
      word-break: break-word;
    }

    .task-summary-input {
      width: 100%;
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
      margin-bottom: 0.5rem;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .task-description-input {
      width: 100%;
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
      margin-top: 0.5rem;
    }

    .btn-small {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }
  `

  @state() private tasks: Task[] = []
  @state() private folderPath: string = ''
  @state() private editingTaskId: string | null = null
  @state() private editSummary: string = ''
  @state() private editDescription: string = ''
  @state() private draggedTaskId: string | null = null

  connectedCallback() {
    super.connectedCallback()
    this.loadFolderPath()
  }

  private async loadFolderPath() {
    // Try to load saved folder path from localStorage
    const savedPath = localStorage.getItem('taskboard-folder')
    if (savedPath) {
      this.folderPath = savedPath
      await this.loadTasks()
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

      if (response.success && !response.canceled && response.filePaths?.length > 0) {
        this.folderPath = response.filePaths[0]
        localStorage.setItem('taskboard-folder', this.folderPath)
        await this.loadTasks()
      }
    } catch (error: any) {
      console.error('Failed to select folder:', error)
    }
  }

  private async loadTasks() {
    if (!this.folderPath) return

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', path: this.folderPath },
      )

      if (response.success) {
        const tasks: Task[] = []
        const files = response.data?.files || []

        for (const file of files) {
          if (file.name.endsWith('.json')) {
            try {
              const readResponse = await (window as any).electron.ipcRenderer.invoke(
                'cli-execute',
                'file-operations',
                { operation: 'read', filePath: file.path },
              )
              if (readResponse.success && readResponse.data?.content) {
                const task = JSON.parse(readResponse.data.content) as Task
                tasks.push(task)
              }
            } catch (e) {
              console.error('Failed to read task file:', file.path, e)
            }
          }
        }

        // Sort by order within each column
        this.tasks = tasks.sort((a, b) => a.order - b.order)
      }
    } catch (error: any) {
      console.error('Failed to load tasks:', error)
    }
  }

  private async saveTask(task: Task) {
    if (!this.folderPath) return

    try {
      const filePath = `${this.folderPath}/${task.id}.json`
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        {
          operation: 'write-file',
          filePath,
          content: JSON.stringify(task, null, 2),
        },
      )
    } catch (error: any) {
      console.error('Failed to save task:', error)
    }
  }

  private async deleteTaskFile(taskId: string) {
    if (!this.folderPath) return

    try {
      const filePath = `${this.folderPath}/${taskId}.json`
      await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'delete', sourcePath: filePath },
      )
    } catch (error: any) {
      console.error('Failed to delete task file:', error)
    }
  }

  private generateId(): string {
    return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private async addTask(status: TaskStatus) {
    const now = new Date().toISOString()
    const tasksInColumn = this.tasks.filter((t) => t.status === status)
    const maxOrder = tasksInColumn.length > 0
      ? Math.max(...tasksInColumn.map((t) => t.order))
      : -1

    const newTask: Task = {
      id: this.generateId(),
      summary: 'New Task',
      description: '',
      status,
      priority: 'medium',
      created: now,
      updated: now,
      order: maxOrder + 1,
    }

    this.tasks = [...this.tasks, newTask]
    await this.saveTask(newTask)

    // Start editing the new task
    this.editingTaskId = newTask.id
    this.editSummary = newTask.summary
    this.editDescription = newTask.description
  }

  private startEditing(task: Task) {
    this.editingTaskId = task.id
    this.editSummary = task.summary
    this.editDescription = task.description
  }

  private async saveEditing() {
    if (!this.editingTaskId) return

    const taskIndex = this.tasks.findIndex((t) => t.id === this.editingTaskId)
    if (taskIndex === -1) return

    const updatedTask: Task = {
      ...this.tasks[taskIndex],
      summary: this.editSummary.trim() || 'Untitled',
      description: this.editDescription,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask
    this.tasks = newTasks

    await this.saveTask(updatedTask)
    this.editingTaskId = null
  }

  private cancelEditing() {
    this.editingTaskId = null
  }

  private async updateTaskPriority(task: Task, priority: TaskPriority) {
    const taskIndex = this.tasks.findIndex((t) => t.id === task.id)
    if (taskIndex === -1) return

    const updatedTask: Task = {
      ...task,
      priority,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask
    this.tasks = newTasks

    await this.saveTask(updatedTask)
  }

  private async deleteTask(task: Task) {
    this.tasks = this.tasks.filter((t) => t.id !== task.id)
    await this.deleteTaskFile(task.id)
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
    if (task.status === newStatus) return

    // Get max order in new column
    const tasksInColumn = this.tasks.filter((t) => t.status === newStatus)
    const maxOrder = tasksInColumn.length > 0
      ? Math.max(...tasksInColumn.map((t) => t.order))
      : -1

    const updatedTask: Task = {
      ...task,
      status: newStatus,
      order: maxOrder + 1,
      updated: new Date().toISOString(),
    }

    const newTasks = [...this.tasks]
    newTasks[taskIndex] = updatedTask
    this.tasks = newTasks

    await this.saveTask(updatedTask)
    this.draggedTaskId = null
  }

  private formatDate(isoDate: string): string {
    const date = new Date(isoDate)
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    return `${day}.${month}`
  }

  private renderTask(task: Task) {
    const isEditing = this.editingTaskId === task.id
    const isDragging = this.draggedTaskId === task.id

    return html`
      <div
        class="task-card ${isDragging ? 'dragging' : ''} ${isEditing ? 'editing' : ''}"
        draggable=${isEditing ? 'false' : 'true'}
        @dragstart=${(e: DragEvent) => this.onDragStart(e, task)}
        @dragend=${this.onDragEnd}
      >
        <div
          class="task-priority"
          style="background: ${PRIORITY_COLORS[task.priority]}20; color: ${PRIORITY_COLORS[task.priority]}"
        >
          ${task.priority}
        </div>

        ${isEditing
          ? html`
              <input
                type="text"
                class="task-summary-input"
                .value=${this.editSummary}
                @input=${(e: Event) => {
                  this.editSummary = (e.target as HTMLInputElement).value
                }}
                @keydown=${(e: KeyboardEvent) => {
                  if (e.key === 'Enter') this.saveEditing()
                  if (e.key === 'Escape') this.cancelEditing()
                }}
              />
              <textarea
                class="task-description-input"
                .value=${this.editDescription}
                @input=${(e: Event) => {
                  this.editDescription = (e.target as HTMLTextAreaElement).value
                }}
                placeholder="Description..."
              ></textarea>
              <div class="edit-buttons">
                <button class="btn btn-primary btn-small" @click=${this.saveEditing}>
                  Save
                </button>
                <button class="btn btn-secondary btn-small" @click=${this.cancelEditing}>
                  Cancel
                </button>
              </div>
            `
          : html`
              <div class="task-summary" @dblclick=${() => this.startEditing(task)}>
                ${task.summary}
              </div>
              ${task.description
                ? html`<div class="task-description">${task.description}</div>`
                : ''}
            `}

        <div class="task-meta">
          <span>${this.formatDate(task.updated)}</span>
          <div class="task-actions">
            <select
              class="priority-select"
              .value=${task.priority}
              @change=${(e: Event) => {
                const priority = (e.target as HTMLSelectElement).value as TaskPriority
                this.updateTaskPriority(task, priority)
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <button
              class="task-action-btn"
              @click=${() => this.startEditing(task)}
              title="Edit"
            >
              Edit
            </button>
            <button
              class="task-action-btn delete"
              @click=${() => this.deleteTask(task)}
              title="Delete"
            >
              Del
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderColumn(column: { id: TaskStatus; label: string; color: string }) {
    const columnTasks = this.tasks
      .filter((t) => t.status === column.id)
      .sort((a, b) => a.order - b.order)

    return html`
      <div class="column">
        <div class="column-header">
          <div class="column-title">
            <span class="column-indicator" style="background: ${column.color}"></span>
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

  render() {
    return html`
      <div class="content">
        <div class="header">
          <h1>Nice2Have Taskboard</h1>
          <div class="header-actions">
            ${this.folderPath
              ? html`<span class="folder-path" title=${this.folderPath}>${this.folderPath}</span>`
              : ''}
            <button class="btn btn-secondary" @click=${this.selectFolder}>
              ${this.folderPath ? 'Change Folder' : 'Select Folder'}
            </button>
            ${this.folderPath
              ? html`<button class="btn btn-secondary" @click=${this.loadTasks}>
                  Refresh
                </button>`
              : ''}
          </div>
        </div>

        ${this.folderPath
          ? html`
              <div class="board">
                ${COLUMNS.map((column) => this.renderColumn(column))}
              </div>
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
