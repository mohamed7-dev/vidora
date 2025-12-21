import { BrowserWindow } from 'electron'
import { APP_SETUP_CHANNELS, AppSetupChannelPayload } from '../../shared/ipc/app-setup'

const mainWindow = BrowserWindow.getAllWindows()[0]

export function sendSetupComplete(): void {
  mainWindow?.webContents.send(APP_SETUP_CHANNELS.STATUS, {
    status: 'success',
    message: 'Setup complete',
    messageKey: 'setupComplete'
  } satisfies AppSetupChannelPayload)
}

export function sendSetupError(payload: Pick<AppSetupChannelPayload, 'cause'>): void {
  mainWindow?.webContents.send(APP_SETUP_CHANNELS.STATUS, {
    status: 'error',
    message: "'Failed to initialize application'",
    messageKey: '',
    cause: payload.cause
  } satisfies AppSetupChannelPayload)
}
