export const CHECK_FFMPEG_CHANNELS = {
  STATUS: 'ffmpeg:check:status'
}

export type CheckFfmpegChannelPayload =
  | {
      status: 'begin'
      message: string
      messageKey: string
    }
  | {
      status: 'progress'
      message: string
      messageKey: string
      progress: number
    }
  | {
      status: 'complete'
      message: string
      messageKey: string
    }
  | {
      status: 'error'
      message: string
      messageKey: string
      cause: string
    }
