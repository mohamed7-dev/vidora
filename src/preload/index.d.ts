import { ElectronAPI } from '@electron-toolkit/preload'
import { AppConfig, DeepPartial } from '@root/shared/types'
import { StatusSnapshot } from '@root/shared/status'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      window: {
        minimize: () => void
        toggleMaximize: () => void
        close: () => void
        reload: () => void
      }
      navigation: {
        navigate: (page: string) => void
      }
      generalPreferences: {
        changeDownloadPath: () => void
        changedDownloadPath: (callback: (location: string) => void) => void
      }
      config: {
        getAppDefaults: () => Promise<AppConfig>
        getConfig: () => Promise<AppConfig>
        // TODO: apply deep partial
        updateConfig: (patch: DeepPartial<AppConfig>) => Promise<AppConfig>
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
