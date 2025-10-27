import { ipcMain } from 'electron'
import { EVENTS } from '../shared/events'
import { getMediaInfo } from './ytdlp'

export function registerDownloadsIpc(): void {
  ipcMain.handle(EVENTS.DOWNLOADS.GET_INFO, async (_e, url: string) => {
    if (!url || typeof url !== 'string') throw new Error('Invalid URL')
    const info = await getMediaInfo(url)
    return info
  })
}
