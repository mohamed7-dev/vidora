import { ipcMain, BrowserWindow, Notification } from 'electron'
import { EVENTS } from '../../shared/events'
import type {
  DownloadJobPayload,
  Job,
  JobStatus,
  JobsUpdateEvent,
  ListJobsParams
} from '../../shared/jobs'
import { randomUUID } from 'node:crypto'
import { DEFAULT_INTERNAL_CONFIG } from '../app-config/default-config'
import { downloadEngine } from '../ytdlp/download-engine'
import { readConfig } from '../app-config/config-api'
import { DATA } from '../../shared/data'

/*
  we need to use require here because electron-store is not a typescript module
*/
// eslint-disable-next-line @typescript-eslint/no-require-imports
const _mod = require('electron-store')
const ElectronStore = _mod.default ?? _mod

const store = new ElectronStore({
  name: 'jobs',
  cwd: DEFAULT_INTERNAL_CONFIG.jobsStorePath,
  defaults: { jobs: [] }
})

function now(): number {
  return Date.now()
}

function saveJobs(jobs: Job[]): void {
  store.set('jobs', jobs)
}

function getJobs(): Job[] {
  return store.get('jobs') || []
}

export function pauseAllIncompletedJobs(): void {
  const jobs = getJobs()
  let changed = false
  for (const j of jobs) {
    if (j.status === 'downloading') {
      j.status = 'paused'
      j.updatedAt = now()
      downloadEngine.stop(j.id)
      changed = true
    } else if (j.status === 'queued' || j.status === 'pending') {
      j.status = 'paused'
      j.updatedAt = now()
      changed = true
    }
  }
  if (changed) saveJobs(jobs)
}

function countActive(jobs: Job[]): number {
  return jobs.filter((j) => j.status === 'downloading').length
}

function maxConcurrent(): number {
  const config = readConfig()
  return config.downloads.maxDownloads
}

function decideInitialStatus(jobs: Job[]): JobStatus {
  return countActive(jobs) < maxConcurrent() ? 'downloading' : 'queued'
}

function broadcastUpdate(win: BrowserWindow | null, evt: JobsUpdateEvent): void {
  const targets = BrowserWindow.getAllWindows()
  for (const w of targets) w.webContents.send(EVENTS.DOWNLOAD_JOBS.UPDATED, evt)
  if (win) win.webContents.send(EVENTS.DOWNLOAD_JOBS.UPDATED, evt)
}

function notifyDownloadCompleted(job: Job): void {
  if (!Notification.isSupported()) return
  const payload = job.payload as DownloadJobPayload
  const title = payload?.title || payload?.url || 'Download completed'

  const notif = new Notification({
    title: DATA.appName,
    subtitle: title,
    body: 'Download finished successfully.',
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
  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.ADD, (_e, payload: DownloadJobPayload) => {
    const jobs = getJobs()
    const status = decideInitialStatus(jobs)
    const job: Job = {
      id: randomUUID(),
      status,
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

  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.LIST, (_e, params?: ListJobsParams) => {
    const jobs = getJobs()
    if (!params || !params.status) return jobs
    const statuses = Array.isArray(params.status) ? params.status : [params.status]
    return jobs.filter((j) => statuses.includes(j.status))
  })

  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.UPDATE_STATUS, (_e, id: string, status: JobStatus) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    j.status = status
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

  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.REMOVE, (_e, id: string) => {
    const jobs = getJobs()
    const idx = jobs.findIndex((x) => x.id === id)
    if (idx === -1) return false
    // stop if running
    downloadEngine.stop(id)
    const [removed] = jobs.splice(idx, 1)
    saveJobs(jobs)
    broadcastUpdate(null, { type: 'removed', job: removed })
    enqueueNextIfPossible()
    return true
  })

  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.PAUSE, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    if (j.status === 'downloading') {
      j.status = 'paused'
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
      downloadEngine.stop(id)
      enqueueNextIfPossible()
    }
    return j
  })

  ipcMain.handle(EVENTS.DOWNLOAD_JOBS.RESUME, (_e, id: string) => {
    const jobs = getJobs()
    const j = jobs.find((x) => x.id === id)
    if (!j) return null
    if (j.status === 'paused') {
      j.status = decideInitialStatus(jobs)
      j.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job: j })
      if (j.status === 'downloading') {
        downloadEngine.start(j)
      }
    }
    return j
  })
}

/**
 * @description
 * This function initializes the download jobs
 */
export function initDownloadJobs(): void {
  // engine hooks -> update jobs store and broadcast
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
    onDone: (jobId, ok, error) => {
      const jobs = getJobs()
      const j = jobs.find((x) => x.id === jobId)
      if (!j) return
      j.status = ok ? 'completed' : 'failed'
      j.progress = ok ? 100 : j.progress
      if (ok) delete j.error
      else if (error) j.error = error
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
