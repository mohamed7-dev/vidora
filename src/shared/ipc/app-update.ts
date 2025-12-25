import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'

export const APP_UPDATE_CHANNELS = {
  RENDERER_TO_MAIN: 'app-update:renderer-to-main',
  MAIN_TO_RENDERER: 'app-update:main-to-renderer'
}

export type AppUpdateRendererToMainPayload =
  | {
      action: 'download-approval'
      approvalResponse: 0 | 1
    }
  | {
      action: 'check'
      approvalResponse?: undefined
    }
  | {
      action: 'install-approval'
      approvalResponse: 0 | 1
    }

export type AppUpdateMainToRendererPayload =
  | {
      action: 'download-available'
      message: string
      messageKey: string
      updateInfo: UpdateInfo
      // cause?: string
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'download-progress'
      message: string
      messageKey: string
      progressInfo: ProgressInfo
      // cause?: string
      // updateInfo?: UpdateInfo
      // updateDownloadedInfo?: UpdateDownloadedEvent
    }
  | {
      action: 'downloaded-successfully'
      message: string
      messageKey: string
      updateDownloadedInfo: UpdateDownloadedEvent
      // cause?: string
      // progress?: string
      // updateInfo?: UpdateInfo
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'download-approval-success'
      message: string
      messageKey: string
      payload: { link: string }
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // cause?: string
      // progress?: string
      // updateInfo?: UpdateInfo
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'download-approval-fail'
      message: string
      messageKey: string
      cause: string
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // progress?: string
      // updateInfo?: UpdateInfo
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'install-approval-success'
      message: string
      messageKey: string
      // payload?: { link: string }
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // cause?: string
      // progress?: string
      // updateInfo?: UpdateInfo
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'install-approval-fail'
      message: string
      messageKey: string
      cause: string
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // progress?: string
      // updateInfo?: UpdateInfo
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'installed-successfully'
      message: string
      messageKey: string
      // cause?: string
      // progress?: string
      // updateInfo?: UpdateInfo
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // progressInfo?: ProgressInfo
    }
  | {
      action: 'error'
      message: string
      messageKey: string
      cause: string
      // progress?: string
      // updateInfo?: UpdateInfo
      // updateDownloadedInfo?: UpdateDownloadedEvent
      // progressInfo?: ProgressInfo
    }
// State Machine -> "download-available" -> "download-approval" -> "download-progress" -> "downloaded-successfully" -> "install-approval" -> "installed-successfully"

export type ApprovalRes = 0 | 1
