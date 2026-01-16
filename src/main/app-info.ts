import { app, ipcMain } from 'electron'
import { APP_INFO_CHANNELS, type AppInfo } from '../shared/ipc/app-info'
import { DATA } from '../shared/data'

function initAppInfoIpc(): void {
  ipcMain.handle(APP_INFO_CHANNELS.GET_INFO, (): AppInfo => {
    return {
      name: DATA.appName,
      version: app.getVersion(),
      creatorName: DATA.appCreatorName,
      githubNewIssueUrl: DATA.repoNewIssueLink
    }
  })
}

export function initAppInfo(): void {
  initAppInfoIpc()
}
