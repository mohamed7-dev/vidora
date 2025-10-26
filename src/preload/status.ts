import { contextBridge, ipcRenderer } from 'electron'
import { EVENTS } from '../shared/events'
import type { StatusSnapshot } from '../shared/status'

contextBridge.exposeInMainWorld('api', {
  status: {
    getSnapshot: (): Promise<StatusSnapshot> => ipcRenderer.invoke(EVENTS.STATUS.SNAPSHOT),
    onUpdate: (cb: (snap: StatusSnapshot) => void) => {
      const handler = (_: unknown, snap: StatusSnapshot): void => cb(snap)
      ipcRenderer.on(EVENTS.STATUS.UPDATE, handler)
      return () => ipcRenderer.removeListener(EVENTS.STATUS.UPDATE, handler)
    }
  }
})
