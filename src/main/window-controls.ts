import { ipcMain, BrowserWindow } from 'electron'
import { EVENTS } from '../shared/events'

export function handleWindowControls(): void {
  // Window control IPC
  ipcMain.on(EVENTS.WINDOW.MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(EVENTS.WINDOW.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(EVENTS.WINDOW.CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.on(EVENTS.WINDOW.RELOAD, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.reload()
  })
}
