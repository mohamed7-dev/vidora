import { ipcMain, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import {
  DOWNLOAD_JOBS_CHANNELS,
  DownloadJobPayload,
  OpenJobResult
} from '../../shared/ipc/download-jobs'
import { broadcastUpdate } from './download-jobs'
import { getJobs, now, saveJobs } from './download-jobs-store'
import { t } from '../../shared/i18n/i18n'

export function initOpenDownloadJobIPC(): void {
  ipcMain.handle(DOWNLOAD_JOBS_CHANNELS.OPEN, async (_e, id: string): Promise<OpenJobResult> => {
    try {
      const jobs = getJobs()
      const job = jobs.find((x) => x.id === id)
      if (!job) {
        return { ok: false, error: t`Job not found` }
      }

      const payload = job.payload as DownloadJobPayload
      const downloadDir = payload.ytdlpArgs.downloadDir
      if (!downloadDir) {
        const msg = t`Download directory is not set for this job`
        job.error = msg
        job.updatedAt = now()
        saveJobs(jobs)
        broadcastUpdate(null, { type: 'updated', job })
        return { ok: false, error: msg }
      }
      const targetPath = payload.fileName ? path.join(downloadDir, payload.fileName) : downloadDir

      if (!fs.existsSync(targetPath)) {
        const msg = t(`File or directory does not exist: ${targetPath}`)
        job.error = msg
        job.updatedAt = now()
        saveJobs(jobs)
        broadcastUpdate(null, { type: 'updated', job })
        return { ok: false, error: msg }
      }

      // shell.openPath returns '' on success, or an error string.
      const result = await shell.openPath(targetPath)
      if (result) {
        // Failed to open; result is an error message
        job.error = result
        job.updatedAt = now()
        saveJobs(jobs)
        broadcastUpdate(null, { type: 'updated', job })
        return { ok: false, error: result }
      }

      // Clear any previous error on success
      if (job.error) delete job.error
      job.updatedAt = now()
      saveJobs(jobs)
      broadcastUpdate(null, { type: 'updated', job })

      return { ok: true }
    } catch (err) {
      console.error('OPEN job failed', err)
      return { ok: false, error: (err as Error).message ?? t`Something went wrong` }
    }
  })
}
