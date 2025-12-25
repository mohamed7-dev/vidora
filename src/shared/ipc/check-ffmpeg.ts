export const CHECK_FFMPEG_CHANNELS = {
  STATUS: 'ffmpeg:check:status'
}

export interface CheckFfmpegBeginPayload {
  status: 'begin'
  message: string
  messageKey: string
}

export interface CheckFfmpegProgressPayload {
  status: 'progress'
  message: string
  messageKey: string
  progress: number
}

export interface CheckFfmpegCompletePayload {
  status: 'complete'
  message: string
  messageKey: string
}

export interface CheckFfmpegErrorPayload {
  status: 'error'
  message: string
  messageKey: string
  cause: string
}

export type CheckFfmpegChannelPayload =
  | CheckFfmpegBeginPayload
  | CheckFfmpegProgressPayload
  | CheckFfmpegCompletePayload
  | CheckFfmpegErrorPayload
