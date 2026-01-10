import html from './downloading-page.template.html?raw'
import style from './downloading-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { DownloadJobPayload, Job, type JobsUpdateEvent } from '@root/shared/ipc/download-jobs'
import { JOB_ITEM_EVENTS, JobItem } from '../job-item/job-item.component'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { ICONS_KEYS } from '../ui/icon/icons'

const DOWNLOADING_PAGE_TAG_NAME = 'downloading-page'

export class DownloadingPage extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  //states
  private _eventsAborter: null | AbortController = new AbortController()
  private _unsub: (() => void) | null = null

  //Refs
  private _jobsList: HTMLDivElement | null = null
  private _jobItems = new Map<string, JobItem>()
  private _emptyPlaceholder: HTMLElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    if (!this._eventsAborter) {
      this._eventsAborter = new AbortController()
    }
    this._load()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._bindUpdates()
  }

  disconnectedCallback(): void {
    if (this._unsub) this._unsub()
    this._unsub = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
    this._jobItems.clear()
    this._emptyPlaceholder = null
  }
  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [DownloadingPage.sheet]
    this.shadowRoot.append(DownloadingPage.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsList = this.shadowRoot.querySelector<HTMLDivElement>('[data-el="jobs-list"]')
  }

  private async _load(): Promise<void> {
    const all = await window.api.downloadJobs.list()
    const jobs = (all.items || []).filter(
      (j) => j.status === 'downloading' || j.status === 'paused'
    )
    this._renderJobs(jobs)
  }

  private _bindUpdates(): void {
    this._unsub = window.api.downloadJobs.onUpdated((evt: JobsUpdateEvent) => {
      this._handleJobsUpdate(evt)
    })
  }

  private _renderJobs(jobs: Array<Job>): void {
    if (!this._jobsList) return
    this._jobsList.innerHTML = ''
    this._jobItems.clear()
    this._emptyPlaceholder = null
    if (!jobs.length) {
      this._ensurePlaceholder()
      return
    }

    jobs.forEach((j, index) => {
      const article = document.createElement('area-article')
      if (index === 0) article.setAttribute('first', '')
      if (index === jobs.length - 1) article.setAttribute('last', '')

      const jobItem = this._createJobItem(j)
      jobItem.slot = 'content'
      article.appendChild(jobItem)

      this._jobsList?.appendChild(article)
      this._jobItems.set(j.id, jobItem)
    })
  }

  private _handleJobsUpdate(evt: JobsUpdateEvent): void {
    const { job } = evt
    const isRelevant = job.status === 'downloading' || job.status === 'paused'
    const existing = this._jobItems.get(job.id)

    // If job no longer relevant to this page, remove it if present.
    if (!isRelevant) {
      if (existing) {
        const container = existing.closest('area-article') ?? existing
        if (container.parentNode) {
          container.parentNode.removeChild(container)
        }
      }
      this._jobItems.delete(job.id)
      if (this._jobItems.size === 0) {
        this._ensurePlaceholder()
      }
      return
    }

    // Job is relevant (downloading/paused)
    if (!this._jobsList) return

    if (!existing) {
      // New job: create and insert
      this._removePlaceholder()

      const article = document.createElement('area-article')
      const jobItem = this._createJobItem(job)
      jobItem.slot = 'content'
      article.appendChild(jobItem)

      this._jobsList.appendChild(article)
      this._jobItems.set(job.id, jobItem)
      return
    }

    // Updated job: patch existing job item
    this._updateJobItem(existing, job)
  }

  private _createJobItem(j: Job): JobItem {
    const payload = j.payload as DownloadJobPayload
    const title = payload?.title || payload?.url || window.api.i18n.t`Untitled`
    const jobItem = document.createElement('job-item')

    jobItem.create({
      label: title,
      thumbnail: payload.thumbnail,
      subtitle: j.statusText,
      hideOpenBtn: true,
      hideCopyUrlBtn: true,
      hideDeleteBtn: true
    })

    if (j.status === 'failed' && j.error) {
      jobItem.subtitle = j.error
    }

    if (this._eventsAborter) {
      const signal = this._eventsAborter.signal
      jobItem.addEventListener(
        JOB_ITEM_EVENTS.PAUSE,
        async () => {
          await window.api.downloadJobs.pause(j.id)
        },
        { signal }
      )
      jobItem.addEventListener(
        JOB_ITEM_EVENTS.RESUME,
        async () => {
          await window.api.downloadJobs.resume(j.id)
        },
        { signal }
      )
      jobItem.addEventListener(
        JOB_ITEM_EVENTS.DELETE,
        async () => {
          await window.api.downloadJobs.remove(j.id)
        },
        { signal }
      )
    }

    this._applyJobProgress(jobItem, j)
    return jobItem
  }

  private _updateJobItem(jobItem: JobItem, j: Job): void {
    // Update basic status / error
    if (j.status === 'failed' && j.error) {
      jobItem.subtitle = j.error
    } else {
      jobItem.subtitle = j.statusText
    }
    this._applyJobProgress(jobItem, j)
  }

  private _applyJobProgress(jobItem: JobItem, j: Job): void {
    if (typeof j.progress === 'number' && j.progress > 0) {
      const pct = `${Math.max(0, Math.min(100, Math.round(j.progress)))}%`
      const subtitle = `${j.statusText} • ${pct}`
      jobItem.subtitle = subtitle

      const progress = `${Math.max(0, Math.min(100, j.progress))}%`
      jobItem.progress = progress
    }
  }

  private _ensurePlaceholder(): void {
    this.setAttribute('data-empty', '')
    if (!this._jobsList) return
    if (this._emptyPlaceholder) return
    const placeholder = document.createElement('empty-data-placeholder')
    placeholder.create({
      message: window.api.i18n.t`No Downloads Running`,
      iconName: ICONS_KEYS.find((icon) => icon === 'arrow-big-down-dash')
    })
    placeholder.append(document.createElement('add-download-button'))
    this._jobsList.appendChild(placeholder)
    this._emptyPlaceholder = placeholder
  }

  private _removePlaceholder(): void {
    this.removeAttribute('data-empty')
    if (this._emptyPlaceholder && this._emptyPlaceholder.parentNode) {
      this._emptyPlaceholder.parentNode.removeChild(this._emptyPlaceholder)
    }
    this._emptyPlaceholder = null
  }
}
if (!customElements.get(DOWNLOADING_PAGE_TAG_NAME)) {
  customElements.define(DOWNLOADING_PAGE_TAG_NAME, DownloadingPage)
}
declare global {
  interface HTMLElementTagNameMap {
    [DOWNLOADING_PAGE_TAG_NAME]: DownloadingPage
  }
}
