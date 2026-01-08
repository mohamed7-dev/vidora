import html from './jobs-page.template.html?raw'
import style from './jobs-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { Job, JobStatus } from '@root/shared/ipc/download-jobs'
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

export type JobsPageConfig = {
  status: JobsPageStatusFilter
  pageSize?: number
  empty: EmptyPlaceholderConfig & { actionsNode?: Node }
  jobItemFactory: JobItemFactory
  loader?: JobsPageLoader
}

const JOBS_PAGE_TAG_NAME = 'jobs-page'

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
    this._cacheRefs()
    localizeElementsText(this.shadowRoot as ShadowRoot)
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

    if (page && this._jobs.length) {
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
    this._unsub = window.api.downloadJobs.onUpdated(() => {
      this._page = null
      this._jobs = []
      this._load(1)
    })
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
