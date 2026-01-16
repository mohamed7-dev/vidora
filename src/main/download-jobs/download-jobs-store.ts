import { Job, JobStatus } from '../../shared/ipc/download-jobs'
import { readConfig } from '../app-config/config-api'
import { DEFAULT_INTERNAL_CONFIG } from '../app-config/default-config'

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

export function saveJobs(jobs: Job[]): void {
  store.set('jobs', jobs)
}

export function getJobs(): Job[] {
  return store.get('jobs') || []
}

export function countActive(jobs: Job[]): number {
  return jobs.filter((j) => j.status === 'downloading').length
}

export function maxConcurrent(): number {
  const config = readConfig()
  return config.downloads.maxDownloads
}

export function decideInitialStatus(jobs: Job[]): JobStatus {
  return countActive(jobs) < maxConcurrent() ? 'downloading' : 'queued'
}

export function now(): number {
  return Date.now()
}
