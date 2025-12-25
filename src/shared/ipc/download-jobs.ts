export const DOWNLOAD_JOBS_CHANNELS = {
  ADD: 'download-jobs:add', // renderer -> main
  LIST: 'download-jobs:list', // renderer -> main
  UPDATE_STATUS: 'download-jobs:update-status', // renderer -> main
  REMOVE: 'download-jobs:remove', // renderer -> main
  PAUSE: 'download-jobs:pause', // renderer -> main
  RESUME: 'download-jobs:resume', // renderer -> main
  STATUS_BUS: 'download-jobs:status-bus' // main -> renderer
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'

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
}

export type JobsUpdateEvent = {
  type: 'added' | 'updated' | 'removed'
  job: Job
}
