import { t } from '../../shared/i18n/i18n'
import { CHECK_FFMPEG_CHANNELS, CheckFfmpegChannelPayload } from '../../shared/ipc/check-ffmpeg'
import { broadcastToAllWindows } from '../lib'

const channel = CHECK_FFMPEG_CHANNELS.STATUS

type CommonParams = Partial<Pick<CheckFfmpegChannelPayload, 'payload' | 'message'>>

export function begin(info?: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: info?.message ?? t`Checking if FFmpeg is installed and ready to use…`,
    payload: info?.payload ?? {}
  })
}
export function info(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'info',
    payload: info.payload,
    message: info.message
  })
}
export function progress(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    message: info.message ?? t`FFmpeg check is in progress…`,
    payload: info.payload
  })
}
export function complete(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: info?.message ?? t`FFmpeg is ready to be used.`,
    payload: info?.payload ?? {}
  })
}
export function error(info: CommonParams): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    message: info.message ?? t`Failed to check or prepare FFmpeg.`,
    payload: info.payload
  })
}
