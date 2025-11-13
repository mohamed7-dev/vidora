import { BrowserWindow, ipcMain } from 'electron'
import { EVENTS } from '../shared/events'
import { TaskKind, TaskStatus, StatusSnapshot } from '../shared/status'

const snapshot: StatusSnapshot = {
  ytdlp: undefined,
  ffmpeg: undefined,
  appUpdate: undefined,
  configDownloadDir: undefined,
  configYtDlpFile: undefined,
  configTray: undefined
}
const listeners = (): BrowserWindow[] => BrowserWindow.getAllWindows()

function publish(): void {
  const snap = getSnapshot()
  listeners().forEach((w) => w.webContents.send(EVENTS.STATUS.UPDATE, snap))
}

function set(kind: TaskKind, partial: Partial<TaskStatus>): TaskStatus {
  const prev = snapshot[kind] ?? {
    id: kind,
    kind,
    state: 'idle' as const,
    ts: Date.now()
  }
  const next: TaskStatus = { ...prev, ...partial, kind, ts: Date.now() }
  snapshot[kind] = next
  console.log('Status updated:', next)
  publish()
  return next
}

export function begin(
  kind: TaskKind,
  messageKey?: string,
  messageParams?: Record<string, string | number>,
  message?: string
): TaskStatus {
  return set(kind, {
    state: 'pending',
    message,
    messageKey,
    messageParams,
    error: undefined,
    progress: undefined
  })
}
export function progress(
  kind: TaskKind,
  value: number,
  messageKey?: string,
  messageParams?: Record<string, string | number>,
  message?: string
): TaskStatus {
  return set(kind, {
    state: 'pending',
    progress: Math.max(0, Math.min(100, value)),
    message,
    messageKey,
    messageParams
  })
}

export function ask(
  kind: TaskKind,
  messageKey?: string,
  messageParams?: Record<string, string | number>,
  message?: string
): TaskStatus {
  return set(kind, {
    state: 'asking',
    message,
    messageKey,
    messageParams
  })
}

export function success(
  kind: TaskKind,
  messageKey?: string,
  messageParams?: Record<string, string | number>,
  message?: string
): TaskStatus {
  return set(kind, { state: 'success', progress: 100, message, messageKey, messageParams })
}
export function fail(
  kind: TaskKind,
  err: unknown,
  messageKey?: string,
  messageParams?: Record<string, string | number>,
  message?: string
): TaskStatus {
  const baseError = err instanceof Error ? { message: err.message } : { message: String(err) }
  return set(kind, {
    state: 'error',
    message,
    messageKey,
    messageParams,
    error: { ...baseError, key: messageKey, params: messageParams }
  })
}
export function getSnapshot(): StatusSnapshot {
  return { ...snapshot }
}

/**
 * @description
 * This function registers the ipc listeners for status.
 * it registers a handler for the snapshot event.
 */
export function registerStatusIpc(): void {
  ipcMain.handle(EVENTS.STATUS.SNAPSHOT, () => getSnapshot())
}
