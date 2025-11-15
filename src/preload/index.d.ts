import { ElectronAPI } from '@electron-toolkit/preload'
import { AppConfig, DeepPartial } from '@root/shared/types'
import { StatusSnapshot } from '@root/shared/status'
import { DownloadJobPayload } from '@root/shared/jobs'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      downloads: {
        getInfo: (url: string) => Promise<import('../shared/downloads').YtdlpInfo>
      }
      pasteLink?: {
        showMenu: () => void
        onPaste: (cb: (text: string) => void) => () => void
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
      mediaPreferences: {
        changeMediaDownloadPath: () => void
        changedMediaDownloadPath: (callback: (location: string) => void) => () => void
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
      jobs: {
        add: (payload: DownloadJobPayload) => Promise<import('../shared/jobs').Job>
        list: (
          params?: import('../shared/jobs').ListJobsParams
        ) => Promise<import('../shared/jobs').Job[]>
        updateStatus: (
          id: string,
          status: import('../shared/jobs').JobStatus
        ) => Promise<import('../shared/jobs').Job | null>
        remove: (id: string) => Promise<boolean>
        pause: (id: string) => Promise<import('../shared/jobs').Job | null>
        resume: (id: string) => Promise<import('../shared/jobs').Job | null>
        onUpdated: (cb: (evt: import('../shared/jobs').JobsUpdateEvent) => void) => () => void
      }
      appUpdate: {
        check: () => void
        respondToDownloadApproval: (res: DownloadAppUpdateApprovalRes) => void
        respondToInstallApproval: (res: InstallAppUpdateApprovalRes) => void
      }
    }
  }
}
