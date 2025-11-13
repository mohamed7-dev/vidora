import { UpdateInfo } from 'electron-updater'

export interface ApproveAppUpdatePayload {
  messageKey: string
  message: string
  details: {
    releaseName: Pick<UpdateInfo, 'releaseName'>
  }
}

export type DownloadAppUpdateApprovalRes = 0 | 1

export interface ApproveAppInstallPayload {
  messageKey: string
  message: string
  details: {
    releaseName: Pick<UpdateInfo, 'releaseName'>
  }
}

export type InstallAppUpdateApprovalRes = 0 | 1
