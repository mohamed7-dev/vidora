import { t } from '../i18n/i18n'

export const DOWNLOAD_JOBS_CHANNELS = {
  ADD: 'download-jobs:add', // renderer -> main
  LIST: 'download-jobs:list', // renderer -> main
  UPDATE_STATUS: 'download-jobs:update-status', // renderer -> main
  REMOVE: 'download-jobs:remove', // renderer -> main
  PAUSE: 'download-jobs:pause', // renderer -> main
  RESUME: 'download-jobs:resume', // renderer -> main
  OPEN: 'download-jobs:open', // renderer -> main
  COPY_URL: 'download-jobs:copy-url', // renderer -> main
  STATUS_BUS: 'download-jobs:status-bus' // main -> renderer
}

export const statuses = {
  pending: t`Pending`,
  queued: t`Queued`,
  downloading: t`Downloading`,
  paused: t`Paused`,
  completed: t`Completed`,
  failed: t`Failed`,
  canceled: t`Canceled`,
  deleted: t`Deleted`
} as const

export type JobStatus = keyof typeof statuses

type DownloadJobType = 'Video' | 'Audio'

export type DownloadArgs = {
  rangeCmd: string
  rangeOption: string
  subs: string
  subLangs: string
}
export type DownloadJobPayload = {
  type: DownloadJobType
  url: string
  title: string
  thumbnail: string
  fileName?: string
  ytdlpArgs: DownloadArgs & {
    downloadDir: string | null
    subtitles: boolean
    start: string
    end: string
  }
  userOptionsSnapshot: {
    videoFormat: string
    audioForVideoFormat: string
    audioFormat: string
    extractFormat: string
    extractQuality: string
  }
}

export type Job = {
  id: string
  status: JobStatus
  statusText: string
  progress?: number
  error?: string
  createdAt: number
  updatedAt: number
  // Store raw job payload coming from renderer to be used by downloader engine
  payload: DownloadJobPayload
}

export type ListJobsParams = {
  status?: JobStatus | JobStatus[]
  page?: number
  pageSize?: number
}

export type ListJobsResult = {
  items: Job[]
  nextPage: number | null
}

export type JobsUpdateEvent = {
  type: 'added' | 'updated' | 'removed'
  job: Job
}

export type OpenJobResult = {
  ok: boolean
  error?: string
}

export type CopyUrlResult = {
  ok: boolean
  error?: string
}
