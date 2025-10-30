import { BrowserWindow, dialog, ipcMain } from 'electron'
import { EVENTS } from '../shared/events'
import { begin, fail, success } from './status-bus'
import fs from 'node:fs'
import path from 'node:path'

export function handleDialogIpc(): void {
  ipcMain.on(EVENTS.DIALOG.OPEN_FOLDER, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return
    begin('configDownloadDir', 'status.configDownloadDir.picking')
    const result = await dialog.showOpenDialog(win, { properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) {
      fail(
        'configDownloadDir',
        'User canceled directory selection',
        'status.configDownloadDir.canceled'
      )
      return
    }
    const dir = result.filePaths[0]
    try {
      const st = fs.statSync(dir)
      if (!st.isDirectory()) {
        fail(
          'configDownloadDir',
          'Selected path is not a directory',
          'status.configDownloadDir.invalid'
        )
        return
      }
      // check writability by writing a temp file
      const probe = path.join(dir, `.write-test-${Date.now()}`)
      fs.writeFileSync(probe, 'ok')
      fs.unlinkSync(probe)
    } catch (e) {
      console.error('Download directory validation failed:', e)
      fail('configDownloadDir', e, 'status.configDownloadDir.not_writable')
      return
    }
    win.webContents.send(EVENTS.DIALOG.SELECTED_LOCATION, dir)
    success('configDownloadDir', 'status.configDownloadDir.ready')
  })
}
