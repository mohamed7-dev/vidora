import { ipcMain } from 'electron'
import { EVENTS } from '../shared/events'
import { BrowserWindow, Menu } from 'electron'
import { clipboard } from 'electron'

export function PasteLinkContextMenuIpc(): void {
  // context menu for paste link in new-dialog URL input
  ipcMain.on(EVENTS.DIALOG.SHOW_PASTE_LINK_MENU, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const menu = Menu.buildFromTemplate([
      {
        label: 'Paste link',
        click: () => {
          const text = clipboard.readText()
          if (!text) return
          const target = win || BrowserWindow.getAllWindows()[0]
          if (target) {
            target.webContents.send(EVENTS.PASTE_LINK, text)
          }
        }
      }
    ])
    menu.popup({ window: win || undefined })
  })
}
