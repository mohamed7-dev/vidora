import html from './jobs-page.template.html?raw'
import style from './jobs-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { Job, JobStatus, JobsUpdateEvent } from '@root/shared/ipc/download-jobs'
import { HistoryUpdateEvent } from '@root/shared/ipc/download-history'
import { createInfiniteLoaderElement } from '@renderer/lib/infinite-loader'
import { EmptyPlaceholderConfig } from '../empty-placeholder/empty-placeholder.component'

export type JobsPageStatusFilter = JobStatus | JobStatus[]

export type JobItemFactoryArgs = {
  job: Job
  index: number
  total: number
  eventsAborter: AbortController | null
}

export type JobItemFactory = (args: JobItemFactoryArgs) => HTMLElement

export type JobsPageLoaderParams = {
  status: JobsPageStatusFilter
  page: number
  pageSize: number
}
export type JobsPageLoader = (params: JobsPageLoaderParams) => Promise<{
  items: Job[]
  nextPage: number | null
}>

export type JobsPageApiType = 'job' | 'history'

export type JobsPageConfig = {
  api?: JobsPageApiType
  status: JobsPageStatusFilter
  pageSize?: number
  empty: EmptyPlaceholderConfig & { actionsNode?: Node }
  jobItemFactory: JobItemFactory
  loader?: JobsPageLoader
}

export interface EmptyChangeEventDetail {
  isEmpty: boolean
}

const JOBS_PAGE_TAG_NAME = 'jobs-page'

export const JOBS_PAGE_EVENTS = {
  EMPTY_CHANGED: 'jobs-page:empty-changed'
}

