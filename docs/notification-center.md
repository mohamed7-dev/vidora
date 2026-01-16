# Notification center and IndexedDB storage

This document describes how the notification center works in the renderer, how it is backed by IndexedDB, and how it is used by features like app updates and yt-dlp background updates.

Related docs:

- [Renderer startup and setup integration](./renderer-startup.md)
- [Main process startup](./main-process-startup.md)

---

## 1. High-level architecture

The notification system has three main layers:

1. **Storage layer (IndexedDB)**
   - `src/renderer/src/lib/notifications/db.ts`.
   - Provides low-level CRUD operations on `NotificationRecord` objects.

2. **API layer (domain-level helpers)**
   - `src/renderer/src/lib/notifications/api.ts`.
   - Exposes convenience functions like `addNotification`, `upsertNotification`, and `removeNotification`.
   - Emits a global `notifications-changed` event after each mutation.

3. **UI layer (notification center component)**
   - `src/renderer/src/components/notification-center/notification-center.ts`.
   - Custom element `<notification-center>` that:
     - Polls and listens for `notifications-changed`.
     - Renders the list of notifications.
     - Updates a badge and clear-all button.
     - Executes actions via `runNotificationAction`.

Main-process events (e.g. app-update, yt-dlp status) are converted into notifications at the API layer and then displayed by the UI layer.

---

## 2. Data model and IndexedDB store

### 2.1 Notification record shape

Defined in `db.ts`:

```ts
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
```

Key points:

- `id` uniquely identifies a notification.
  - Can be auto-generated (for generic toasts) or fixed (for stateful flows like app update).
- `actions` describes buttons rendered under each notification in the center.
  - Actions are mapped to named handlers using `registerNotificationAction`.
- `createdAt` is used for sorting; **newest first**.
- `read` is used for UI styling and badge count.

### 2.2 Database structure

Also in `db.ts`:

- Database name: `vidora-notifications`.
- Version: `1`.
- Object store: `notifications`.
- Keys and indexes:
  - Primary key: `keyPath: 'id'`.
  - Index `createdAt` for listing.
  - Index `read` for potential filtering.

On `onupgradeneeded`, the code creates the store and indexes if they don’t already exist.

---

## 3. Storage helpers (`db.ts`)

The storage layer wraps `window.indexedDB` in small async helpers:

- `openDb()`
  - Opens (or creates) the `vidora-notifications` database.
  - Handles version upgrades and object store/index creation.

- `withStore(mode, fn)`
  - Utility helper to run an operation against a transaction-backed object store.

- CRUD operations:
  - `listNotifications()`
    - Opens a readonly transaction and gets all records from the `createdAt` index.
    - Sorts by `createdAt` descending (newest first).
  - `getNotification(id)`
  - `putNotification(notification)`
  - `deleteNotification(id)`
  - `clearNotifications()`

- `markAsRead(id)`
  - Loads an existing record.
  - If present and not already `read`, flips `read` to `true` and persists.

These helpers are intentionally low-level; they do **not** dispatch any UI events.

---

## 4. Domain API (`api.ts`)

`src/renderer/src/lib/notifications/api.ts` provides a higher-level API for the rest of the renderer:

### 4.1 Creating and updating notifications

- `addNotification(input: CreateNotificationInput)`
  - Builds a new `NotificationRecord` with a **random id** (using `crypto.randomUUID()` when available).
  - Sets `createdAt` to `Date.now()` and `read` to `false`.
  - Calls `putNotification(record)`.
  - Dispatches a `notifications-changed` event on `window`.

- `upsertNotification(id, input: CreateNotificationInput)`
  - Similar to `addNotification`, but uses a **fixed id** supplied by callers.
  - Overwrites any existing notification with the same id.
  - Commonly used for long-running flows (app updates, yt-dlp updates) where you want a single evolving card.

### 4.2 Reading and mutating

- `listAllNotifications()`
  - Thin wrapper over `listNotifications()`.

- `removeNotification(id)`
  - Delegates to `deleteNotification(id)`.
  - Dispatches `notifications-changed`.

- `removeAllNotifications()`
  - Delegates to `clearNotifications()`.
  - Dispatches `notifications-changed`.

