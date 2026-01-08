import type { Job, JobStatus } from './download-jobs'

export const DOWNLOAD_HISTORY_CHANNELS = {
  LIST: 'download-history:list',
  DELETE: 'download-history:delete',
  CLEAR: 'download-history:clear',
  STATS: 'download-history:stats'
} as const

export type HistoryListSortBy = 'createdAt' | 'updatedAt' | 'title' | 'url'
export type HistoryListSortDir = 'asc' | 'desc'

export type HistoryMediaType = 'video' | 'audio' | 'any'

export type HistoryListQuery = {
  page?: number
  pageSize?: number
  status?: JobStatus | JobStatus[]
  mediaType?: HistoryMediaType
  search?: string
  sortBy?: HistoryListSortBy
  sortDir?: HistoryListSortDir
}

export type HistoryListResult = {
  items: Job[]
  nextPage: number | null
}

export type HistoryDeleteRequest = {
  id: string
}

export type HistoryDeleteResponse = {
  success: boolean
}

export type HistoryClearResponse = {
  removedCount: number
}

export type DownloadHistoryStats = {
  totalCount: number
  completedCount: number
  failedCount: number
  canceledCount: number
  deletedCount: number
  activeCount: number
  totalSizeBytes: number
  completedSizeBytes: number
}
