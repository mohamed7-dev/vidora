export type TaskKind =
  | 'ytdlp'
  | 'ffmpeg'
  | 'appUpdate'
  | 'configDownloadDir'
  | 'configTray'
  | 'configYtDlpFile'

export type TaskState = 'idle' | 'pending' | 'success' | 'error'

export interface TaskStatus {
  id: string
  kind: TaskKind
  state: TaskState
  message?: string // fallback in case messageKey didn't work
  messageKey?: string
  messageParams?: Record<string, string | number>
  progress?: number
  error?: { message: string; code?: string; key?: string; params?: Record<string, string | number> }
  ts: number
}
export type StatusSnapshot = Record<TaskKind, TaskStatus | undefined>
