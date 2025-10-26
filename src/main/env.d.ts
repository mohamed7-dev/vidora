declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test'
    ELECTRON_RENDERER_URL?: string
    TANZIL_FFMPEG_PATH?: string
    TANZIL_YTDLP_PATH?: string
  }
}
