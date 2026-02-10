/**
 * Taskboard Types
 */

export type TaskStatus = 'todo' | 'in-progress' | 'in-review' | 'waiting' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Task {
  id: string
  summary: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  created: string // ISO date
  updated: string // ISO date
  order: number // For ordering within a column
}

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
