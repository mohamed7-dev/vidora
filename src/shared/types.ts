export interface AppConfig {
  general: {
    useNativeToolbar: boolean
    closeToTray: boolean
    language: string
    dir: string
    theme: string
  }
  downloads: {
    downloadDir: string
    fileNameFormatPlaylists: string
    folderNameFormatPlaylists: string
    maxDownloads: number
    videoQuality: string
    videoCodec: string
    audioQuality: string
  }
  downloader: {
    cookiesFromBrowser: string | null
    proxyServerUrl: string
    configPath?: string | null
  }
}

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}
