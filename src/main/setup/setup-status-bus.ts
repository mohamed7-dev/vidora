import { broadcastToAllWindows } from '../lib'
import { ipcMain } from 'electron'
import { APP_SETUP_CHANNELS, AppSetupChannelPayload } from '../../shared/ipc/app-setup'
import { t } from '../../shared/i18n/i18n'

type CommonParams = Partial<Pick<AppSetupChannelPayload, 'message' | 'payload'>>

const channel = APP_SETUP_CHANNELS.STATUS

let latestStatus: AppSetupChannelPayload | null = null

ipcMain.handle(APP_SETUP_CHANNELS.GET_STATUS, () => {
  return latestStatus
})

export function begin(info?: CommonParams): void {
  latestStatus = {
    status: 'pending',
    message:
      info?.message ?? t`Preparing required tools and settings before you can start downloading…`,
    payload: info?.payload ?? {}
  }
  broadcastToAllWindows(channel, latestStatus)
}

export function complete(info?: CommonParams): void {
  latestStatus = {
    status: 'success',
    message: info?.message ?? t`All checks passed, You are ready to start downloading.`,
    payload: info?.payload ?? {}
  }
  broadcastToAllWindows(channel, latestStatus)
}

export function error(info: CommonParams & { payload: { cause: string } }): void {
  latestStatus = {
    status: 'error',
    message: info?.message ?? t`Failed to complete application setup.`,
    payload: info.payload
  }
  broadcastToAllWindows(channel, latestStatus)
}
