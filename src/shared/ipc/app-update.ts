import { ProgressInfo, UpdateDownloadedEvent, UpdateInfo } from 'electron-updater'

export const APP_UPDATE_CHANNELS = {
  RENDERER_TO_MAIN: 'app-update:renderer-to-main',
  MAIN_TO_RENDERER: 'app-update:main-to-renderer'
}

export type AppUpdateRendererToMainPayload =
  | {
      action: 'download-approval'
      approvalResponse: ApprovalRes
    }
  | {
      action: 'install-approval'
      approvalResponse: ApprovalRes
    }
  | {
      action: 'check'
      approvalResponse?: undefined
    }

export type AppUpdateMainToRendererPayload =
  | {
      action: 'check-started'
      message: string
    }
  | {
      action: 'check-result'
      message: string
      payload: {
        hasUpdate: boolean
      }
    }
  | {
      action: 'download-available'
      message: string
      payload: {
        updateInfo: UpdateInfo
      }
    }
  | {
      action: 'download-progress'
      message: string
      payload: {
        progressInfo: ProgressInfo
      }
    }
  | {
      action: 'downloaded-successfully'
      message: string
      payload: {
        updateDownloadedInfo: UpdateDownloadedEvent
      }
    }
  | {
      action: 'download-approval-success'
      message: string
      payload: { link: string }
    }
  | {
      action: 'download-approval-fail'
      message: string
      payload: {
        cause: string
      }
    }
  | {
      action: 'install-approval-success'
      message: string
    }
  | {
      action: 'install-approval-fail'
      message: string
      payload: {
        cause: string
      }
    }
  | {
      action: 'installed-successfully'
      message: string
    }
  | {
      action: 'error'
      message: string
      payload: {
        cause: string
      }
    }
// State Machine -> "download-available" -> "download-approval" -> "download-progress" -> "downloaded-successfully" -> "install-approval" -> "installed-successfully"

export type ApprovalRes = 0 | 1
