export const APP_CONFIG_CHANNELS = {
  GET: 'app-config:get',
  UPDATE: 'app-config:update',
  GET_APP_DEFAULTS: 'app-config:get-defaults',
  UPDATED: 'app-config:updated'
}

export interface AppConfig {
  general: {
    useNativeToolbar: boolean
    closeToTray: boolean
    language: string
    dir: string
    theme: string
    autoUpdate: boolean
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
