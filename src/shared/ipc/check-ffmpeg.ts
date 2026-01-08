export const CHECK_FFMPEG_CHANNELS = {
  STATUS: 'ffmpeg:check:status'
}

export type ErrorSources = 'env' | 'ffmpeg-notfound'

export type InfoScopes = 'freebsd-bin-notfound'

export type CheckFfmpegChannelPayload =
  | {
      status: 'begin'
      message: string
      payload: object
    }
  | {
      status: 'progress'
      message: string
      payload: {
        progress: number
      }
    }
  | {
      status: 'info'
      message: string
      payload: {
        scope: InfoScopes
      }
    }
  | {
      status: 'complete'
      message: string
      payload: { finalFfmpegPath: string }
    }
  | {
      status: 'error'
      message: string
      payload: { source: ErrorSources; cause: string }
    }
