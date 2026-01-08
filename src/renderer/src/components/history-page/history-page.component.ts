import html from './history-page.template.html?raw'
import style from './history-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { DownloadJobPayload } from '@root/shared/ipc/download-jobs'
import { JOB_ITEM_EVENTS, JobItem } from '../job-item/job-item.component'
import { JobsPage } from '../jobs-page/jobs-page.component'
import { ICONS_KEYS } from '../ui/icon/icons'

const HISTORY_PAGE_TAG_NAME = 'history-page'

export class HistoryPage extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  private _t = window.api.i18n.t

  //Refs
  private _jobsPage: JobsPage | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._cacheRefs()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._configurePage()
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
          sortDir: 'desc'
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
    } else {
      this.removeAttribute('data-empty')
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
