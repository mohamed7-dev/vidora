import { DownloadAppUpdateApprovalRes, InstallAppUpdateApprovalRes } from '../shared/app-update'
import { YtdlpInfo } from '../shared/downloads'
import { LoadedLocaleDictPayload } from '../shared/i18n'
import { DownloadJobPayload, Job, JobStatus, JobsUpdateEvent, ListJobsParams } from '../shared/jobs'
import { AppConfig, DeepPartial } from '../shared/types'

export type PreloadApi = {
  app: {
    relaunch: () => void
  }
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    reload: () => void
  }
  clipboard?: {
    readText: () => Promise<string>
    writeText: (text: string) => Promise<void>
  }
  navigation: {
    navigate: (page: string) => void
  }
  i18n: {
    loadLocale: (locale: string) => Promise<Record<string, unknown>>
    onLocaleChanged?: (callback: (info: LoadedLocaleDictPayload) => void) => () => void
    t: (key: string) => string
  }
  pasteLink: {
    showMenu: () => void
    onPaste: (cb: (text: string) => void) => () => void
  }
  preferences: {
    downloadPath: {
      changeLocal: () => void
      changedLocal: (callback: (location: string) => void) => () => void
      changeGlobal: () => void
      changedGlobal: (callback: (location: string) => void) => () => void
    }
    ytdlpConfigPath: {
      change: () => void
      changed: (callback: (location: string) => void) => () => void
    }
  }
  config: {
    getAppDefaults: () => Promise<AppConfig>
    getConfig: () => Promise<AppConfig>
    updateConfig: (patch: DeepPartial<AppConfig>) => Promise<AppConfig>
    onUpdated: (cb: (cfg: AppConfig) => void) => () => void
  }
  downloadJobs: {
    add: (payload: DownloadJobPayload) => Promise<Job>
    list: (params?: ListJobsParams) => Promise<Job[]>
    updateStatus: (id: string, status: JobStatus) => Promise<Job | null>
    remove: (id: string) => Promise<boolean>
    pause: (id: string) => Promise<Job | null>
    resume: (id: string) => Promise<Job | null>
    onUpdated: (cb: (evt: JobsUpdateEvent) => void) => () => void
  }
  appUpdate: {
    check: () => void
    respondToDownloadApproval: (res: DownloadAppUpdateApprovalRes) => void
    respondToInstallApproval: (res: InstallAppUpdateApprovalRes) => void
  }
  downloads: {
    getInfo: (url: string) => Promise<YtdlpInfo>
  }
  // status: {
  //   getSnapshot: () => Promise<StatusSnapshot>
  //   onUpdate: (cb: (snap: StatusSnapshot) => void) => () => void
  // }
}
