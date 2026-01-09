import { LoadedLocaleDictPayload } from '../shared/i18n/i18n'
import { AppConfig } from '../shared/ipc/app-config'
import { AppSetupChannelPayload } from '../shared/ipc/app-setup'
import {
  AppUpdateMainToRendererPayload,
  AppUpdateRendererToMainPayload
} from '../shared/ipc/app-update'
import { CheckYtdlpChannelPayload } from '../shared/ipc/check-ytdlp'
import {
  CopyUrlResult,
  DownloadJobPayload,
  Job,
  JobStatus,
  JobsUpdateEvent,
  ListJobsParams,
  ListJobsResult,
  OpenJobResult
} from '../shared/ipc/download-jobs'
import {
  DownloadHistoryStats,
  HistoryClearResponse,
  HistoryDeleteResponse,
  HistoryListQuery,
  HistoryListResult
} from '../shared/ipc/download-history'
import { MediaInfoChannelPayload, YtdlpInfo } from '../shared/ipc/get-media-info'
import { ChangePathsStatusBusEvent } from '../shared/ipc/user-pref'
import { DeepPartial } from '../shared/types'

export type PreloadApi = {
  app: {
    relaunch: () => void
    quit: () => void
  }
  window: {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    reload: () => void
  }
  setup: {
    onStatusUpdate: (cb: (payload: AppSetupChannelPayload) => void) => () => void
    getStatus: () => Promise<AppSetupChannelPayload | null>
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
    t: (strings: TemplateStringsArray) => string
  }
  pasteLink: {
    showMenu: () => void
    onPaste: (cb: (text: string) => void) => () => void
  }
  preferences: {
    downloadPath: {
      changeLocal: () => void
      changedLocal: (callback: (payload: ChangePathsStatusBusEvent) => void) => () => void
      changeGlobal: () => void
      changedGlobal: (callback: (payload: ChangePathsStatusBusEvent) => void) => () => void
    }
    ytdlpConfigPath: {
      change: () => void
      changed: (callback: (payload: ChangePathsStatusBusEvent) => void) => () => void
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
    list: (params?: ListJobsParams) => Promise<ListJobsResult>
    updateStatus: (id: string, status: JobStatus) => Promise<Job | null>
    remove: (id: string) => Promise<boolean>
    pause: (id: string) => Promise<Job | null>
    resume: (id: string) => Promise<Job | null>
    onUpdated: (cb: (evt: JobsUpdateEvent) => void) => () => void
    open: (id: string) => Promise<OpenJobResult>
    copyUrl: (id: string) => Promise<CopyUrlResult>
  }
  history: {
    list: (query?: HistoryListQuery) => Promise<HistoryListResult>
    delete: (id: string) => Promise<HistoryDeleteResponse>
    clear: () => Promise<HistoryClearResponse>
    stats: () => Promise<DownloadHistoryStats>
  }
  appUpdate: {
    rendererToMain: (payload: AppUpdateRendererToMainPayload) => void
    mainToRenderer: (cb: (payload: AppUpdateMainToRendererPayload) => void) => () => void
  }
  downloads: {
    getInfo: (url: string) => Promise<YtdlpInfo>
    onGettingInfo: (cb: (payload: MediaInfoChannelPayload) => void) => () => void
  }
  ytdlp: {
    onCheckingStatus: (cb: (payload: CheckYtdlpChannelPayload) => void) => () => void
  }
}
