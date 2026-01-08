import { initDownloadJobs } from './download-jobs'
import { initDownloadHistory } from './history'

/**
 * @description
 * This function initializes download jobs, and history
 */
export function initJobs(): void {
  initDownloadJobs()
  initDownloadHistory()
}
