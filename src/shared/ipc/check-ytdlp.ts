export const CHECK_YTDLP_CHANNELS = {
  STATUS: 'ytdlp:check:status'
}

export type CheckYtdlpChannelPayload =
  | {
      status: 'begin'
      message: string
      messageKey: string
      scope?: 'mac-os-homebrew' | 'freebsd'
      progress?: number
      cause?: string
    }
  | {
      status: 'progress'
      message: string
      messageKey: string
      progress: number
      cause?: string
      scope?: 'mac-os-homebrew' | 'freebsd'
    }
  | {
      status: 'complete'
      message: string
      messageKey: string
      cause?: string
      scope?: 'mac-os-homebrew' | 'freebsd'
      progress?: number
    }
  | {
      status: 'error'
      message: string
      messageKey: string
      cause: string
      scope?: 'mac-os-homebrew' | 'freebsd'
      progress?: number
    }
  | {
      status: 'info'
      scope: 'mac-os-homebrew' | 'freebsd' | 'updating-ytdlp'
      message: string
      messageKey: string
      progress?: number
      cause?: string
    }
