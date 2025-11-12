import tpl from './template.html?raw'
import css from './style.css?inline'
import type { StatusSnapshot, TaskKind, TaskStatus } from '@root/shared/status'

const TITLES: Record<TaskKind, string> = {
  ytdlp: 'yt-dlp',
  ffmpeg: 'FFmpeg',
  appUpdate: 'App update',
  configDownloadDir: '',
  configTray: '',
  configYtDlpFile: ''
}

const FIRST_RUN_KEY = 'vidora:firstRunCompleted'

export class AppScrim extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(css)
    return s
  })()
  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(tpl, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : tpl
    return t
  })()

  // states
  private t = window.api?.i18n?.t || (() => '')
  private unsubStatus: (() => void) | null = null
  private unsubLocale: (() => void) | null = null
  private rows = new Map<TaskKind, HTMLElement>()
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
    this.applyI18n()
    void this.applyInitial()
    this._applyListeners()
  }

  disconnectedCallback(): void {
    this.unsubStatus?.()
    this.unsubStatus = null
    this.unsubLocale?.()
    this.unsubLocale = null
  }

  private applyI18n(): void {
    const nodes = this.shadowRoot?.querySelectorAll('[data-i18n]')
    if (!nodes) return
    nodes.forEach((node) => {
      const key = node.getAttribute('data-i18n')
      if (!key) return
      const t = window.api?.i18n?.t
      if (!t) return
      node.textContent = t(key)
    })
  }

  private _applyListeners(): void {
    this.unsubStatus = window.api.status.onUpdate((snap) => this.reflect(snap))
    const maybeUnsub = window.api?.i18n?.onLocaleChanged?.(() => {
      void this.applyInitial()
    })
    this.unsubLocale = maybeUnsub ?? null
  }

  private async applyInitial(): Promise<void> {
    const snap = await window.api.status.getSnapshot()
    this.reflect(snap)
  }

  private reflect(snap: StatusSnapshot): void {
    const whiteList = new Set<TaskKind>(['ytdlp', 'ffmpeg', 'appUpdate'])
    // Show rows for any kind that has a non-idle state
    ;(Object.keys(snap) as TaskKind[]).forEach((kind) => {
      const st = snap[kind]
      if (!st || st.state === 'idle' || !whiteList.has(kind)) return
      this.upsertRow(kind, st)
    })

    // Remove rows for kinds that went back to idle/undefined
    for (const [kind] of this.rows) {
      const st = snap[kind]
      if (!st || st.state === 'idle' || !whiteList.has(kind)) {
        this.rows.get(kind)?.remove()
        this.rows.delete(kind)
      }
    }

    const firstRunDone = localStorage.getItem(FIRST_RUN_KEY) === '1'
    const isPending = (k: TaskKind): boolean => {
      const st = snap[k]
      return st?.state === 'pending' && !!st.messageKey && whiteList.has(k)
    }
    const ytdlpPending = isPending('ytdlp')
    const ffmpegPending = isPending('ffmpeg')
    const appUpdatePending = isPending('appUpdate')

    const blocking = appUpdatePending || (!firstRunDone && (ytdlpPending || ffmpegPending))

    document.documentElement.dataset.appBlocking = String(blocking)
    this.toggleAttribute('data-visible', blocking)

    if (!firstRunDone && !ytdlpPending && !ffmpegPending) {
      try {
        localStorage.setItem(FIRST_RUN_KEY, '1')
      } catch (e) {
        void e
      }
    }
  }

  private upsertRow(kind: TaskKind, st: TaskStatus): void | undefined {
    if (!this._tasksWrapperEl) return
    const row = this.rows.get(kind) ?? this.createRow(kind)
    if (!row) return
    row.dataset.state = st.state

    // title
    const titleEl = row.querySelector<HTMLElement>('[data-el="task-title"]')
    if (titleEl) titleEl.textContent = TITLES[kind] || kind

    // message (prefer localized key)
    const msgEl = row.querySelector<HTMLElement>('[data-el="task-message"]')
    if (!msgEl) return
    if (st.messageKey) {
      msgEl.textContent = this.t(st.messageKey)
    } else {
      msgEl.textContent =
        st.message ||
        (st.state === 'pending' ? (this.t('status.generic.working') ?? 'Working…') : '')
    }

    // progress (optional)
    const prog = row.querySelector<HTMLProgressElement>('[data-el="task-progress"]')
    if (!prog) return
    if (typeof st.progress === 'number') {
      prog.removeAttribute('hidden')
      prog.value = Math.max(0, Math.min(100, st.progress))
    } else {
      prog.setAttribute('hidden', 'true')
    }

    // error badge text (optional)
    const err = row.querySelector<HTMLElement>('[data-el="task-error"]')
    if (!err) return
    if (st.state === 'error') {
      if (st.error?.key) {
        err.textContent = this.t(st.error.key)
      } else {
        err.textContent = st.error?.message ?? ''
      }
      err.removeAttribute('hidden')
    } else {
      err.setAttribute('hidden', 'true')
      err.textContent = ''
    }
  }

  private createRow(kind: TaskKind): HTMLElement | undefined {
    if (!this._taskItemWrapperTpl || !this._tasksWrapperEl) return
    const frag = this._taskItemWrapperTpl.content.cloneNode(true) as DocumentFragment
    const row = frag.querySelector<HTMLElement>('[data-el="task-wrapper"]')
    if (!row) return
    this._tasksWrapperEl.appendChild(row)
    this.rows.set(kind, row)
    return row
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
}

if (!customElements.get('app-scrim')) customElements.define('app-scrim', AppScrim)
declare global {
  interface HTMLElementTagNameMap {
    'app-scrim': AppScrim
  }
}
