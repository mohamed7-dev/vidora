import { broadcastToAllWindows } from '../lib'
import { MEDIA_INFO_CHANNELS, MediaInfoChannelPayload } from '../../shared/ipc/get-media-info'
import { t } from '../../shared/i18n/i18n'

type CommonParams = Partial<Pick<MediaInfoChannelPayload, 'message' | 'payload'>>

const channel = MEDIA_INFO_CHANNELS.STATUS

export function begin(info?: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: info?.message ?? t`Preparing to fetch media information…`,
    payload: info?.payload ?? {}
  })
}
export function progress(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    message: info.message ?? t`Fetching media information…`,
    payload: info.payload
  })
}
export function complete(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: info.message ?? t`Media information is ready.`,
    payload: info.payload
  })
}
export function error(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    message: info.message ?? t`Failed to fetch media information.`,
    payload: info.payload
  })
}
