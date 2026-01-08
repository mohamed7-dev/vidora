declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test'
    YALLA_DOWNLOAD_FFMPEG_PATH?: string
    YALLA_DOWNLOAD_YTDLP_PATH?: string
    YALLA_DOWNLOAD_NODEJS_PATH?: string
    YALLA_DOWNLOAD_DENO_PATH?: string
  }
}
