export const APP_INFO_CHANNELS = {
  GET_INFO: 'app-info:get'
} as const

export type AppInfo = {
  name: string
  version: string
  creatorName: string
  githubNewIssueUrl: string
}
