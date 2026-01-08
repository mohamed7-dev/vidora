import html from './template.html?raw'
import style from './style.css?inline'
import { AppSetupChannelPayload } from '@root/shared/ipc/app-setup'
import { CheckYtdlpChannelPayload, InfoScopes } from '@root/shared/ipc/check-ytdlp'
import { DATA } from '@root/shared/data'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { type UiButton } from '@ui/button/ui-button'

const APP_SCRIM_TAG_NAME = 'app-scrim'
const ATTRIBUTES = {
  DATA_VISIBLE: 'data-visible'
}
export const APP_SCRIM_EVENTS = {
  APP_READY: 'app-scrim:app-ready'
}

export const APP_SCRIM_ACTIVE_ATTR = 'data-has-app-scrim'

export const FIRST_RUN_KEY = `${DATA.appName}:firstRunCompleted`

const TITLES = {
  APP_SETUP: window.api.i18n.t`Application Setup`,
  YTDLP: 'yt-dlp'
}

type Kinds = 'app-setup' | 'ytdlp'
type Snap =
  | {
      kind: 'app-setup'
      status: AppSetupChannelPayload
    }
  | {
      kind: 'ytdlp'
      status: CheckYtdlpChannelPayload
    }

const ICONS = {
  pending: 'loader-circle',
  info: 'info',
  success: 'circle-check-big',
  error: 'triangle-alert'
}

type NormalizedSnap = {
  id: Kinds
  title: string
  message: string
  state: 'pending' | 'success' | 'error' | 'info'
  progress?: number
  error?: string
  scope?: InfoScopes
}

