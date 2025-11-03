declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test'
    ELECTRON_RENDERER_URL?: string
    VIDORA_FFMPEG_PATH?: string
    VIDORA_YTDLP_PATH?: string
  }
}
