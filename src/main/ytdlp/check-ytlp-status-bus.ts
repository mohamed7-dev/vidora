import { broadcastToAllWindows } from '../lib'
import { CHECK_YTDLP_CHANNELS, CheckYtdlpChannelPayload } from '../../shared/ipc/check-ytdlp'
import { t } from '../../shared/i18n/i18n'

type CommonParam = Partial<Pick<CheckYtdlpChannelPayload, 'message' | 'payload'>>
const channel = CHECK_YTDLP_CHANNELS.STATUS

export function begin(info?: CommonParam): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: info?.message ?? t`Checking if yt-dlp is installed and ready to use…`,
    payload: info?.payload
  })
}

export function progress(info: CommonParam): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    payload: info.payload,
    message:
      info.message ??
      t`yt-dlp check is in progress. This may include downloading or verifying the binary…`
  })
}

export function complete(info: CommonParam): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: info.message ?? t`yt-dlp is ready to be used`,
    payload: info.payload
  })
}

export function error(info: CommonParam): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    payload: info.payload,
    message: info.message ?? t`Failed to check or prepare yt-dlp.`
  })
}

export function info(info: CommonParam): void {
  broadcastToAllWindows(channel, {
    status: 'info',
    payload: info.payload,
    message: info.message
  })
}
