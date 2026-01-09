import html from './notification-center.template.html?raw'
import style from './notification-center.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import {
  type NotificationRecord,
  listAllNotifications,
  markNotificationAsRead,
  removeAllNotifications,
  removeNotification
} from '@renderer/lib/notifications/api'
import { runNotificationAction } from '@renderer/lib/notifications/actions'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const TAG_NAME = 'notification-center'
const POLL_INTERVAL_MS = 5000

export class NotificationCenter extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  private _listEl: HTMLDivElement | null = null
  private _badgeEl: HTMLSpanElement | null = null
  private _pollHandle: number | null = null
  private _onNotificationsChanged: (() => void) | null = null
  private _clearAllBtn: HTMLButtonElement | null = null
  private _onClearAllClick: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._bindClearAll()
    void this._refresh()
    this._startPolling()
    this._listenToChanges()
    localizeElementsText(this.shadowRoot as ShadowRoot)
  }

  disconnectedCallback(): void {
    this._stopPolling()
    this._unlistenToChanges()
    this._unbindClearAll()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NotificationCenter.sheet]
    this.shadowRoot.append(NotificationCenter.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._listEl = this.shadowRoot.querySelector('[data-el="list"]') as HTMLDivElement | null
    this._badgeEl = this.shadowRoot.querySelector('[data-el="badge"]') as HTMLSpanElement | null
    this._clearAllBtn = this.shadowRoot.querySelector(
      '[data-el="clear-all"]'
    ) as HTMLButtonElement | null
  }

  private _startPolling(): void {
    this._stopPolling()
    this._pollHandle = window.setInterval(() => {
      void this._refresh()
    }, POLL_INTERVAL_MS)
  }

  private _stopPolling(): void {
    if (this._pollHandle !== null) {
      window.clearInterval(this._pollHandle)
      this._pollHandle = null
    }
  }

  private _bindClearAll(): void {
    this._unbindClearAll()
    if (!this._clearAllBtn) return
    this._onClearAllClick = () => {
      void removeAllNotifications()
    }
    this._clearAllBtn.addEventListener('click', this._onClearAllClick)
  }

  private _unbindClearAll(): void {
    if (this._clearAllBtn && this._onClearAllClick) {
      this._clearAllBtn.removeEventListener('click', this._onClearAllClick)
    }
    this._onClearAllClick = null
  }

  private _listenToChanges(): void {
    this._unlistenToChanges()
    this._onNotificationsChanged = () => {
      void this._refresh()
    }
    window.addEventListener('notifications-changed', this._onNotificationsChanged)
  }

  private _unlistenToChanges(): void {
    if (this._onNotificationsChanged) {
      window.removeEventListener('notifications-changed', this._onNotificationsChanged)
      this._onNotificationsChanged = null
    }
  }

  private async _refresh(): Promise<void> {
    const items = await listAllNotifications()
    this._renderList(items)
    this._updateBadge(items)
    this._updateClearAllEnabled(items)
  }

  private _renderList(items: NotificationRecord[]): void {
    if (!this._listEl) return
    this._listEl.innerHTML = ''

    if (!items.length) {
      const empty = document.createElement('empty-data-placeholder')
      let msg = 'No notifications yet'
      try {
        if (window.api && window.api.i18n && typeof window.api.i18n.t === 'function') {
          msg = window.api.i18n.t`No notifications yet`
        }
      } catch {
        // Fallback to default message on any i18n error
      }
      empty.setAttribute('data-message', msg)
      empty.setAttribute('data-icon-name', 'bell')
      this._listEl.append(empty)
      return
    }

    for (const item of items) {
      const root = document.createElement('div')
      root.classList.add('notification-center__item')
      if (!item.read) root.classList.add('notification-center__item--unread')

      const header = document.createElement('div')
      header.classList.add('notification-center__item-header')

      const title = document.createElement('div')
      title.classList.add('notification-center__item-title')
      title.textContent = item.title

      const closeBtn = document.createElement('ui-button')
      closeBtn.classList.add('notification-center__item-close')
      closeBtn.setAttribute('variant', 'ghost')
      closeBtn.setAttribute('size', 'icon')
      const closeIcon = document.createElement('ui-icon')
      closeIcon.setAttribute('name', 'x')
      closeBtn.append(closeIcon)
      closeBtn.addEventListener('click', () => {
        void removeNotification(item.id)
      })

      header.append(title, closeBtn)

      const msg = document.createElement('div')
      msg.classList.add('notification-center__item-message')
      msg.textContent = item.message

      root.append(header, msg)

      if (item.actions?.length) {
        const actionsEl = document.createElement('div')
        actionsEl.classList.add('notification-center__item-actions')

        for (const action of item.actions) {
          const btn = document.createElement('ui-button')
          btn.textContent = action.label
          btn.addEventListener('click', () => {
            runNotificationAction(action)
            void markNotificationAsRead(item.id)
            void this._refresh()
          })
          actionsEl.append(btn)
        }

        root.append(actionsEl)
      }

      this._listEl.append(root)
    }
  }

  private _updateBadge(items: NotificationRecord[]): void {
    if (!this._badgeEl) return
    const unread = items.filter((n) => !n.read).length
    if (!unread) {
      this._badgeEl.hidden = true
      this._badgeEl.textContent = ''
      return
    }
    this._badgeEl.hidden = false
    this._badgeEl.textContent = unread > 9 ? '9+' : String(unread)
  }

  private _updateClearAllEnabled(items: NotificationRecord[]): void {
    if (!this._clearAllBtn) return
    this._clearAllBtn.disabled = items.length === 0
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, NotificationCenter)
}

declare global {
  interface HTMLElementTagNameMap {
    [TAG_NAME]: NotificationCenter
  }
}
