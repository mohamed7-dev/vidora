import { BrowserWindow, ipcMain } from 'electron'
import { NAVIGATION_CHANNELS } from '../shared/ipc/navigation'
import { DATA } from '../shared/data'

function initNavigationIpc(): void {
  // this channel is meant only for changing the window title
  ipcMain.handle(NAVIGATION_CHANNELS.TO, (e, page) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    win.setTitle(DATA.pages.find((p) => p.id === page)?.windowTitle ?? DATA.appName)
  })
}

export function initNavigation(): void {
  initNavigationIpc()
}
