import { ElectronAPI } from '@electron-toolkit/preload'

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
      i18n?: {
        getLocale: () => Promise<string>
        getAvailableLocales?: () => Promise<string[]>
        loadLocale: (locale: string) => Promise<Record<string, unknown>>
        setLocale: (locale: string) => Promise<void>
        onLocaleChanged?: (callback: (locale: string) => void) => () => void
        t?: (key: string) => string
      }
    }
  }
}
