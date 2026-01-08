import { ipcMain, app } from 'electron'
import { APP_CONTROLS_CHANNELS } from '../shared/ipc/app-controls'

/**
 * @description
 * This function registers the ipc listeners for app controls.
 */
function handleAppControlsIpc(): void {
  ipcMain.on(APP_CONTROLS_CHANNELS.RELAUNCH, () => {
    app.relaunch()
    app.exit(0)
  })

  ipcMain.on(APP_CONTROLS_CHANNELS.QUIT, () => {
    app.quit()
  })
}

/**
 * @description
 * This function initializes app controls.
 */
export function initAppControls(): void {
  handleAppControlsIpc()
}
