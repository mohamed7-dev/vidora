import { BrowserWindow } from 'electron'
import { CHECK_YTDLP_CHANNELS, CheckYtdlpChannelPayload } from '../../shared/ipc/check-ytdlp'

const mainWindow = BrowserWindow.getAllWindows()[0]

export function begin(): void {
  mainWindow.webContents.send(CHECK_YTDLP_CHANNELS.STATUS, {
    status: 'begin',
    message: 'Started checking yt-dlp',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckYtdlpChannelPayload)
}

export function progress(progress: number): void {
  mainWindow.webContents.send(CHECK_YTDLP_CHANNELS.STATUS, {
    status: 'progress',
    progress,
    message: 'Checking yt-dlp is in progress',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckYtdlpChannelPayload)
}

export function complete(): void {
  mainWindow.webContents.send(CHECK_YTDLP_CHANNELS.STATUS, {
    status: 'complete',
    message: 'yt-dlp is ready',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckYtdlpChannelPayload)
}

export function error(e: unknown, customMessage?: string, customMessageKey?: string): void {
  mainWindow.webContents.send(CHECK_YTDLP_CHANNELS.STATUS, {
    status: 'error',
    cause: e instanceof Error ? e.message : String(e),
    message: customMessage ?? 'Failed to check yt-dlp',
    messageKey: customMessageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckYtdlpChannelPayload)
}
