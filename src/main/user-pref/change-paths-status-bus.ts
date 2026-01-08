import { BrowserWindow } from 'electron'
import { ChangePathsStatusBusEvent } from '../../shared/ipc/user-pref'

export function complete(
  win: BrowserWindow,
  channel: string,
  info: Omit<ChangePathsStatusBusEvent, 'status'>
): void {
  win.webContents.send(channel, {
    status: 'success',
    message: info.message,
    payload: info.payload
  })
}

export function error(
  win: BrowserWindow,
  channel: string,
  info: Omit<ChangePathsStatusBusEvent, 'status'>
): void {
  win.webContents.send(channel, {
    status: 'error',
    message: info.message,
    payload: info.payload
  })
}
