import { broadcastToAllWindows } from '../lib'
import { APP_SETUP_CHANNELS, AppSetupChannelPayload } from '../../shared/ipc/app-setup'

const channel = APP_SETUP_CHANNELS.STATUS

export function complete(): void {
  broadcastToAllWindows(channel, {
    status: 'success',
    message: 'Setup complete',
    messageKey: 'setupComplete'
  })
}

export function error(payload: Pick<AppSetupChannelPayload, 'cause'>): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    message: "'Failed to initialize application'",
    messageKey: '',
    cause: payload.cause
  })
}
