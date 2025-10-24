import { ipcMain, dialog, BrowserWindow } from 'electron'
import { EVENTS } from '../shared/events'

export function handleChangeDownloadPath(): void {
  ipcMain.on(EVENTS.DOWNLOAD_PATH.CHANGE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    const location = dialog.showOpenDialogSync({
      properties: ['openDirectory']
    })

    if (location) {
      win.webContents.send(EVENTS.DOWNLOAD_PATH.CHANGED, location)
    }
  })
}
