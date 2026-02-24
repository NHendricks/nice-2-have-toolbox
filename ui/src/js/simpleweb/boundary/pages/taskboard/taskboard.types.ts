/**
 * Taskboard Types
 */

export type TaskStatus =
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'in-review'
  | 'waiting'
  | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  summary: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  category: string // Category name (folder name)
  person?: string // Assigned person
  created: string // ISO date
  updated: string // ISO date
  order: number // For ordering within a column
}

export interface Category {
  name: string
  color: string
}

export const DEFAULT_CATEGORY = 'General'
export const DEFAULT_PERSON = 'Unassigned'

export const CATEGORY_COLORS = [
  '#3b82f6', // blue
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
]

export interface TaskColumn {
  id: TaskStatus
  label: string
  color: string
}

export const COLUMNS: TaskColumn[] = [
  { id: 'todo', label: 'To Do', color: '#64748b' },
  { id: 'in-progress', label: 'In Progress', color: '#3b82f6' },
  { id: 'in-review', label: 'In Review', color: '#f59e0b' },
  { id: 'waiting', label: 'Waiting', color: '#8b5cf6' },
  { id: 'done', label: 'Done', color: '#22c55e' },
]

export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: '#64748b',
  medium: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
}
