import path from 'node:path'
import { DATA } from '../../shared/data'
import { AppConfig } from '../../shared/types'
import { app } from 'electron'

export interface InternalConfig {
  ytDlpPath: string
  configFolderPath: string
  configFilePath: string
  downloadFolderPath: string
  ffmpegPath: string
}
const configDir = path.join(app.getPath('userData'), 'config')
/**
 * @description
 * Default Internal configuration meant to be accessible in main process only.
 */
export const DEFAULT_INTERNAL_CONFIG: InternalConfig = {
  configFolderPath: configDir,
  configFilePath: path.join(configDir, 'config.json'),
  downloadFolderPath: app.getPath('downloads'),
  ytDlpPath: path.join(app.getPath('userData'), 'bin'),
  ffmpegPath: path.join(app.getPath('userData'), 'bin')
}

/**
 * @description
 * Default configuration for the app meant to be accessible in all processes.
 */
export const DEFAULT_CONFIG: AppConfig = {
  general: {
    useNativeToolbar: false,
    closeToTray: false,
    language: DATA.languages.find((lang) => lang.value === 'en')?.value ?? 'en',
    dir: 'ltr',
    theme: DATA.themes.find((theme) => theme.value === 'system')?.value ?? 'system'
  },
  downloads: {
    downloadDir: DEFAULT_INTERNAL_CONFIG.downloadFolderPath,
    maxDownloads: 5,
    fileNameFormatPlaylists: '%(playlist_index)s.%(title)s.%(ext)s',
    folderNameFormatPlaylists: '%(playlist_title)s',
    videoQuality: '1080',
    videoCodec: 'avc1',
    audioQuality: 'mp3'
  },
  downloader: {
    proxyServerUrl: '',
    cookiesFromBrowser:
      DATA.cookiesFromBrowser.find((cookie) => cookie.value === 'none')?.value ?? 'none'
  }
}
