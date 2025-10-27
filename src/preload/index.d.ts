import { ElectronAPI } from '@electron-toolkit/preload'
import { AppConfig, DeepPartial } from '@root/shared/types'
import { StatusSnapshot } from '@root/shared/status'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloads: {
        getInfo: (url: string) => Promise<import('../shared/downloads').YtdlpInfo>
      }
      clipboard?: {
        readText: () => Promise<string>
        writeText: (text: string) => Promise<void>
      }
      app: {
        relaunch: () => void
      }
      window: {
        minimize: () => void
        toggleMaximize: () => void
        close: () => void
        reload: () => void
      }
      navigation: {
        navigate: (page: string) => void
      }
      downloadsPreferences: {
        changeDownloadPath: () => void
        changedDownloadPath: (callback: (location: string) => void) => () => void
        changeYtdlpConfigPath: () => void
        changedYtdlpConfigPath: (callback: (location: string) => void) => () => void
      }
      config: {
        getAppDefaults: () => Promise<AppConfig>
        getConfig: () => Promise<AppConfig>
        updateConfig: (patch: DeepPartial<AppConfig>) => Promise<AppConfig>
        onUpdated: (cb: (cfg: AppConfig) => void) => () => void
      }
      i18n?: {
        loadLocale: (locale: string) => Promise<Record<string, unknown>>
        onLocaleChanged?: (callback: (locale: string) => void) => () => void
        t?: (key: string) => string
      }
      status: {
        getSnapshot: () => Promise<StatusSnapshot>
        onUpdate: (cb: (snap: StatusSnapshot) => void) => () => void
      }
    }
  }
}
