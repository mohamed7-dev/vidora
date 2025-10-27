// Full payload returned from yt-dlp - structure varies per site and options
export type YtdlpInfo = Record<string, unknown>

// Optional narrowed shape you may map to on the renderer side
export type MediaInfo = {
  url: string
  title?: string
  duration?: number
  thumbUrl?: string
}
