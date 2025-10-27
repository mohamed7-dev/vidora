import tpl from './template.html?raw'
import css from './style.css?raw'
import type { StatusSnapshot, TaskKind, TaskStatus } from '@root/shared/status'

const TITLES: Record<TaskKind, string> = {
  ytdlp: 'yt-dlp',
  ffmpeg: 'FFmpeg',
  appUpdate: 'App update',
  download: 'Download',
  configDownloadDir: 'Download path',
  configTray: 'System tray',
  configYtDlp: 'yt-dlp config'
}

export class AppScrim extends HTMLElement {
  private unsubStatus: (() => void) | null = null
  private unsubLocale: (() => void) | null = null
  private tasksEl: HTMLElement | null = null
  private rows = new Map<TaskKind, HTMLElement>()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  async connectedCallback(): Promise<void> {
    await this.render()
    this.applyI18n()
    void this.applyInitial()
    this.unsubStatus = window.api.status.onUpdate((snap) => this.reflect(snap))
    const maybeUnsub = window.api?.i18n?.onLocaleChanged?.(() => {
      void this.applyInitial()
    })
    this.unsubLocale = maybeUnsub ?? null
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
  private async applyInitial(): Promise<void> {
    const snap = await window.api.status.getSnapshot()
    this.reflect(snap)
  }

  private reflect(snap: StatusSnapshot): void {
    // Show rows for any kind that has a non-idle state
    ;(Object.keys(snap) as TaskKind[]).forEach((kind) => {
      const st = snap[kind]
      if (!st || st.state === 'idle') return
      this.upsertRow(kind, st)
    })

    // Remove rows for kinds that went back to idle/undefined
    for (const [kind] of this.rows) {
      const st = snap[kind]
      if (!st || st.state === 'idle') {
        this.rows.get(kind)?.remove()
        this.rows.delete(kind)
      }
    }

    // Blocking rule (opt-in): block only for specific pending statuses
    const allowedPendingKeys = new Set<string>([
      'status.ytdlp.checking',
      'status.ffmpeg.checking',
      'status.configDownloadDir.picking'
    ])
    const blocking = (Object.keys(snap) as TaskKind[]).some((k) => {
      const st = snap[k]
      return st?.state === 'pending' && !!st.messageKey && allowedPendingKeys.has(st.messageKey)
    })

    document.documentElement.dataset.appBlocking = String(blocking)
    this.toggleAttribute('data-visible', blocking)
  }

  private upsertRow(kind: TaskKind, st: TaskStatus): void {
    if (!this.tasksEl) return
    const row = this.rows.get(kind) ?? this.createRow(kind)
    row.dataset.state = st.state

    // title
    row.querySelector<HTMLElement>('.task__title')!.textContent = TITLES[kind] || kind

    // message (prefer localized key)
    const msgEl = row.querySelector<HTMLElement>('.task__msg')!
    const t = window.api?.i18n?.t
    if (st.messageKey && t) {
      // If params support is added later, pass st.messageParams
      msgEl.textContent = t(st.messageKey)
    } else {
      msgEl.textContent =
        st.message || (st.state === 'pending' ? (t?.('status.generic.working') ?? 'Working…') : '')
    }

    // progress (optional)
    const prog = row.querySelector<HTMLProgressElement>('progress')!
    if (typeof st.progress === 'number') {
      prog.removeAttribute('hidden')
      prog.value = Math.max(0, Math.min(100, st.progress))
    } else {
      prog.setAttribute('hidden', 'true')
    }

    // error badge text (optional)
    const err = row.querySelector<HTMLElement>('.task__err')!
    if (st.state === 'error') {
      if (st.error?.key && t) {
        err.textContent = t(st.error.key)
      } else {
        err.textContent = st.error?.message ?? ''
      }
      err.removeAttribute('hidden')
    } else {
      err.setAttribute('hidden', 'true')
      err.textContent = ''
    }
  }

  private createRow(kind: TaskKind): HTMLElement {
    const row = document.createElement('div')
    row.className = 'task'
    row.innerHTML = `
      <div class="task__icon" part="task-icon"></div>
      <div class="task__center">
        <div class="task__title" part="task-title"></div>
        <div class="task__msg" part="task-message"></div>
      </div>
      <div class="task__right">
        <progress max="100" value="0" hidden part="task-progress"></progress>
        <span class="task__err" hidden part="task-error"></span>
      </div>
    `
    this.tasksEl!.appendChild(row)
    this.rows.set(kind, row)
    return row
  }

  private async render(): Promise<void> {
    const doc = new DOMParser().parseFromString(tpl, 'text/html')
    const t = doc.querySelector<HTMLTemplateElement>('template')
    if (!t) return
    const frag = t.content.cloneNode(true)

    const sheet = new CSSStyleSheet()
    await sheet.replace(css)
    this.shadowRoot!.adoptedStyleSheets = [sheet]
    this.shadowRoot!.appendChild(frag)

    this.tasksEl = this.shadowRoot!.getElementById('tasks')
  }
}

customElements.define('app-scrim', AppScrim)
