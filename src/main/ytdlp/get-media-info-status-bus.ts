import { BrowserWindow } from 'electron'
import { MEDIA_INFO_CHANNELS, MediaInfoChannelPayload } from '../../shared/ipc/get-media-info'

const mainWindow = BrowserWindow.getAllWindows()[0]

export function begin(): void {
  mainWindow.webContents.send(MEDIA_INFO_CHANNELS.STATUS, {
    status: 'begin',
    message: 'Started grabbing media info',
    messageKey: 'begin' // TODO: change
  } satisfies MediaInfoChannelPayload)
}

export function progress(progress: number): void {
  mainWindow.webContents.send(MEDIA_INFO_CHANNELS.STATUS, {
    status: 'progress',
    message: 'Grabbing media info',
    messageKey: 'progress', // TODO: change
    progress
  } satisfies MediaInfoChannelPayload)
}

export function complete(): void {
  mainWindow.webContents.send(MEDIA_INFO_CHANNELS.STATUS, {
    status: 'complete',
    message: 'Media info grabbed successfully',
    messageKey: 'complete' // TODO: change
  } satisfies MediaInfoChannelPayload)
}

export function error(e: unknown, message?: string, messageKey?: string): void {
  mainWindow.webContents.send(MEDIA_INFO_CHANNELS.STATUS, {
    status: 'error',
    message: message ?? 'Failed to grab media info',
    messageKey: messageKey ?? 'error', // TODO: change
    cause: e instanceof Error ? e.message : String(e)
  } satisfies MediaInfoChannelPayload)
}
