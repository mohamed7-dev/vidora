import type { NotificationActionRef } from './db'

export type NotificationActionPayload = unknown

export type NotificationActionHandler = (payload: NotificationActionPayload) => void | Promise<void>

const registry = new Map<string, NotificationActionHandler>()

export function registerNotificationAction(id: string, handler: NotificationActionHandler): void {
  registry.set(id, handler)
}

export function unregisterNotificationAction(id: string): void {
  registry.delete(id)
}

export function getNotificationAction(id: string): NotificationActionHandler | undefined {
  return registry.get(id)
}

export function runNotificationAction(action: NotificationActionRef): void {
  const handler = registry.get(action.id)
  if (!handler) return
  try {
    void Promise.resolve(handler(action.payload))
  } catch {
    // no-op
  }
}
