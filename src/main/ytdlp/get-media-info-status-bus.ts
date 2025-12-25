import { broadcastToAllWindows } from '../lib'
import { MEDIA_INFO_CHANNELS } from '../../shared/ipc/get-media-info'

const channel = MEDIA_INFO_CHANNELS.STATUS

export function begin(): void {
  broadcastToAllWindows(channel, {
    status: 'begin',
    message: 'Started grabbing media info',
    messageKey: 'begin' // TODO: change
  })
}

export function progress(progress: number): void {
  broadcastToAllWindows(channel, {
    status: 'progress',
    message: 'Grabbing media info',
    messageKey: 'progress', // TODO: change
    progress
  })
}

export function complete(): void {
  broadcastToAllWindows(channel, {
    status: 'complete',
    message: 'Media info grabbed successfully',
    messageKey: 'complete' // TODO: change
  })
}

export function error(e: unknown, message?: string, messageKey?: string): void {
  broadcastToAllWindows(channel, {
    status: 'error',
    message: message ?? 'Failed to grab media info',
    messageKey: messageKey ?? 'error', // TODO: change
    cause: e instanceof Error ? e.message : String(e)
  })
}
