import { ipcMain, BrowserWindow, Notification, clipboard } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { downloadEngine } from '../ytdlp/download-engine'
import { DATA } from '../../shared/data'
import {
  DOWNLOAD_JOBS_CHANNELS,
  DownloadJobPayload,
  Job,
  JobStatus,
  JobsUpdateEvent,
  ListJobsParams,
  ListJobsResult,
  statuses
} from '../../shared/ipc/download-jobs'
import { initOpenDownloadJobIPC } from './open-download-job'
import { readConfig } from '../app-config/config-api'
import { t } from '../../shared/i18n/i18n'
import {
  countActive,
  decideInitialStatus,
  getJobs,
  maxConcurrent,
  now,
  saveJobs
} from './download-jobs-store'

export function pauseAllIncompletedJobs(): void {
  const jobs = getJobs()
  let changed = false
  for (const j of jobs) {
    if (j.status === 'downloading') {
      j.status = 'paused'
      j.statusText = statuses.paused
      j.updatedAt = now()
      downloadEngine.stop(j.id)
      changed = true
    } else if (j.status === 'queued' || j.status === 'pending') {
      j.status = 'paused'
      j.statusText = statuses.paused
      j.updatedAt = now()
      changed = true
    }
  }
  if (changed) saveJobs(jobs)
}

export function broadcastUpdate(win: BrowserWindow | null, evt: JobsUpdateEvent): void {
  const targets = BrowserWindow.getAllWindows()
  for (const w of targets) w.webContents.send(DOWNLOAD_JOBS_CHANNELS.STATUS_BUS, evt)
  if (win) win.webContents.send(DOWNLOAD_JOBS_CHANNELS.STATUS_BUS, evt)
}

function notifyDownloadCompleted(job: Job): void {
  if (!Notification.isSupported()) return
  const payload = job.payload as DownloadJobPayload
  const displayTitle = (payload?.title || payload?.url || '').trim() || t`Download completed`

  const notif = new Notification({
    title: DATA.appName,
    subtitle: displayTitle,
    body: `${t`Download finished successfully.`} ${displayTitle}`,
    silent: false
  })
  notif.show()
}

function enqueueNextIfPossible(): void {
  const jobs = getJobs()
  const active = countActive(jobs)
  const max = maxConcurrent()
  if (active >= max) return
  const next = jobs.find((j) => j.status === 'queued')
  if (!next) return
  next.status = 'downloading'
  next.statusText = statuses.downloading
  next.updatedAt = now()
  saveJobs(jobs)
  broadcastUpdate(null, { type: 'updated', job: next })
}

/**
 * @description
 * This function registers the download jobs IPC
 * it registers handlers for the add, list, update_status, remove, pause, resume events.
 */
function registerDownloadJobsIPC(): void {
  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.ADD, (_e, payload: DownloadJobPayload) => {
    const jobs = getJobs()
    const status = decideInitialStatus(jobs)
    const job: Job = {
      id: randomUUID(),
      status: status.status,
      statusText: status.statusText,
      progress: 0,
      createdAt: now(),
      updatedAt: now(),
      payload
    }
    jobs.unshift(job)
    saveJobs(jobs)
    broadcastUpdate(null, { type: 'added', job })
    if (job.status === 'downloading') {
      // start immediately
      downloadEngine.start(job)
    }
    return job
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.LIST, (_e, params?: ListJobsParams): ListJobsResult => {
    const jobs = getJobs()
    let filtered = jobs
    if (params?.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status]
      filtered = jobs.filter((j) => statuses.includes(j.status))
    }

    const pageSize = params?.pageSize && params.pageSize > 0 ? params.pageSize : 20
    const page = params?.page && params.page > 0 ? params.page : 1
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const items = filtered.slice(start, end)
    const nextPage = end < filtered.length ? page + 1 : null

    return { items, nextPage }
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.UPDATE_STATUS, (_e, id: string, status: JobStatus) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    j.status = status
    j.statusText = statuses[status]
    j.updatedAt = now()
    saveJobs(jobs)
    broadcastUpdate(null, { type: 'updated', job: j })
    if (status === 'downloading') {
      // clear any stale error before starting
      if (j.error) delete j.error
      downloadEngine.start(j)
    }
    if (status === 'paused' || status === 'canceled') {
      downloadEngine.stop(id)
    }
    if (
      status === 'completed' ||
      status === 'failed' ||
      status === 'canceled' ||
      status === 'paused'
    ) {
      enqueueNextIfPossible()
    }
    return j
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.REMOVE, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return false
    // stop if running
    downloadEngine.stop(id)
    // soft delete
    j.status = 'deleted'
    j.statusText = statuses.deleted
    saveJobs(jobs)
    broadcastUpdate(null, { type: 'updated', job: j })
    enqueueNextIfPossible()
    return true
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.PAUSE, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    if (j.status === 'downloading') {
      j.status = 'paused'
      j.statusText = statuses.paused
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
      downloadEngine.stop(id)
      enqueueNextIfPossible()
    }
    return j
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.RESUME, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    if (j.status === 'paused') {
      const stateInfo = decideInitialStatus(jobs)
      j.status = stateInfo.status
      j.statusText = stateInfo.statusText
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
      if (j.status === 'downloading') {
        downloadEngine.start(j, { resume: true })
      }
    }
    return j
  })

  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.COPY_URL, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) {
      return { ok: false, error: 'Job not found' }
    }
    const payload = j.payload as DownloadJobPayload
    if (!payload.url) {
      return { ok: false, error: 'No URL associated with this job' }
    }
    clipboard.writeText(payload.url)
    return { ok: true }
  })

  initOpenDownloadJobIPC()
}

/**
 * @description
 * This function initializes the download jobs
 */
export function initDownloadJobs(): void {
  downloadEngine.setHooks({
    onProgress: (jobId, progress) => {
      const jobs = getJobs()
      const j = jobs.find((x) => x.id === jobId)
      if (!j) return
      j.progress = progress
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
    },
    onFilename: (jobId, fileName) => {
      const jobs = getJobs()
      const j = jobs.find((x) => x.id === jobId)
      if (!j) return // store the final file name on the payload so renderer can show/open it
      ;(j.payload as DownloadJobPayload).fileName = fileName
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
    },
    onDone: (jobId, ok, error) => {
      const jobs = getJobs()
      const j = jobs.find((x) => x.id === jobId)
      if (!j) return
      if (j.status === 'paused' || j.status === 'canceled') {
        // Job was explicitly paused/canceled by the user shouldn't be treated as a failure
        return
      }
      j.status = ok ? 'completed' : 'failed'
      j.statusText = ok ? statuses.completed : statuses.failed
      j.progress = ok ? 100 : j.progress
      if (ok) {
        delete j.error

        // Try to resolve final file size from disk for history stats.
        const payload = j.payload as DownloadJobPayload
        const downloadDir =
          (payload.ytdlpArgs.downloadDir as string | null) || readConfig().downloads.downloadDir
        const fileName = payload.fileName
        if (downloadDir && fileName) {
          const fullPath = path.join(downloadDir, fileName)
          try {
            const stat = fs.statSync(fullPath)
            if (typeof stat.size === 'number' && Number.isFinite(stat.size)) {
              payload.sizeBytes = stat.size
            }
          } catch {
            // Ignore stat errors; sizeBytes will remain undefined.
          }
        }
      } else if (error) {
        j.error = error
      }
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
      if (ok) notifyDownloadCompleted(j)
      enqueueNextIfPossible()
    }
  })

  // register IPC
  registerDownloadJobsIPC()
}
