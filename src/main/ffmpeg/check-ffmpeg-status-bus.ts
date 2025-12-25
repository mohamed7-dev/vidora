import {
  CHECK_FFMPEG_CHANNELS,
  CheckFfmpegBeginPayload,
  CheckFfmpegCompletePayload,
  CheckFfmpegErrorPayload,
  CheckFfmpegProgressPayload
} from '../../shared/ipc/check-ffmpeg'
import { broadcastToAllWindows } from '../lib'

const channel = CHECK_FFMPEG_CHANNELS.STATUS
export function begin(payload?: Partial<Omit<CheckFfmpegBeginPayload, 'status'>>): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: payload?.message ?? 'Started checking ffmpeg',
    messageKey: payload?.messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function progress(
  payload: Partial<Omit<CheckFfmpegProgressPayload, 'status'>> &
    Required<Pick<CheckFfmpegProgressPayload, 'progress'>>
): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    progress: payload.progress,
    message: payload.message ?? 'Checking ffmpeg',
    messageKey: payload.messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function complete(payload?: Partial<Omit<CheckFfmpegCompletePayload, 'status'>>): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: payload?.message ?? 'ffmpeg is ready',
    messageKey: payload?.messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}

export function error(payload: Partial<Omit<CheckFfmpegErrorPayload, 'status'>>): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    cause: payload.cause ?? 'Failed to check ffmpeg',
    message: payload.message ?? 'Failed to check ffmpeg',
    messageKey: payload.messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  })
}
