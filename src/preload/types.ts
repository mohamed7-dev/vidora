import { LoadedLocaleDictPayload } from '../shared/i18n'
import { AppConfig } from '../shared/ipc/app-config'
import { ApprovalRes } from '../shared/ipc/app-update'
import {
  DownloadJobPayload,
  Job,
  JobStatus,
  JobsUpdateEvent,
  ListJobsParams
} from '../shared/ipc/download-jobs'
import { MediaInfoChannelPayload, YtdlpInfo } from '../shared/ipc/get-media-info'
import { DeepPartial } from '../shared/types'

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
    respondToDownloadApproval: (res: ApprovalRes) => void
    respondToInstallApproval: (res: ApprovalRes) => void
  }
  downloads: {
    getInfo: (url: string) => Promise<YtdlpInfo>
    onGettingInfo: (cb: (payload: MediaInfoChannelPayload) => void) => () => void
  }
}
