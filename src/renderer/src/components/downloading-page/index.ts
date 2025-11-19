import '../area-section/index'
import '../job-item/index'
import '../nodata-placeholder/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { DownloadJobPayload, Job } from '@root/shared/jobs'
import { UIAlert } from '../ui'
import type { StatusSnapshot, TaskStatus } from '@root/shared/status'

export class DownloadingPage extends HTMLElement {
  // Cache stylesheet and template per class for performance and to prevent FOUC
  private static readonly sheet: CSSStyleSheet = (() => {
    const s = new CSSStyleSheet()
    s.replaceSync(styleCss)
    return s
  })()

  private static readonly tpl: HTMLTemplateElement = (() => {
    const parser = new DOMParser()
    const doc = parser.parseFromString(template, 'text/html')
    const inner = doc.querySelector('template')
    const t = document.createElement('template')
    t.innerHTML = inner ? inner.innerHTML : template
    return t
  })()

  //states
  private _t = window.api.i18n?.t ?? (() => '')
  private _unsub: (() => void) | null = null
  private _statusUnsub: (() => void) | null = null

  //Refs
  private _jobsList: HTMLDivElement | null = null
  private _errorAlert: UIAlert | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    this._applyI18n()
    void this._load()
    this._bindUpdates()
    this._bindStatus()
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsList = this.shadowRoot.querySelector<HTMLDivElement>('[data-el="jobs-list"]')
    this._errorAlert = this.shadowRoot.querySelector<UIAlert>('#download-error-alert')
  }

  disconnectedCallback(): void {
    if (this._unsub) this._unsub()
    this._unsub = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [DownloadingPage.sheet]
    this.shadowRoot.append(DownloadingPage.tpl.content.cloneNode(true))
  }

  private async _load(): Promise<void> {
    // Show active (downloading) and paused jobs; exclude queued and finished
    const all = await window.api.jobs.list()
    const jobs = (all || []).filter((j) => j.status === 'downloading' || j.status === 'paused')
    this._renderJobs(jobs)
  }

  private _bindUpdates(): void {
    this._unsub = window.api.jobs.onUpdated(() => {
      void this._load()
    })
  }

  private _bindStatus(): void {
    this._statusUnsub?.()
    this._statusUnsub = window.api.status.onUpdate((snap: StatusSnapshot) => {
      const st = snap.ytdlp as TaskStatus | undefined
      if (!st || st.kind !== 'ytdlp') return

      const scope = (st.messageParams as Record<string, unknown> | undefined)?.scope
      if (scope !== 'download') return

      if (!this._errorAlert) {
        this._errorAlert = this.shadowRoot?.querySelector<UIAlert>('#download-error-alert') || null
      }
      const alert = this._errorAlert
      if (!alert) return

      if (st.state === 'error') {
        const titleEl = alert.querySelector('[slot="title"]') as HTMLElement | null
        const descEl = alert.querySelector('[slot="description"]') as HTMLElement | null
        const key = st.error?.key || st.messageKey
        const fallback = st.error?.message || st.message || 'Download failed.'

        if (titleEl) {
          titleEl.textContent = this._t('downloading.error.title') || 'Error'
        }
        if (descEl) {
          descEl.textContent = (key && this._t(key)) || fallback
        }

        alert.setAttribute('variant', 'destructive')
        alert.show()
      } else if (st.state === 'pending' || st.state === 'success') {
        alert.hide()
      }
    })
  }

  private _renderJobs(jobs: Array<Job>): void {
    if (!this._jobsList) return
    this._jobsList.innerHTML = ''
    if (!jobs.length) {
      const placeholder = document.createElement('nodata-placeholder')
      placeholder.setAttribute('message', this._t('downloading.emptyMessage'))
      this._jobsList.appendChild(placeholder)
      return
    }
    for (const j of jobs) {
      const payload = j.payload as DownloadJobPayload
      const title = payload?.title || payload?.url || 'Untitled'
      const jobItem = document.createElement('job-item')

      jobItem.setAttribute('title', title)
      jobItem.setAttribute('thumbnail', payload.thumbnail || '')
      jobItem.setAttribute('state', j.status)
      jobItem.addEventListener('pause', async () => {
        await window.api.jobs.pause(j.id)
      })
      jobItem.addEventListener('resume', async () => {
        await window.api.jobs.resume(j.id)
      })
      jobItem.addEventListener('delete', async () => {
        await window.api.jobs.remove(j.id)
      })

      // Only show subtitle + progress once we have real progress
      if (typeof j.progress === 'number' && j.progress > 0) {
        const pct = `${Math.max(0, Math.min(100, Math.round(j.progress)))}%`
        const subtitle = `${j.status} • ${pct}`
        jobItem.setAttribute('subtitle', subtitle)

        const progress = `${Math.max(0, Math.min(100, j.progress))}%`
        jobItem.setAttribute('progress', progress)
      }

      this._jobsList.appendChild(jobItem)
    }
  }

  private _applyI18n(): void {
    // labels translation
    this.shadowRoot?.querySelectorAll('[label]').forEach((e) => {
      const key = e.getAttribute('label')
      if (!key) return
      e.setAttribute('label', this._t(key))
    })
    const elements = this.shadowRoot?.querySelectorAll('[data-i18n]')
    if (!elements) return
    elements.forEach((e) => {
      const key = e.getAttribute('data-i18n')
      if (!key) return
      e.textContent = this._t(key)
    })
  }
}
if (!customElements.get('downloading-page')) {
  customElements.define('downloading-page', DownloadingPage)
}
declare global {
  interface HTMLElementTagNameMap {
    'downloading-page': DownloadingPage
  }
}
