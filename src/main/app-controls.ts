import { ipcMain, app } from 'electron'
import { EVENTS } from '../shared/events'

export function handleAppControlsIpc(): void {
  ipcMain.on(EVENTS.APP.RELAUNCH, () => {
    app.relaunch()
    app.exit(0)
  })
}
