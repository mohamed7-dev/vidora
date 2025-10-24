import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { EVENTS } from '../shared/events'

export function handleNavigation(): void {
  ipcMain.on(EVENTS.NAVIGATE, (event, page: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (is.dev && devUrl) {
      win.loadURL(`${devUrl}/pages/${page}`)
    } else {
      win.loadFile(join(__dirname, '../renderer/pages', page))
    }
  })
}
