import {
  type NotificationActionRef,
  type NotificationRecord,
  clearNotifications,
  deleteNotification,
  listNotifications,
  markAsRead,
  putNotification
} from './db'

export type { NotificationRecord, NotificationActionRef } from './db'

export interface CreateNotificationInput {
  title: string
  message: string
  actions?: NotificationActionRef[]
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: timestamp + random
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export async function addNotification(input: CreateNotificationInput): Promise<NotificationRecord> {
  const now = Date.now()
  const record: NotificationRecord = {
    id: createId(),
    title: input.title,
    message: input.message,
    actions: input.actions ?? [],
    createdAt: now,
    read: false
  }

  await putNotification(record)
  window.dispatchEvent(new CustomEvent('notifications-changed'))
  return record
}

export async function upsertNotification(
  id: string,
  input: CreateNotificationInput
): Promise<NotificationRecord> {
  const now = Date.now()
  const record: NotificationRecord = {
    id,
    title: input.title,
    message: input.message,
    actions: input.actions ?? [],
    createdAt: now,
    read: false
  }

  await putNotification(record)
  window.dispatchEvent(new CustomEvent('notifications-changed'))
  return record
}

export async function listAllNotifications(): Promise<NotificationRecord[]> {
  return listNotifications()
}

export async function removeNotification(id: string): Promise<void> {
  await deleteNotification(id)
  window.dispatchEvent(new CustomEvent('notifications-changed'))
}

export async function removeAllNotifications(): Promise<void> {
  await clearNotifications()
  window.dispatchEvent(new CustomEvent('notifications-changed'))
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await markAsRead(id)
  window.dispatchEvent(new CustomEvent('notifications-changed'))
}
