export const MEDIA_INFO_CHANNELS = {
  STATUS: 'media-info:status',
  GET_INFO: 'media-info:get-info'
}

export type MediaInfoChannelPayload =
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

// Full payload returned from yt-dlp - structure varies per site and options
export type YtdlpInfo = Record<string, unknown>

// Optional narrowed shape you may map to on the renderer side
export type MediaInfo = {
  url: string
  title?: string
  duration?: number
  thumbUrl?: string
}
