import html from './history-page.template.html?raw'
import style from './history-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { DownloadJobPayload } from '@root/shared/ipc/download-jobs'
import { JOB_ITEM_EVENTS, JobItem } from '../job-item/job-item.component'
import { JobsPage } from '../jobs-page/jobs-page.component'
import { ICONS_KEYS } from '../ui/icon/icons'
import { UiInput } from '../ui/input/ui-input'
import { UiSelect } from '../ui/select/ui-select'
import { UiSelectContent } from '../ui/select/ui-select-content'
import type { HistoryMediaType } from '@root/shared/ipc/download-history'
import { AreaSection } from '../area-section'
import { UiButton } from '../ui/button/ui-button'

const HISTORY_PAGE_TAG_NAME = 'history-page'

export class HistoryPage extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  private _t = window.api.i18n.t

  //Refs
  private _jobsPage: JobsPage | null = null
  private _searchInput: UiInput | null = null
  private _filterSelect: UiSelect | null = null
  private _filterSelectContent: UiSelectContent | null = null
  private _statsContainer: AreaSection | null = null
  private _clearButton: UiButton | null = null

  private _searchQuery = ''
  private _searchDebounceHandle: number | null = null
  private _mediaType: HistoryMediaType = 'any'

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    this._initFilterOptions()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    void this._loadStats()
    this._configurePage()
    this._applyListeners()
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [HistoryPage.sheet]
    this.shadowRoot.append(HistoryPage.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsPage = this.shadowRoot?.querySelector<JobsPage>('jobs-page')
    this._searchInput = this.shadowRoot?.querySelector<UiInput>('[data-el="search-input"]')
    this._filterSelect = this.shadowRoot?.querySelector<UiSelect>('[data-el="filter-select"]')
    this._filterSelectContent = this.shadowRoot?.querySelector<UiSelectContent>(
      '[data-el="filter-select-content"]'
    )
    this._filterSelectContent = this.shadowRoot?.querySelector<UiSelectContent>(
      '[data-el="filter-select-content"]'
    )
    this._statsContainer = this.shadowRoot?.querySelector<AreaSection>(
      '[data-el="stats-container"]'
    )
    this._clearButton = this.shadowRoot?.querySelector<UiButton>('[data-el="clear-btn"]')
  }

  private _applyListeners(): void {
    this._searchInput?.addEventListener('input', () => this._handleSearchInputChange())

    if (this._filterSelect) {
      this._filterSelect.onValueChange((value) => {
        // Fallback to 'any' when null/empty
        this._mediaType = (value as HistoryMediaType) || 'any'
        void this._configurePage()
      })
    }

    if (this._clearButton) {
      this._clearButton.addEventListener('click', () => this._handleClearing)
    }
  }

  private async _handleClearing(): Promise<void> {
    await window.api.history.clear()
  }

  private _handleSearchInputChange(): void {
    if (!this._searchInput) return

    const value = this._searchInput.value ?? ''

    if (this._searchDebounceHandle !== null) {
      window.clearTimeout(this._searchDebounceHandle)
    }

    this._searchDebounceHandle = window.setTimeout(() => {
      this._searchQuery = value
      void this._configurePage()
    }, 300)
  }

  private _initFilterOptions(): void {
    if (!this._filterSelectContent || !this._filterSelect) return

    this._filterSelectContent.innerHTML = ''

    const makeOption = (value: HistoryMediaType, label: string): HTMLElement => {
      const optEl = document.createElement('ui-select-option')
      optEl.setAttribute('value', value)
      optEl.textContent = label
      return optEl
    }

    this._filterSelectContent.append(
      makeOption('any', this._t`All`),
      makeOption('video', this._t`Video`),
      makeOption('audio', this._t`Audio`)
    )

    // Default selection
    this._mediaType = 'any'
    this._filterSelect.value = 'any'
  }

  private async _loadStats(): Promise<void> {
    if (!this._statsContainer) return

    const stats = await window.api.history.stats()

    // Clear previous stats content
    this._statsContainer.innerHTML = ''

    type StatKey =
      | 'totalCount'
      | 'completedCount'
      | 'failedCount'
      | 'canceledCount'
      | 'deletedCount'
      | 'activeCount'
      | 'totalSizeBytes'
      | 'completedSizeBytes'

    const entries: Array<{ key: StatKey; label: string; format?: 'bytes' }> = [
      { key: 'totalCount', label: this._t`Total downloads` },
      { key: 'completedCount', label: this._t`Completed` },
      { key: 'failedCount', label: this._t`Failed` },
      { key: 'totalSizeBytes', label: this._t`Total size`, format: 'bytes' }
    ]
    const formatBytes = (value: number): string => {
      if (!Number.isFinite(value) || value <= 0) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let v = value
      let i = 0
      while (v >= 1024 && i < units.length - 1) {
        v /= 1024
        i++
      }
      return `${v.toFixed(1)} ${units[i]}`
    }

    for (const entry of entries) {
      const rawValue = stats[entry.key]
      const displayValue =
        entry.format === 'bytes' ? formatBytes(Number(rawValue ?? 0)) : String(rawValue ?? 0)

      const article = document.createElement('area-article')
      article.setAttribute('label', entry.label)
      article.slot = 'articles'

      const valueEl = document.createElement('p')
      valueEl.slot = 'content'
      valueEl.textContent = displayValue

      article.appendChild(valueEl)
      this._statsContainer.appendChild(article)
    }
  }

  private async _configurePage(): Promise<void> {
    if (!this._jobsPage) return
    const { isEmpty } = await this._jobsPage.create({
      status: ['completed', 'failed', 'canceled', 'deleted'],
      pageSize: 10,
      empty: {
        message: this._t`No downloads in history yet`,
        iconName: ICONS_KEYS.find((icon) => icon === 'history'),
        actionsNode: document.createElement('add-download-button')
      },
      loader: async ({ status, page, pageSize }) => {
        // Map JobStatus | JobStatus[] into history query
        const statuses = Array.isArray(status) ? status : [status]
        return window.api.history.list({
          status: statuses,
          page,
          pageSize,
          sortBy: 'updatedAt',
          sortDir: 'desc',
          mediaType: this._mediaType,
          search: this._searchQuery.trim() || undefined
        })
      },
      jobItemFactory: ({ job, index, total, eventsAborter }) => {
        const payload = job.payload as DownloadJobPayload
        const title = payload?.title || payload?.url || this._t`Untitled`
        const subtitle = `${job.statusText}`
        const article = document.createElement('area-article')
        if (index === 0) article.setAttribute('first', '')
        if (index === total - 1) article.setAttribute('last', '')
        const jobItem = document.createElement('job-item') as JobItem
        jobItem.slot = 'content'
        jobItem.create({
          label: title,
          subtitle,
          thumbnail: payload.thumbnail,
          hidePauseBtn: true,
          hideResumeBtn: true,
          hideProgress: true
        })
        if (eventsAborter) {
          jobItem.addEventListener(
            JOB_ITEM_EVENTS.DELETE,
            async () => {
              await window.api.history.delete(job.id)
              // Optionally: reload list or rely on JobsPage reload logic if you add a bus
            },
            { signal: eventsAborter.signal }
          )
        }
        article.appendChild(jobItem)
        return article
      }
    })
    if (isEmpty) {
      this.setAttribute('data-empty', '')
      // Disable search when there are no history items
      if (this._searchInput && !this._searchQuery) {
        this._searchInput.disabled = true
      }
    } else {
      this.removeAttribute('data-empty')
      // Enable search when there are history items
      if (this._searchInput) {
        this._searchInput.disabled = false
      }
    }
  }
}
if (!customElements.get(HISTORY_PAGE_TAG_NAME)) {
  customElements.define(HISTORY_PAGE_TAG_NAME, HistoryPage)
}

declare global {
  interface HTMLElementTagNameMap {
    [HISTORY_PAGE_TAG_NAME]: HistoryPage
  }
}
