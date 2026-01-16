import { BrowserWindow, ipcMain } from 'electron'
import { getJobs, saveJobs } from './download-jobs-store'
import { Job, JobStatus } from '../../shared/ipc/download-jobs'
import {
  DOWNLOAD_HISTORY_CHANNELS,
  DownloadHistoryStats,
  HistoryClearResponse,
  HistoryDeleteRequest,
  HistoryDeleteResponse,
  HistoryListQuery,
  HistoryListResult,
  HistoryUpdateEvent
} from '../../shared/ipc/download-history'

function isActiveStatus(status: JobStatus): boolean {
  return (
    status === 'pending' || status === 'queued' || status === 'downloading' || status === 'paused'
  )
}

function broadcastHistoryUpdate(evt: HistoryUpdateEvent): void {
  const targets = BrowserWindow.getAllWindows()
  for (const w of targets) w.webContents.send(DOWNLOAD_HISTORY_CHANNELS.STATUS_BUS, evt)
}

function defaultHistoryStatuses(): JobStatus[] {
  return ['completed', 'failed', 'canceled', 'deleted']
}

function applyHistoryFilters(jobs: Job[], query: HistoryListQuery): Job[] {
  let result = [...jobs]

  // Status filter (default to historical statuses)
  const statusesFilter = query.status
    ? Array.isArray(query.status)
      ? query.status
      : [query.status]
    : defaultHistoryStatuses()
  result = result.filter((j) => statusesFilter.includes(j.status))

  // Media type filter (based on payload.type if present)
  if (query.mediaType && query.mediaType !== 'any') {
    result = result.filter((j) => {
      const payload = j.payload as { type?: string } | undefined
      const t = payload?.type?.toLowerCase()
      if (!t) return false
      if (query.mediaType === 'video') return t === 'video'
      if (query.mediaType === 'audio') return t === 'audio'
      return false
    })
  }

  // Search filter (title or url)
  if (query.search && query.search.trim() !== '') {
    const q = query.search.trim().toLowerCase()
    result = result.filter((j) => {
      const payload = j.payload as { title?: string; url?: string } | undefined
      const title = payload?.title?.toLowerCase() ?? ''
      const url = payload?.url?.toLowerCase() ?? ''
      return title.includes(q) || url.includes(q)
    })
  }

  return result
}

function applyHistorySort(jobs: Job[], query: HistoryListQuery): Job[] {
  const sortBy = query.sortBy ?? 'updatedAt'
  const sortDir = query.sortDir ?? 'desc'

  const mul = sortDir === 'asc' ? 1 : -1

  return [...jobs].sort((a, b) => {
    let av: string | number = 0
    let bv: string | number = 0

    if (sortBy === 'createdAt') {
      av = a.createdAt ?? 0
      bv = b.createdAt ?? 0
    } else if (sortBy === 'updatedAt') {
      av = a.updatedAt ?? 0
      bv = b.updatedAt ?? 0
    } else if (sortBy === 'title') {
      const ap = a.payload as { title?: string; url?: string } | undefined
      const bp = b.payload as { title?: string; url?: string } | undefined
      av = (ap?.title || ap?.url || '').toLowerCase()
      bv = (bp?.title || bp?.url || '').toLowerCase()
    } else if (sortBy === 'url') {
      const ap = a.payload as { url?: string } | undefined
      const bp = b.payload as { url?: string } | undefined
      av = (ap?.url || '').toLowerCase()
      bv = (bp?.url || '').toLowerCase()
    }

    if (av < bv) return -1 * mul
    if (av > bv) return 1 * mul
    return 0
  })
}

function paginateHistory(jobs: Job[], query: HistoryListQuery): HistoryListResult {
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20
  const page = query.page && query.page > 0 ? query.page : 1
  const start = (page - 1) * pageSize
  const end = start + pageSize
  const items = jobs.slice(start, end)
  const nextPage = end < jobs.length ? page + 1 : null
  return { items, nextPage }
}

function computeStats(jobs: Job[]): DownloadHistoryStats {
  let totalSizeBytes = 0
  let completedSizeBytes = 0

  const totalCount = jobs.length
  let completedCount = 0
  let failedCount = 0
  let canceledCount = 0
  let deletedCount = 0
  let activeCount = 0

  for (const j of jobs) {
    const payload = j.payload as { sizeBytes?: number } | undefined
    const size = typeof payload?.sizeBytes === 'number' ? payload.sizeBytes : 0
    totalSizeBytes += size

    switch (j.status) {
      case 'completed':
        completedCount++
        completedSizeBytes += size
        break
      case 'failed':
        failedCount++
        break
      case 'canceled':
        canceledCount++
        break
      case 'deleted':
        deletedCount++
        break
      case 'pending':
      case 'queued':
      case 'downloading':
      case 'paused':
        activeCount++
        break
      default:
        break
    }
  }

  return {
    totalCount,
    completedCount,
    failedCount,
    canceledCount,
    deletedCount,
    activeCount,
    totalSizeBytes,
    completedSizeBytes
  }
}

export function initDownloadHistory(): void {
  // List history with filtering / sorting / search
  ipcMain.handle(DOWNLOAD_HISTORY_CHANNELS.LIST, (_e, query: HistoryListQuery = {}) => {
    const jobs = getJobs()
    const filtered = applyHistoryFilters(jobs, query)
    const sorted = applyHistorySort(filtered, query)
    return paginateHistory(sorted, query)
  })

  // Delete a single historical job (hard delete). Does not allow deleting active jobs.
  ipcMain.handle(DOWNLOAD_HISTORY_CHANNELS.DELETE, (_e, req: HistoryDeleteRequest) => {
    const jobs = getJobs()
    const idx = jobs.findIndex((j) => j.id === req.id)
    if (idx === -1) {
      return { success: false } satisfies HistoryDeleteResponse
    }

    const job = jobs[idx]
    if (isActiveStatus(job.status)) {
      return { success: false } satisfies HistoryDeleteResponse
    }

    jobs.splice(idx, 1)
    saveJobs(jobs)
    broadcastHistoryUpdate({ type: 'deleted', id: req.id })
    return { success: true } satisfies HistoryDeleteResponse
  })

  // Clear all historical jobs, keeping only active ones.
  ipcMain.handle(DOWNLOAD_HISTORY_CHANNELS.CLEAR, () => {
    const jobs = getJobs()
    const active: Job[] = []
    let removedCount = 0

    for (const j of jobs) {
      if (isActiveStatus(j.status)) {
        active.push(j)
      } else {
        removedCount++
      }
    }

    saveJobs(active)
    if (removedCount > 0) {
      broadcastHistoryUpdate({ type: 'cleared' })
    }
    return { removedCount } satisfies HistoryClearResponse
  })

  // Aggregate stats over all jobs
  ipcMain.handle(DOWNLOAD_HISTORY_CHANNELS.STATS, () => {
    const jobs = getJobs()
    const stats = computeStats(jobs)
    return stats satisfies DownloadHistoryStats
  })
}
