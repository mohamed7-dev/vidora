import { ipcMain, app } from 'electron'
import { EVENTS } from '../shared/events'

/**
 * @description
 * This function registers the ipc listeners for app controls.
 */
function handleAppControlsIpc(): void {
  ipcMain.on(EVENTS.APP.RELAUNCH, () => {
    app.relaunch()
    app.exit(0)
  })
}

/**
 * @description
 * This function initializes app controls.
 */
export function initAppControls(): void {
  handleAppControlsIpc()
}
