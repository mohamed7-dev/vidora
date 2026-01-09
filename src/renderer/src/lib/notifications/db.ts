// Notifications IndexedDB wrapper

export interface NotificationActionRef {
  id: string
  label: string
  // Optional, must be JSON-serializable
  payload?: unknown
}

export interface NotificationRecord {
  id: string
  title: string
  message: string
  actions: NotificationActionRef[]
  createdAt: number
  read: boolean
}

const DB_NAME = 'vidora-notifications'
const DB_VERSION = 1
const STORE_NAME = 'notifications'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id'
        })
        store.createIndex('createdAt', 'createdAt', { unique: false })
        store.createIndex('read', 'read', { unique: false })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error ?? new Error('Failed to open notifications database'))
    }
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode)
    const store = tx.objectStore(STORE_NAME)
    const request = fn(store)

    request.onsuccess = () => {
      resolve(request.result as T)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('Notifications store operation failed'))
    }
  })
}

export async function listNotifications(): Promise<NotificationRecord[]> {
  const db = await openDb()
  return new Promise<NotificationRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('createdAt')
    const request = index.getAll()

    request.onsuccess = () => {
      const items = (request.result as NotificationRecord[])
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
      resolve(items)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('Failed to list notifications'))
    }
  })
}

export async function getNotification(id: string): Promise<NotificationRecord | undefined> {
  return withStore<NotificationRecord | undefined>('readonly', (store) => store.get(id))
}

export async function putNotification(notification: NotificationRecord): Promise<void> {
  await withStore('readwrite', (store) => store.put(notification))
}

export async function deleteNotification(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

export async function clearNotifications(): Promise<void> {
  await withStore('readwrite', (store) => store.clear())
}

export async function markAsRead(id: string): Promise<void> {
  const existing = await getNotification(id)
  if (!existing) return
  if (existing.read) return
  existing.read = true
  await putNotification(existing)
}
