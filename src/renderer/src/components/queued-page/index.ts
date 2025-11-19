import '../area-section/index'
import '../job-item/index'
import '../nodata-placeholder/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { DownloadJobPayload, Job } from '@root/shared/jobs'

export class QueuedPage extends HTMLElement {
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

  //Refs
  private _jobsList: HTMLDivElement | null = null

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
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsList = this.shadowRoot.querySelector<HTMLDivElement>('[data-el="jobs-list"]')
  }

  disconnectedCallback(): void {
    if (this._unsub) this._unsub()
    this._unsub = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [QueuedPage.sheet]
    this.shadowRoot.append(QueuedPage.tpl.content.cloneNode(true))
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

  private async _load(): Promise<void> {
    // Show queued jobs
    const all = await window.api.jobs.list()
    const jobs = (all || []).filter((j) => j.status === 'queued')
    this._renderJobs(jobs)
  }

  private _bindUpdates(): void {
    this._unsub = window.api.jobs.onUpdated(() => {
      void this._load()
    })
  }

  private _renderJobs(jobs: Array<Job>): void {
    if (!this._jobsList) return
    this._jobsList.innerHTML = ''

    if (!jobs.length) {
      const placeholder = document.createElement('nodata-placeholder')
      placeholder.setAttribute('message', this._t('queued.emptyMessage'))
      this._jobsList.appendChild(placeholder)
      return
    }
    for (const j of jobs) {
      const payload = j.payload as DownloadJobPayload
      const title = payload?.title || payload?.url || 'Untitled'
      const subtitle = `${j.status}`
      const jobItem = document.createElement('job-item')
      jobItem.setAttribute('title', title)
      jobItem.setAttribute('subtitle', subtitle)
      jobItem.setAttribute('thumbnail', payload.thumbnail || '')
      jobItem.setAttribute('state', j.status)
      jobItem.setAttribute('hide-pause-btn', 'true')
      jobItem.setAttribute('hide-resume-btn', 'true')
      jobItem.addEventListener('delete', async () => {
        await window.api.jobs.remove(j.id)
      })
      jobItem.setAttribute('progress', '0%')

      this._jobsList.appendChild(jobItem)
    }
  }
}
if (!customElements.get('queued-page')) {
  customElements.define('queued-page', QueuedPage)
}
declare global {
  interface HTMLElementTagNameMap {
    'queued-page': QueuedPage
  }
}
