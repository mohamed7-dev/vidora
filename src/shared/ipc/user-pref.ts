export const USER_PREF_CHANNELS = {
  LOCALE: {
    LOADED: 'user-pref:locale:loaded',
    LOAD: 'user-pref:locale:load'
  },
  DOWNLOAD_PATH: {
    CHANGE_LOCAL: 'user-pref:download-path:change-local',
    CHANGE_GLOBAL: 'user-pref:download-path:change-global',
    CHANGE_GLOBAL_RESPONSE: 'user-pref:download-path:change-global-response',
    CHANGE_LOCAL_RESPONSE: 'user-pref:download-path:change-local-response'
  },
  YTDLP_FILE_PATH: {
    CHANGE: 'user-pref:ytdlp-path:change',
    CHANGE_RESPONSE: 'user-pref:ytdlp-path:change-response'
  }
}

export type ChangePathsStatusBusEvent =
  | {
      status: 'success'
      message: string
      payload: {
        source: 'download-path' | 'ytdlp-path'
        path: string
      }
    }
  | {
      status: 'error'
      message: string
      payload: {
        source: 'download-path' | 'ytdlp-path'
        cause: string
      }
    }
  | {
      status: 'pending'
      message: string
      payload: {
        source: 'download-path' | 'ytdlp-path'
      }
    }
