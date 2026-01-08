import { ipcMain } from 'electron'
import { BrowserWindow, Menu } from 'electron'
import { clipboard } from 'electron'
import { t } from '../../shared/i18n/i18n'
import { PASTE_LINK_CHANNELS } from '../../shared/ipc/paste-link'
import { broadcastToAllWindows } from '../lib'

function handlePasteLinkContextMenuIpc(): void {
  // context menu for paste link
  ipcMain.on(PASTE_LINK_CHANNELS.SHOW_MENU, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)

    const menu = Menu.buildFromTemplate([
      {
        label: t`Paste Link`,
        click: () => {
          const text = clipboard.readText()
          if (!text) return
          broadcastToAllWindows(PASTE_LINK_CHANNELS.PASTED, text)
        }
      }
    ])
    menu.popup({ window: win || undefined })
  })
}

/**
 * @description
 * This function initializes the paste link menu
 */
export function initPasteLinkContextMenu(): void {
  handlePasteLinkContextMenuIpc()
}
