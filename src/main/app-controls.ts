import { ipcMain, app } from 'electron'
import { EVENTS } from '../shared/events'

/**
 * @description
 * This function registers the ipc listeners for app controls.
 */
export function handleAppControlsIpc(): void {
  ipcMain.on(EVENTS.APP.RELAUNCH, () => {
    app.relaunch()
    app.exit(0)
  })
}