export class AppScrim extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // states
  private unsubAppSetupStatus: (() => void) | null = null
  private unsubYtdlpStatus: (() => void) | null = null
  private rows = new Map<Kinds, HTMLElement>()
  private setupCompleted = false
  private ytdlpReady = false
  private enabled = true
  private _timeoutId: number | null = null

  // refs
  private _tasksWrapperEl: HTMLElement | null = null
  private _taskItemWrapperTpl: HTMLTemplateElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    this._render()
    this._queryRefs()
    this._init()
    this._applyListeners()
  }

  disconnectedCallback(): void {
    this.unsubAppSetupStatus?.()
    this.unsubAppSetupStatus = null
    this.unsubYtdlpStatus?.()
    this.unsubYtdlpStatus = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AppScrim.sheet]
    this.shadowRoot.append(AppScrim.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._tasksWrapperEl = this.shadowRoot.querySelector('[data-el="tasks-wrapper"]')
    this._taskItemWrapperTpl = this.shadowRoot.querySelector('[data-el="task-item-template"]')
  }

  private _init(): void {
    // init empty, don't show the app-scrim until any status comes on one of the status buses
    const firstRunCompleted = window.localStorage?.getItem(FIRST_RUN_KEY) === 'true'
    if (firstRunCompleted) {
      this.enabled = false
      document.documentElement.removeAttribute(APP_SCRIM_ACTIVE_ATTR)
      // scrim should never show again, remove it early
      this.remove()
      return
    }
    document.documentElement.removeAttribute(APP_SCRIM_ACTIVE_ATTR)
  }

  private _applyListeners(): void {
    if (!this.enabled) return
    void (async () => {
      try {
        const status = await window.api.setup.getStatus()
        if (status) {
          this.reflect({ kind: 'app-setup', status })
        }
      } catch {
        // ignore initial status errors
      }
      this.unsubAppSetupStatus = window.api.setup.onStatusUpdate((status) => {
        console.log('App Setup', status)
        this.reflect({ kind: 'app-setup', status })
      })
    })()
    this.unsubYtdlpStatus = window.api.ytdlp.onCheckingStatus((status) =>
      this.reflect({ kind: 'ytdlp', status })
    )
  }

  private reflect(snap: Snap): void {
    if (!this.enabled) return
    const normalized = this._normalizeSnap(snap)
    this._show()
    this._upsertRow(normalized)
    if (normalized.id === 'app-setup' && snap.status.status === 'success') {
      this.setupCompleted = true
    }
    if (normalized.id === 'ytdlp' && snap.status.status === 'complete') {
      this.ytdlpReady = true
    }
    if (this.setupCompleted && this.ytdlpReady) {
      this._onAllComplete()
    }
  }

  private _normalizeSnap(snap: Snap): NormalizedSnap {
    if (snap.kind === 'app-setup') {
      const payload = snap.status
      let state: NormalizedSnap['state'] = 'pending'
      if (payload.status === 'success') state = 'success'
      else if (payload.status === 'error') state = 'error'
      return {
        id: 'app-setup',
        title: TITLES.APP_SETUP,
        message: payload.message,
        state,
        error: payload.status === 'error' ? payload.payload.cause : undefined
      }
    }
    const payload = snap.status

    let state: NormalizedSnap['state'] = 'pending'
    if (payload.status === 'complete') state = 'success'
    else if (payload.status === 'error') state = 'error'
    else if (payload.status === 'info') state = 'info'
    else if (payload.status === 'progress') state = 'pending'
    return {
      id: 'ytdlp',
      title: TITLES.YTDLP,
      message: payload.message,
      state,
      progress: payload.status === 'progress' ? payload.payload.progress : undefined,
      error: payload.status === 'error' ? payload.payload.cause : undefined,
      scope: payload.status === 'info' ? payload.payload.scope : undefined
    }
  }

  private _upsertRow(snap: NormalizedSnap): void {
    if (!this._tasksWrapperEl || !this._taskItemWrapperTpl) return
    let row = this.rows.get(snap.id)
    if (!row) {
      const frag = this._taskItemWrapperTpl.content.cloneNode(true) as DocumentFragment
      const el = frag.querySelector<HTMLElement>('[data-el="task-item"]')
      if (!el) return
      this._tasksWrapperEl.appendChild(frag)
      row = this._tasksWrapperEl.lastElementChild as HTMLElement
      if (!row) return
      this.rows.set(snap.id, row)
    }
    row.dataset.state = snap.state
    const titleEl = row.querySelector<HTMLElement>('[data-el="task-item-title"]')
    const msgEl = row.querySelector<HTMLElement>('[data-el="task-item-message"]')
    const progressEl = row.querySelector<HTMLProgressElement>('[data-el="task-item-progress"]')
    const progressTextEl = row.querySelector<HTMLElement>('[data-el="task-item-progress-text"]')
    const errEl = row.querySelector<HTMLElement>('[data-el="task-item-error"]')
    const homebrewEl = row.querySelector<HTMLElement>('[data-el="task-item-homebrew"]')
    const iconEl = row.querySelector<HTMLElement>('[data-el="task-item-icon"]')
    if (titleEl) titleEl.textContent = snap.title
    if (msgEl) msgEl.textContent = snap.message
    if (progressEl && progressTextEl) {
      if (typeof snap.progress === 'number') {
        const progress = Math.max(0, Math.min(100, snap.progress))
        progressEl.hidden = false
        progressTextEl.hidden = false
        progressEl.value = progress
        progressTextEl.textContent = `${progress}%`
      } else {
        progressEl.hidden = true
        progressTextEl.hidden = true
      }
    }
    if (errEl) {
      if (snap.error) {
        errEl.hidden = false
        errEl.textContent = snap.error
      } else {
        errEl.hidden = true
        errEl.textContent = ''
      }
    }
    if (iconEl) {
      const currentIcon = iconEl.querySelector('ui-icon')
      // avoid re-creating the icon each time pending status is sent
      if (currentIcon && snap.state === 'pending') return
      const icon = ICONS[snap.state as keyof typeof ICONS] || ''
      const uiIcon = document.createElement('ui-icon')
      uiIcon.setAttribute('name', icon)
      if (snap.state === 'pending') uiIcon.setAttribute('spin', 'true')
      iconEl.replaceChildren(uiIcon)
    }
    if (homebrewEl) {
      if (snap.id === 'ytdlp' && snap.state === 'info' && snap.scope === 'macos-homebrew') {
        homebrewEl.hidden = false
        this._handleHomebrewActions(row)
      } else {
        homebrewEl.hidden = true
      }
    }
  }

  private _handleHomebrewActions(row: HTMLElement): void {
    const quitAppBtn = row.querySelector("[data-el='quit-app-btn']") as UiButton | null
    const quitHandler = (): void => this._handleQuittingApp()
    if (quitAppBtn) {
      quitAppBtn.removeEventListener('click', quitHandler)
      quitAppBtn.addEventListener('click', quitHandler)
    }
  }

  private _handleQuittingApp(): void {
    window.api.app.quit()
  }

  private _show(): void {
    if (!this.enabled) return
    this.setAttribute(ATTRIBUTES.DATA_VISIBLE, 'true')
    document.documentElement.setAttribute(APP_SCRIM_ACTIVE_ATTR, 'true')
  }

  private _hide(): void {
    this.removeAttribute(ATTRIBUTES.DATA_VISIBLE)
    document.documentElement.removeAttribute(APP_SCRIM_ACTIVE_ATTR)
  }

  private _onAllComplete(): void {
    if (this._timeoutId) {
      window.clearTimeout(this._timeoutId)
      this._timeoutId = null
    }
    this._timeoutId = window.setTimeout(() => {
      this.dispatchEvent(
        new CustomEvent(APP_SCRIM_EVENTS.APP_READY, { composed: true, bubbles: true })
      )
      this.enabled = false
      this._hide()
      try {
        window.localStorage?.setItem(FIRST_RUN_KEY, 'true')
      } catch {
        // ignore storage errors
      }
      this.unsubAppSetupStatus?.()
      this.unsubYtdlpStatus?.()
      this.unsubAppSetupStatus = null
      this.unsubYtdlpStatus = null
      this.remove()
    }, 3000)
  }
}

if (!customElements.get(APP_SCRIM_TAG_NAME)) customElements.define(APP_SCRIM_TAG_NAME, AppScrim)
declare global {
  interface HTMLElementTagNameMap {
    [APP_SCRIM_TAG_NAME]: AppScrim
  }
}
