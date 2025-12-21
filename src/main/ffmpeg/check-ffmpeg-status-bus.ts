import { BrowserWindow } from 'electron'
import { CHECK_FFMPEG_CHANNELS, CheckFfmpegChannelPayload } from '../../shared/ipc/check-ffmpeg'

const mainWindow = BrowserWindow.getAllWindows()[0]

export function begin(): void {
  mainWindow.webContents.send(CHECK_FFMPEG_CHANNELS.STATUS, {
    status: 'begin',
    message: 'Started checking ffmpeg',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckFfmpegChannelPayload)
}

export function progress(progress: number, message?: string, messageKey?: string): void {
  mainWindow.webContents.send(CHECK_FFMPEG_CHANNELS.STATUS, {
    status: 'progress',
    progress,
    message: message ?? 'Checking ffmpeg',
    messageKey: messageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckFfmpegChannelPayload)
}

export function complete(): void {
  mainWindow.webContents.send(CHECK_FFMPEG_CHANNELS.STATUS, {
    status: 'complete',
    message: 'ffmpeg is ready',
    messageKey: 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckFfmpegChannelPayload)
}

export function error(e: unknown, customMessage?: string, customMessageKey?: string): void {
  mainWindow.webContents.send(CHECK_FFMPEG_CHANNELS.STATUS, {
    status: 'error',
    cause: e instanceof Error ? e.message : String(e),
    message: customMessage ?? 'Failed to check ffmpeg',
    messageKey: customMessageKey ?? 'status.ytdlp.checking' // TODO: replace it with lingui style of localization
  } satisfies CheckFfmpegChannelPayload)
}
