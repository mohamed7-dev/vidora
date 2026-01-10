import { BrowserWindow, ipcMain } from 'electron'
import { NAVIGATION_CHANNELS } from '../shared/ipc/navigation'
import { DATA } from '../shared/data'
import { t } from '../shared/i18n/i18n'

function initNavigationIpc(): void {
  // this channel is meant only for changing the window title
  ipcMain.handle(NAVIGATION_CHANNELS.TO, (e, page) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    const pageConfig = DATA.pages.find((p) => p.id === page)
    const rawTitle = pageConfig?.windowTitle ?? DATA.appName
    const localizedTitle = pageConfig ? t(rawTitle) : rawTitle
    win.setTitle(localizedTitle)
  })
}

export function initNavigation(): void {
  initNavigationIpc()
}
