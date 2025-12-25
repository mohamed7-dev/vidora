import { broadcastToAllWindows } from '../lib'
import { CHECK_YTDLP_CHANNELS, CheckYtdlpChannelPayload } from '../../shared/ipc/check-ytdlp'

const channel = CHECK_YTDLP_CHANNELS.STATUS

export function begin(): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: 'Started checking yt-dlp',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function progress(progress: number, message?: string, messageKey?: string): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    progress,
    message: message ?? 'Checking yt-dlp is in progress',
    messageKey: messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function complete(): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: 'yt-dlp is ready',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function error(e: unknown, customMessage?: string, customMessageKey?: string): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    cause: e instanceof Error ? e.message : String(e),
    message: customMessage ?? 'Failed to check yt-dlp',
    messageKey: customMessageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function info(
  payload: Required<Pick<CheckYtdlpChannelPayload, 'message' | 'messageKey' | 'scope'>>
): void {
  broadcastToAllWindows(channel, {
    status: 'info',
    scope: payload.scope,
    message: payload.message,
    messageKey: payload.messageKey
  })
}
