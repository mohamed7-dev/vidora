import { ipcMain } from 'electron'
import { BrowserWindow, Menu } from 'electron'
import { clipboard } from 'electron'
import { EVENTS } from '../../shared/events'
import { readLocaleFile } from '../i18n'
import { AppConfig } from '../../shared/types'
import { t } from '../../shared/i18n'

function handlePasteLinkContextMenuIpc(config: AppConfig): void {
  // context menu for paste link
  ipcMain.on(EVENTS.PASTE_LINK.SHOW_MENU, async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const dict = await readLocaleFile(config.general.language)

    const menu = Menu.buildFromTemplate([
      {
        label: t('open app', dict) ?? 'Paste Link',
        click: () => {
          const text = clipboard.readText()
          if (!text) return
          const target = win || BrowserWindow.getAllWindows()[0]
          if (target) {
            target.webContents.send(EVENTS.PASTE_LINK.PASTED, text)
          }
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
export function initPasteLinkContextMenu(config: AppConfig): void {
  handlePasteLinkContextMenuIpc(config)
}
