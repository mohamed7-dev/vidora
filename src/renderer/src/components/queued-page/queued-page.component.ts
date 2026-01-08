import html from './queued-page.template.html?raw'
import style from './queued-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { DownloadJobPayload } from '@root/shared/ipc/download-jobs'
import { JOB_ITEM_EVENTS, JobItem } from '../job-item/job-item.component'
import { JobsPage } from '../jobs-page/jobs-page.component'
import { ICONS_KEYS } from '../ui/icon/icons'

const QUEUED_PAGE_TAG_NAME = 'queued-page'

export class QueuedPage extends HTMLElement {
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
    this.shadowRoot.adoptedStyleSheets = [QueuedPage.sheet]
    this.shadowRoot.append(QueuedPage.tpl.content.cloneNode(true))
  }

  private _cacheRefs(): void {
    if (!this.shadowRoot) return
    this._jobsPage = this.shadowRoot?.querySelector<JobsPage>('jobs-page')
  }

  private async _configurePage(): Promise<void> {
    if (!this._jobsPage) return
    const { isEmpty } = await this._jobsPage.create({
      status: 'queued',
      pageSize: 10,
      empty: {
        message: this._t`No Downloads Queued`,
        iconName: ICONS_KEYS.find((icon) => icon === 'hour-glass'),
        actionsNode: document.createElement('add-download-button')
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
          hideCopyUrlBtn: true,
          hideOpenBtn: true,
          progress: '0%'
        })
        if (eventsAborter) {
          jobItem.addEventListener(
            JOB_ITEM_EVENTS.DELETE,
            async () => {
              await window.api.downloadJobs.remove(job.id)
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
if (!customElements.get(QUEUED_PAGE_TAG_NAME)) {
  customElements.define(QUEUED_PAGE_TAG_NAME, QueuedPage)
}
declare global {
  interface HTMLElementTagNameMap {
    [QUEUED_PAGE_TAG_NAME]: QueuedPage
  }
}
