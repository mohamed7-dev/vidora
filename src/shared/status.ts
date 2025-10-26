export type TaskKind = 'ytdlp' | 'ffmpeg' | 'appUpdate' | 'download'

export type TaskState = 'idle' | 'pending' | 'success' | 'error'

export interface TaskStatus {
  id: string
  kind: TaskKind
  state: TaskState
  // keep raw message for fallback/debug
  message?: string
  messageKey?: string
  messageParams?: Record<string, string | number>
  progress?: number
  error?: { message: string; code?: string; key?: string; params?: Record<string, string | number> }
  ts: number
}
export type StatusSnapshot = Record<TaskKind, TaskStatus | undefined>
