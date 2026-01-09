declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'production' | 'test'
    VIDORA_FFMPEG_PATH?: string
    VIDORA_YTDLP_PATH?: string
    VIDORA_NODEJS_PATH?: string
    VIDORA_DENO_PATH?: string
  }
}
