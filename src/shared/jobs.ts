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
