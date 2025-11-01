import template from './template.html?raw'
import styleCss from './style.css?inline'
import { DownloadJobPayload, Job } from '@root/shared/jobs'

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

  //Refs
  private _jobsList: HTMLDivElement | null = null
  private _jobItemTemplate: HTMLTemplateElement | null = null

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
    this._jobsList = this.shadowRoot.querySelector<HTMLDivElement>('#jobs-list')
    this._jobItemTemplate = this.shadowRoot.querySelector<HTMLTemplateElement>('#job-item-template')
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

  private _renderJobs(jobs: Array<Job>): void {
    if (!this._jobsList || !this._jobItemTemplate) return
    this._jobsList.innerHTML = ''
    if (!jobs.length) {
      const empty = document.createElement('p')
      empty.textContent = 'No active downloads'
      empty.className = 'job-sub'
      this._jobsList.appendChild(empty)
      return
    }
    for (const j of jobs) {
      const fragment = this._jobItemTemplate.content.cloneNode(true) as DocumentFragment
      const item = fragment.firstElementChild as HTMLElement
      // refs inside item
      const titleEl = item.querySelector<HTMLElement>('[data-el="title"]')
      const subEl = item.querySelector<HTMLElement>('[data-el="subtitle"]')
      const barEl = item.querySelector<HTMLElement>('[data-el="bar"]')
      const pauseBtn = item.querySelector<HTMLElement>('[data-el="pauseBtn"]')
      const resumeBtn = item.querySelector<HTMLElement>('[data-el="resumeBtn"]')
      const deleteBtn = item.querySelector<HTMLElement>('[data-el="deleteBtn"]')

      const payload = j.payload as DownloadJobPayload
      if (titleEl) titleEl.textContent = payload?.title || payload?.url || 'Untitled'
      const pct =
        typeof j.progress === 'number'
          ? `${Math.max(0, Math.min(100, Math.round(j.progress)))}%`
          : '0%'
      if (subEl) subEl.textContent = `${j.status} • ${pct}`
      if (barEl)
        barEl.style.width =
          typeof j.progress === 'number' ? `${Math.max(0, Math.min(100, j.progress))}%` : '0%'

      // toggle controls visibility
      if (pauseBtn) pauseBtn.style.display = j.status === 'downloading' ? '' : 'none'
      if (resumeBtn) resumeBtn.style.display = j.status === 'paused' ? '' : 'none'

      // bind events
      pauseBtn?.addEventListener('click', async () => {
        await window.api.jobs.pause(j.id)
      })
      resumeBtn?.addEventListener('click', async () => {
        await window.api.jobs.resume(j.id)
      })
      deleteBtn?.addEventListener('click', async () => {
        await window.api.jobs.remove(j.id)
      })

      this._jobsList.appendChild(fragment)
    }
  }

  private _applyI18n(): void {
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
