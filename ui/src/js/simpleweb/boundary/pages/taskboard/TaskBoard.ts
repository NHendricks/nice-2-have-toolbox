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
  PRIORITY_COLORS,
} from './taskboard.types.js'

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

    /* Category styles */
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

    .category-chip:hover {
      filter: brightness(1.2);
    }

    .category-chip.active {
      border-color: white;
    }

    .category-chip.all {
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

    .add-category-btn:hover {
      border-color: #64748b;
      color: #e2e8f0;
    }

    .category-input-wrapper {
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

    .task-category {
      font-size: 0.7rem;
      padding: 0.125rem 0.5rem;
      border-radius: 8px;
      margin-bottom: 0.375rem;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
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
  `

  @state() private tasks: Task[] = []
  @state() private folderPath: string = ''
  @state() private editingTaskId: string | null = null
  @state() private editSummary: string = ''
  @state() private editDescription: string = ''
  @state() private editCategory: string = DEFAULT_CATEGORY
  @state() private editPriority: TaskPriority = 'medium'
  @state() private draggedTaskId: string | null = null
  @state() private dragOverTaskId: string | null = null
  @state() private categories: Category[] = []
  @state() private selectedCategory: string | null = null // null = show all
  @state() private addingCategory: boolean = false
  @state() private newCategoryName: string = ''

  connectedCallback() {
    super.connectedCallback()
    this.loadFolderPath()
  }

  private async loadFolderPath() {
    const savedPath = localStorage.getItem('taskboard-folder')
    if (savedPath) {
      this.folderPath = savedPath
      await this.ensureDefaultCategory()
      await this.loadCategories()
      await this.migrateOldTasks()
      await this.loadTasks()
    }
  }

  private getCategoryColor(categoryName: string): string {
    const category = this.categories.find((c) => c.name === categoryName)
    return category?.color || CATEGORY_COLORS[0]
  }

  private async loadCategories() {
    if (!this.folderPath) return

    try {
      const response = await (window as any).electron.ipcRenderer.invoke(
        'cli-execute',
        'file-operations',
        { operation: 'list', folderPath: this.folderPath },
      )

      console.log('loadCategories response:', response)

      if (response.success) {
        const dirs = response.data?.directories || []
        console.log('Found directories:', dirs)

        const categories: Category[] = []

        for (let i = 0; i < dirs.length; i++) {
          categories.push({
            name: dirs[i].name,
            color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
          })
        }

        // Keep existing categories and merge with new ones
        const existingCategoryNames = this.categories.map((c) => c.name)
        for (const cat of categories) {
          if (!existingCategoryNames.includes(cat.name)) {
            this.categories.push(cat)
          }
        }
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
    const tasksInColumn = this.tasks.filter((t) => t.status === status)
    const maxOrder =
      tasksInColumn.length > 0
        ? Math.max(...tasksInColumn.map((t) => t.order))
        : -1

    const newTask: Task = {
      id: this.generateId(),
      summary: 'New Task',
      description: '',
      status,
      priority: 'medium',
      category,
      created: now,
      updated: now,
      order: maxOrder + 1,
    }

    this.tasks = [...this.tasks, newTask]
    await this.saveTask(newTask)

    this.editingTaskId = newTask.id
    this.editSummary = newTask.summary
    this.editDescription = newTask.description
    this.editCategory = newTask.category
    this.editPriority = newTask.priority
  }

  private startEditing(task: Task) {
    this.editingTaskId = task.id
    this.editSummary = task.summary
    this.editDescription = task.description
    this.editCategory = task.category || DEFAULT_CATEGORY
    this.editPriority = task.priority
  }

  private async saveEditing() {
    if (!this.editingTaskId) return

    const taskIndex = this.tasks.findIndex((t) => t.id === this.editingTaskId)
    if (taskIndex === -1) return

    const oldTask = this.tasks[taskIndex]
    const categoryChanged = oldTask.category !== this.editCategory

    const updatedTask: Task = {
      ...oldTask,
      summary: this.editSummary.trim() || 'Untitled',
      description: this.editDescription,
      category: this.editCategory,
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
    this.editingTaskId = null
  }

  private cancelEditing() {
    this.editingTaskId = null
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

  private onTaskDragLeave(e: DragEvent, task: Task) {
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
    const newTasks = [...this.tasks]

    // Remove dragged task from array
    newTasks.splice(draggedTaskIndex, 1)

    // Find new position (where to insert)
    const dropTargetIndex = newTasks.findIndex((t) => t.id === dropOnTask.id)

    // Update status if moving to different column
    const updatedTask: Task = {
      ...draggedTask,
      status: dropOnTask.status,
      updated: new Date().toISOString(),
    }

    // Insert at the drop target position
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
    return `${day}.${month}`
  }

  private renderTask(task: Task) {
    const isEditing = this.editingTaskId === task.id
    const isDragging = this.draggedTaskId === task.id
    const isDragOver = this.dragOverTaskId === task.id
    const categoryColor = this.getCategoryColor(task.category)

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
        ${!isEditing
          ? html`
              <div
                class="task-category"
                style="background: ${categoryColor}20; color: ${categoryColor}"
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
              >
                ${task.priority}
              </div>

              <div
                class="task-summary"
                @dblclick=${() => this.startEditing(task)}
              >
                ${task.summary}
              </div>
              ${task.description
                ? html`<div class="task-description">${task.description}</div>`
                : ''}
            `
          : html`
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
                <button
                  class="btn btn-primary btn-small"
                  @click=${this.saveEditing}
                >
                  Save
                </button>
                <button
                  class="btn btn-secondary btn-small"
                  @click=${this.cancelEditing}
                >
                  Cancel
                </button>
              </div>
            `}

        <div class="task-meta">
          <span>${this.formatDate(task.updated)}</span>
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
        return statusMatch && categoryMatch
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

  render() {
    return html`
      <div class="content">
        <div class="header">
          <h1>📋 Nice2Have Taskboard</h1>
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
              ${this.renderCategoryBar()}
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
