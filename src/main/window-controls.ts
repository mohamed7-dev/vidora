import { ipcMain, BrowserWindow } from 'electron'
import { WINDOWS_CONTROLS_CHANNELS } from '../shared/ipc/window-controls'

/**
 * @description
 * This function registers the ipc listeners for window controls.
 */
function initWindowControlsIpc(): void {
  ipcMain.on(WINDOWS_CONTROLS_CHANNELS.MINIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on(WINDOWS_CONTROLS_CHANNELS.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })

  ipcMain.on(WINDOWS_CONTROLS_CHANNELS.CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.close()
  })

  ipcMain.on(WINDOWS_CONTROLS_CHANNELS.RELOAD, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.reload()
  })
}

/**
 * @description
 * This function initializes window controls.
 */
export function initWindowControls(): void {
  initWindowControlsIpc()
}
