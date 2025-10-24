const STORAGE_KEYS = {
  theme: 'theme',
  downloadPath: 'downloadPath',
  language: 'language',
  direction: 'direction',
  maxDownloads: 'maxDownloads',
  videoQuality: 'videoQuality',
  videoCodec: 'videoCodec',
  audioQuality: 'audioQuality',
  fileNameFormatPlaylists: 'fileNameFormatPlaylists',
  folderNameFormatPlaylists: 'folderNameFormatPlaylists',
  proxyServer: 'proxyServer',
  cookiesFromBrowser: 'cookiesFromBrowser',
  closeAppToSystemTray: 'closeAppToSystemTray'
} as const

export const storage = {
  set: (key: keyof typeof STORAGE_KEYS, value: string): void => {
    localStorage.setItem(STORAGE_KEYS[key], value)
  },
  get: (key: keyof typeof STORAGE_KEYS): string | null => {
    return localStorage.getItem(STORAGE_KEYS[key])
  }
}
