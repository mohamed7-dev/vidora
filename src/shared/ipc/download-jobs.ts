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

// This function is never called; it only exists so the i18n extractor
// can see these window-title tokens at build time.
export function _ensureJobStatusTokens(): void {
  void t`pending`
  void t`queued`
  void t`downloading`
  void t`paused`
  void t`completed`
  void t`failed`
  void t`canceled`
  void t`deleted`
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'deleted'

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
  sizeBytes?: number
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
