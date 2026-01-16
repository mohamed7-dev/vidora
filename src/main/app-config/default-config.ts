import { join } from 'node:path'
import { DATA } from '../../shared/data'
import { app } from 'electron'
import * as os from 'node:os'
import { AppConfig } from '../../shared/ipc/app-config'

export interface InternalConfig {
  ytDlpPath: string | null
  ffmpegPath: string | null
  jsRuntimePath: string | null
  configFolderPath: string
  configFilePath: string
  binFolderPath: string
  internalConfigFilePath: string
  downloadFolderPath: string
  jobsStorePath: string
}
const configDir = join(app.getPath('userData'), 'config')

const isWindows = os.platform() === 'win32'
const resourcesBasePath = app.isPackaged ? process.resourcesPath : join(process.cwd(), 'resources')
const binBasePath = join(resourcesBasePath, 'bin')

export const DEFAULT_INTERNAL_PATHS = {
  ytDlpPath: join(app.getPath('userData'), 'bin', isWindows ? 'ytdlp.exe' : 'ytdlp'),
  ffmpegPath: join(binBasePath, 'ffmpeg', 'bin'), // path to the bundled ffmpeg
  nodejsRuntimePath: join(binBasePath, isWindows ? 'node.exe' : 'node'), // path to the bundled node runtime
  nodejsRuntimePathWin: join(binBasePath, 'node.exe') // path to the bundled node on windows
}
/**
 * @description
 * Default Internal configuration meant to be accessible in main process only.
 */
export const DEFAULT_INTERNAL_CONFIG: InternalConfig = {
  configFolderPath: configDir,
  configFilePath: join(configDir, 'config.json'),
  internalConfigFilePath: join(configDir, 'internal-config.json'),
  downloadFolderPath: app.getPath('downloads'),
  binFolderPath: join(app.getPath('userData'), 'bin'),
  ytDlpPath: null,
  ffmpegPath: null,
  jsRuntimePath: null,
  jobsStorePath: join(app.getPath('userData'), 'jobs')
}

/**
 * @description
 * Default configuration for the app meant to be accessible in all processes.
 */
export const DEFAULT_CONFIG: AppConfig = {
  general: {
    useNativeToolbar: true,
    closeToTray: false,
    language: DATA.languages.find((lang) => lang.value === 'en')?.value ?? 'en',
    dir: 'ltr',
    theme: DATA.themes.find((theme) => theme.value === 'system')?.value ?? 'system',
    autoUpdate: true
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
    configPath: '',
    proxyServerUrl: '',
    cookiesFromBrowser:
      DATA.cookiesFromBrowser.find((cookie) => cookie.value === 'none')?.value ?? 'none'
  }
}
