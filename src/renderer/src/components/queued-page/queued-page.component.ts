import html from './queued-page.template.html?raw'
import style from './queued-page.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { DownloadJobPayload } from '@root/shared/ipc/download-jobs'
import { JOB_ITEM_EVENTS, JobItem } from '../job-item/job-item.component'
import {
  EmptyChangeEventDetail,
  JOBS_PAGE_EVENTS,
  JobsPage
} from '../jobs-page/jobs-page.component'
import { ICONS_KEYS } from '../ui/icon/icons'
import { toast } from '@renderer/lib/sonner'

const QUEUED_PAGE_TAG_NAME = 'queued-page'

export class QueuedPage extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  //Refs
  private _jobsPage: JobsPage | null = null

  private _eventsAborter: AbortController | null = new AbortController()

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._eventsAborter = new AbortController()
    this._render()
    this._cacheRefs()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._configurePage()
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
    this._jobsPage = null
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
        message: window.api.i18n.t`No Downloads Queued`,
        iconName: ICONS_KEYS.find((icon) => icon === 'hour-glass'),
        actionsNode: document.createElement('add-download-button')
      },
      jobItemFactory: ({ job, index, total, eventsAborter }) => {
        const payload = job.payload as DownloadJobPayload
        const title = payload?.title || payload?.url || window.api.i18n.t`Untitled`
        const pct = `${Math.max(0, Math.min(100, Math.round(job.progress ?? 0)))}%`
        const subtitle = `${window.api.i18n.t(job.status)} • ${pct}`
        const article = document.createElement('area-article')
        if (index === 0) article.setAttribute('first', '')
        if (index === total - 1) article.setAttribute('last', '')
        const progress = `${Math.max(0, Math.min(100, job.progress ?? 0))}%`

        const jobItem = document.createElement('job-item') as JobItem
        jobItem.slot = 'content'
        jobItem.create({
          label: title,
          subtitle,
          thumbnail: payload.thumbnail,
          showDeleteBtn: true,
          showResumeBtn: job.status === 'paused',
          showCopyUrlBtn: true,
          progress: progress,
          showProgress: true
        })
        if (eventsAborter) {
          jobItem.addEventListener(
            JOB_ITEM_EVENTS.DELETE,
            async () => {
              await window.api.downloadJobs.remove(job.id)
            },
            { signal: eventsAborter.signal }
          )

          jobItem.addEventListener(
            JOB_ITEM_EVENTS.COPY_URL,
            async () => {
              const res = await window.api.downloadJobs.copyUrl(job.id)
              if (!res.ok && res.error) {
                console.error('Failed to copy url:', res.error)
                toast.show({
                  variant: 'destructive',
                  title: window.api.i18n.t`Failed to copy url`,
                  description: res.error,
                  duration: 3000
                })
              } else {
                toast.show({
                  variant: 'default',
                  title: window.api.i18n.t`Copied to clipboard`,
                  description: window.api.i18n.t`The url has been copied to clipboard`,
                  duration: 3000
                })
              }
            },
            {
              signal: eventsAborter.signal
            }
          )
          jobItem.addEventListener(
            JOB_ITEM_EVENTS.RESUME,
            async () => {
              await window.api.downloadJobs.resume(job.id)
            },
            { signal: eventsAborter.signal }
          )
        }
        article.appendChild(jobItem)
        return article
      }
    })
    this._setEmpty(isEmpty)
  }

  private _setupListeners(): void {
    const signal = this._eventsAborter?.signal

    this._jobsPage?.addEventListener(
      JOBS_PAGE_EVENTS.EMPTY_CHANGED,
      (e) => {
        const detail = (e as CustomEvent<EmptyChangeEventDetail>).detail
        this._setEmpty(detail.isEmpty)
      },
      { signal }
    )
  }

  private _setEmpty(isEmpty: boolean): void {
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