export class JobsPage extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  private _config: JobsPageConfig | null = null

  private _isEmpty = false
  private _page: number | null = null
  private _isLoadingNext = false
  private _jobs: Job[] = []

  private _unsub: (() => void) | null = null
  private _eventsAborter: null | AbortController = new AbortController()

  private _jobsList: HTMLDivElement | null = null
  private _footer: HTMLDivElement | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._cacheRefs()
    // Ensure we have a fresh AbortController for item-level events on (re)connect.
    if (!this._eventsAborter) {
      this._eventsAborter = new AbortController()
    }
    this._load()
    this._bindUpdates()
  }

  disconnectedCallback(): void {
    if (this._unsub) this._unsub()
    this._unsub = null
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  public async create(config: JobsPageConfig): Promise<{ isEmpty: boolean }> {
    this._config = config
    this._page = null
    this._jobs = []
    this._isLoadingNext = false

    // Tear down any existing update subscriptions so we can re-bind for the new config.
    if (this._unsub) {
      this._unsub()
      this._unsub = null
    }

    // Reset the AbortController so previously created job items stop listening
    // and new ones get a fresh signal.
    if (this._eventsAborter) {
      this._eventsAborter.abort()
    }
    this._eventsAborter = new AbortController()

    // Bind updates according to the new configuration (jobs vs history, filters, etc.).
    this._bindUpdates()

    const isEmpty = await this._load(1)
    return { isEmpty: isEmpty !== undefined ? isEmpty : false }
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [JobsPage.sheet]
    this.shadowRoot.append(JobsPage.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsList = this.shadowRoot.querySelector<HTMLDivElement>('[data-el="jobs-list"]')
    this._footer = this.shadowRoot.querySelector<HTMLDivElement>('[data-el="jobs-footer"]')
  }

  private async _load(page?: number): Promise<boolean | undefined> {
    if (!this._config) return
    if (this._isLoadingNext) return
    this._isLoadingNext = true
    const pageToLoad = page ?? this._page ?? 1
    const pageSize = this._config.pageSize ?? 10
    const loader = this._config.loader
      ? this._config.loader
      : async ({ status, page, pageSize }) =>
          window.api.downloadJobs.list({ status, page, pageSize })

    const all = await loader({
      status: this._config.status,
      page: pageToLoad,
      pageSize
    })

    this._page = all.nextPage
    const newJobs = all.items || []

    const shouldAppend = pageToLoad > 1 && this._jobs.length > 0
    if (shouldAppend) {
      this._jobs = [...this._jobs, ...newJobs]
    } else {
      this._jobs = newJobs
    }

    this._renderJobs(this._jobs)
    this._isLoadingNext = false
    this._renderFooter()
    return this._isEmpty
  }

  private _bindUpdates(): void {
    if (!this._config) return

    const api: JobsPageApiType = this._config.api ?? 'job'

    if (api === 'job') {
      this._unsub = window.api.downloadJobs.onUpdated((evt) => {
        this._handleJobsUpdate(evt)
      })
    } else {
      this._unsub = window.api.history.onUpdated
        ? window.api.history.onUpdated((evt) => {
            this._handleHistoryUpdate(evt as HistoryUpdateEvent)
          })
        : null
    }
  }

  private _handleJobsUpdate(evt: JobsUpdateEvent): void {
    if (!this._config) return

    if (evt.type === 'removed') {
      this._jobs = this._jobs.filter((j) => j.id !== evt.job.id)
    } else if (evt.type === 'updated') {
      // Soft delete comes through as an "updated" event where status === 'deleted'.
      // Treat that as a removal from the current list.
      if (evt.job.status === 'deleted') {
        this._jobs = this._jobs.filter((j) => j.id !== evt.job.id)
      } else {
        const idx = this._jobs.findIndex((j) => j.id === evt.job.id)
        if (idx === -1) return
        this._jobs[idx] = evt.job
      }
    } else if (evt.type === 'added') {
      const statusFilter = this._config.status
      const allowedStatuses = Array.isArray(statusFilter) ? statusFilter : [statusFilter]
      if (!allowedStatuses.includes(evt.job.status)) return
      this._jobs = [evt.job, ...this._jobs]
    }
    if (!this._jobs.length) this._isEmpty = true
    const wasEmpty = this._isEmpty
    this._renderJobs(this._jobs)
    this._renderFooter()

    if (this._isEmpty !== wasEmpty) {
      this.dispatchEvent(
        new CustomEvent<EmptyChangeEventDetail>(JOBS_PAGE_EVENTS.EMPTY_CHANGED, {
          detail: { isEmpty: this._isEmpty }
        })
      )
    }
  }

  private _handleHistoryUpdate(evt: HistoryUpdateEvent): void {
    if (!this._config) return

    if (evt.type === 'deleted') {
      this._jobs = this._jobs.filter((j) => j.id !== evt.id)
    } else if (evt.type === 'cleared') {
      this._jobs = []
    }

    if (!this._jobs.length) this._isEmpty = true
    const wasEmpty = this._isEmpty

    this._renderJobs(this._jobs)
    this._renderFooter()

    if (this._isEmpty !== wasEmpty) {
      this.dispatchEvent(
        new CustomEvent<EmptyChangeEventDetail>(JOBS_PAGE_EVENTS.EMPTY_CHANGED, {
          detail: { isEmpty: this._isEmpty }
        })
      )
    }
  }

  private _renderJobs(jobs: Array<Job>): void {
    if (!this._jobsList) return
    this._jobsList.innerHTML = ''

    if (!jobs.length) {
      this._isEmpty = true
      const placeholder = document.createElement('empty-data-placeholder')
      if (this._config) {
        placeholder.create(this._config.empty)
        if (this._config.empty.actionsNode) {
          placeholder.appendChild(this._config.empty.actionsNode)
        }
      }
      this._jobsList.appendChild(placeholder)
      return
    }

    this._isEmpty = false
    if (!this._config) return

    jobs.forEach((job, index) => {
      const el = this._config?.jobItemFactory({
        job,
        index,
        total: jobs.length,
        eventsAborter: this._eventsAborter
      })
      if (el) this._jobsList?.appendChild(el)
    })
  }

  private _renderFooter(): void {
    if (!this._footer) return
    this._footer.innerHTML = ''
    if (this._isEmpty) return
    const loaderEl = createInfiniteLoaderElement({
      nextPage: this._page,
      isFetchingNextPage: this._isLoadingNext,
      fetchPage: (page) => this._load(page)
    })
    this._footer.appendChild(loaderEl)
  }
}

if (!customElements.get(JOBS_PAGE_TAG_NAME)) {
  customElements.define(JOBS_PAGE_TAG_NAME, JobsPage)
}

declare global {
  interface HTMLElementTagNameMap {
    [JOBS_PAGE_TAG_NAME]: JobsPage
  }
}
