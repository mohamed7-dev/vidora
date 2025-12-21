import { BrowserWindow } from 'electron'
import { ChangePathsStatusBusEvent } from '../../shared/ipc/user-pref'

export function complete(
  win: BrowserWindow,
  channel: string,
  payload: Omit<ChangePathsStatusBusEvent, 'status' | 'cause'>
): void {
  win.webContents.send(channel, {
    status: 'success',
    message: payload.message,
    messageKey: payload.messageKey,
    source: payload.source
  } satisfies ChangePathsStatusBusEvent)
}

export function error(
  win: BrowserWindow,
  channel: string,
  payload: Omit<ChangePathsStatusBusEvent, 'status'>
): void {
  win.webContents.send(channel, {
    status: 'error',
    message: payload.message,
    messageKey: payload.messageKey,
    source: payload.source,
    cause: payload.cause
  } satisfies ChangePathsStatusBusEvent)
}