- `markNotificationAsRead(id)`
  - Delegates to `markAsRead(id)`.
  - Dispatches `notifications-changed`.

The **event dispatching** here (`notifications-changed`) is what keeps the UI in sync without coupling the component directly to IndexedDB APIs.

---

## 5. UI component: `<notification-center>`

Defined in `src/renderer/src/components/notification-center/notification-center.ts`.

### 5.1 Lifecycle

On `connectedCallback`:

- Renders its shadow DOM from HTML and CSS templates.
- Queries important refs:
  - List container.
  - Badge element.
  - Clear-all button.
  - `UiSheet` wrapper.
- Syncs the sheet side based on config direction (`ltr`/`rtl`).
- Performs an initial `_refresh()` to load notifications.
- Starts a **polling interval** (default: 5000ms) that periodically calls `_refresh()`.
- Registers a listener for `notifications-changed` to trigger additional refreshes.
- Localizes any text content inside its shadow root.

On `disconnectedCallback`:

- Stops polling.
- Removes the `notifications-changed` listener.
- Unbinds the clear-all button.

### 5.2 Rendering notifications

`_refresh()`:

- Calls `listAllNotifications()` (API layer).
- Renders the list and updates the badge and clear-all button enabled state.

`_renderList(items)`:

- If there are **no items**:
  - Renders an `empty-data-placeholder` component with a localized “No notifications yet” message.
- For each `NotificationRecord`:
  - Renders a container with:
    - Title.
    - Message.
    - Optional actions.
    - Close button.
  - Uses CSS classes to mark unread items as highlighted.

Actions:

- Each `NotificationActionRef` becomes a button.
- On click:
  - Calls `runNotificationAction(action)`.
  - Marks the notification as read.
  - Triggers another `_refresh()`.

Close button:

- Calls `removeNotification(id)` to delete the record.

### 5.3 Badge and clear-all behavior

- Badge:
  - Shows the number of **unread** notifications.
  - Hides when there are none.
  - Shows `9+` when count exceeds 9.

- Clear-all button:
  - Disabled when there are no notifications.
  - On click, calls `removeAllNotifications()` to clear the store.

---

## 6. Using notifications in features

Two main features currently use the notification system:

### 6.1 App update flow

From `renderer.ts`:

- Listens to app-update events from main via `window.api.appUpdate.mainToRenderer`.
- For each event, calls `upsertNotification` with a **fixed `APP_UPDATE_NOTIFICATION_ID`**.
- Uses actions like `app-update-download-now`, `app-update-download-later`, etc., which are registered via `registerNotificationAction`.

This produces a **single evolving notification card** that tracks the lifecycle of an update:

- Update available → downloading → downloaded → error (if any).

### 6.2 yt-dlp background updates

Also in `renderer.ts`:

- Listens to `window.api.ytdlp.onCheckingStatus`.
- For info events with specific scopes:
  - `updating-ytdlp` → “Updating yt-dlp” notification.
  - `updated-ytdlp` → “yt-dlp updated” notification.
- Uses a fixed `YTDLP_UPDATE_NOTIFICATION_ID` so the card is updated instead of duplicated.

Note: the **initial yt-dlp installation** (first run) is handled by `app-scrim`; notification center is for **background updates** that shouldn’t block the UI.

---

## 7. Design considerations

- **Persistence across sessions**
  - Notifications are stored in IndexedDB, so they survive page reloads and app restarts (until cleared or removed).

- **Loose coupling**
  - Features only depend on the **API layer** (e.g. `upsertNotification`) and the actions registry.
  - The UI reacts via `notifications-changed` events and does not know about app-update or yt-dlp specifics.

- **Stable IDs for flows**
  - Long-running flows should use **fixed IDs** so notifications evolve rather than accumulate duplicates.

- **Accessibility and localization**
  - Titles and messages are localized using `window.api.i18n.t`.
  - The notification center uses semantic HTML and is integrated into the existing UI component system.

When adding new features:

- Prefer recording important background events as notifications instead of blocking the UI.
- Use the notification API and, where appropriate, stable IDs.
- Register corresponding actions with `registerNotificationAction` if the notification needs interactive buttons.
