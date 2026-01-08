export const CHECK_YTDLP_CHANNELS = {
  STATUS: 'ytdlp:check:status'
}

export type InfoScopes =
  | 'macos-homebrew'
  | 'freebsd-bin-notfound'
  | 'updating-ytdlp'
  | 'updated-ytdlp'
export type ErrorSources = 'download-failure' | 'env' | 'update-failure'

export type CheckYtdlpChannelPayload =
  | {
      status: 'begin'
      message: string
      payload: object
    }
  | {
      status: 'progress'
      message: string
      payload: { progress: number }
    }
  | {
      status: 'complete'
      payload: { finalYtdlpPath: string }
      message: string
    }
  | {
      status: 'error'
      message: string
      payload: { source: ErrorSources; cause: string }
    }
  | {
      status: 'info'
      message: string
      payload: { scope: InfoScopes }
    }
