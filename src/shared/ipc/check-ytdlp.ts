export const CHECK_YTDLP_CHANNELS = {
  STATUS: 'ytdlp:check:status'
}

export type CheckYtdlpChannelPayload =
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
