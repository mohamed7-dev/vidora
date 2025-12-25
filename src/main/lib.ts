import { BrowserWindow } from 'electron'

export function broadcastToAllWindows<T>(channel: string, data: T): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(channel, data)
  })
}
