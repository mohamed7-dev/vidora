import html from './job-item.template.html?raw'
import style from './job-item.style.css?inline'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { UiButton } from '../ui/button/ui-button'
import { localizeElementsText } from '@renderer/lib/ui/localize'

const JOB_ITEM_TAG_NAME = 'job-item'
export interface JobItemConfig {
  label?: string
  subtitle?: string
  thumbnail?: string
  progress?: string
  hideControls?: boolean
  showProgress?: boolean
  showPauseBtn?: boolean
  showResumeBtn?: boolean
  showDeleteBtn?: boolean
  showOpenBtn?: boolean
  showCopyUrlBtn?: boolean
}

const ATTRIBUTES = {
  HIDE_CONTROLS: 'hide-controls',
  SHOW_PROGRESS: 'show-progress',
  SHOW_PAUSE_BTN: 'show-pause-btn',
  SHOW_RESUME_BTN: 'show-resume-btn',
  SHOW_DELETE_BTN: 'show-delete-btn',
  SHOW_OPEN_BTN: 'show-open-btn',
  SHOW_COPY_URL_BTN: 'show-copyurl-btn',
  PROGRESS: 'progress',
  LABEL: 'label',
  SUBTITLE: 'subtitle',
  THUMBNAIL: 'thumbnail'
}

export const JOB_ITEM_EVENTS = {
  PAUSE: 'job-item:pause',
  RESUME: 'job-item:resume',
  DELETE: 'job-item:delete',
  OPEN: 'job-item:open',
  COPY_URL: 'job-item:copy-url'
}

export class JobItem extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)

  // refs
  private _pauseBtn: UiButton | null = null
  private _resumeBtn: UiButton | null = null
  private _deleteBtn: UiButton | null = null
  private _openBtn: UiButton | null = null
  private _copyUrlBtn: UiButton | null = null
  private _labels: HTMLParagraphElement[] | null = null
  private _subtitle: HTMLParagraphElement | null = null
  private _thumbnail: HTMLImageElement | null = null
  private _progressBar: HTMLDivElement | null = null

  // states
  private _eventsAborter: AbortController | null = null

  static get observedAttributes(): string[] {
    return Object.values(ATTRIBUTES)
  }

  attributeChangedCallback(name: string): void {
    if (name === ATTRIBUTES.PROGRESS) {
      this._applyProgress()
    }
    if (name === ATTRIBUTES.LABEL) {
      this._applyLabel()
    }
    if (name === ATTRIBUTES.SUBTITLE) {
      this._applySubtitle()
    }
    if (name === ATTRIBUTES.THUMBNAIL) {
      this._applyThumbnail()
    }
  }

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._applyListeners()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._init()
  }

  disconnectedCallback(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [JobItem.sheet]
    this.shadowRoot.appendChild(JobItem.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._thumbnail = this.shadowRoot?.querySelector('[data-el="thumbnail"]') as HTMLImageElement
    const labels = this.shadowRoot?.querySelectorAll<HTMLParagraphElement>('[data-el="label"]')
    if (labels) {
      this._labels = Array.from(labels)
    }

    this._subtitle = this.shadowRoot?.querySelector('[data-el="subtitle"]') as HTMLParagraphElement
    this._pauseBtn = this.shadowRoot?.querySelector('[data-el="pause-btn"]') as UiButton
    this._resumeBtn = this.shadowRoot?.querySelector('[data-el="resume-btn"]') as UiButton
    this._deleteBtn = this.shadowRoot?.querySelector('[data-el="delete-btn"]') as UiButton
    this._openBtn = this.shadowRoot?.querySelector('[data-el="open-btn"]') as UiButton
    this._copyUrlBtn = this.shadowRoot?.querySelector('[data-el="copy-url-btn"]') as UiButton
    this._progressBar = this.shadowRoot?.querySelector('[data-el="bar"]') as HTMLDivElement
  }

  private _applyListeners(): void {
    this._eventsAborter?.abort()
    this._eventsAborter = new AbortController()
    const signal = this._eventsAborter.signal
    if (!this._pauseBtn || !this._resumeBtn || !this._deleteBtn) return
    this._pauseBtn.addEventListener(
      'click',
      () => {
        this.dispatchEvent(
          new CustomEvent(JOB_ITEM_EVENTS.PAUSE, { composed: true, bubbles: true })
        )
      },
      { signal }
    )
    this._resumeBtn.addEventListener(
      'click',
      () => {
        this.dispatchEvent(
          new CustomEvent(JOB_ITEM_EVENTS.RESUME, { composed: true, bubbles: true })
        )
      },
      { signal }
    )
    this._deleteBtn.addEventListener(
      'click',
      () => {
        this.dispatchEvent(
          new CustomEvent(JOB_ITEM_EVENTS.DELETE, { composed: true, bubbles: true })
        )
      },
      { signal }
    )
    this._openBtn?.addEventListener(
      'click',
      () => {
        this.dispatchEvent(new CustomEvent(JOB_ITEM_EVENTS.OPEN, { composed: true, bubbles: true }))
      },
      { signal }
    )
    this._copyUrlBtn?.addEventListener(
      'click',
      () => {
        this.dispatchEvent(
          new CustomEvent(JOB_ITEM_EVENTS.COPY_URL, { composed: true, bubbles: true })
        )
      },
      { signal }
    )
  }

  private _init(): void {
    this._applyLabel()
    this._applySubtitle()
    this._applyProgress()
    this._applyThumbnail()
  }

  public create(config: JobItemConfig): JobItem {
    this._applyConfig(config)
    return this
  }

  private _applyConfig(config: JobItemConfig): void {
    if (config.label) {
      this.label = config.label
    }
    if (config.subtitle) {
      this.subtitle = config.subtitle
    }

    if (config.thumbnail) {
      this.thumbnail = config.thumbnail
    }

    if (config.progress) {
      this.progress = config.progress
    }

    if (config.showDeleteBtn !== undefined) {
      this.showDeleteButton = config.showDeleteBtn
    }

    if (config.showPauseBtn !== undefined) {
      this.showPauseButton = config.showPauseBtn
    }

    if (config.showResumeBtn !== undefined) {
      this.showResumeButton = config.showResumeBtn
    }
    if (config.showOpenBtn !== undefined) {
      this.showOpenButton = config.showOpenBtn
    }

    if (config.showCopyUrlBtn !== undefined) {
      this.showCopyUrlButton = config.showCopyUrlBtn
    }

    if (config.hideControls !== undefined) {
      this.toggleAttribute(ATTRIBUTES.HIDE_CONTROLS, config.hideControls)
    }

    if (config.showProgress !== undefined) {
      this.showProgress = config.showProgress
    }
  }

  private _applyLabel(): void {
    if (this._labels) {
      this._labels.forEach((labelEl) => {
        labelEl.textContent = this.label
      })
    }
  }

  private _applySubtitle(): void {
    if (this._subtitle) this._subtitle.textContent = this.subtitle
  }

  private _applyThumbnail(): void {
    if (this._thumbnail) {
      this._thumbnail.src = this.thumbnail
      this._thumbnail.alt = this.label
    }
  }

  private _applyProgress(): void {
    if (this._progressBar) this._progressBar.style.width = this.progress
  }

  //-----------------Public API-----------------
  get label(): string {
    return this.getAttribute(ATTRIBUTES.LABEL) || ''
  }

  set label(value: string) {
    this.setAttribute(ATTRIBUTES.LABEL, value)
  }

  get subtitle(): string {
    return this.getAttribute(ATTRIBUTES.SUBTITLE) || ''
  }

  set subtitle(value: string) {
    this.setAttribute(ATTRIBUTES.SUBTITLE, value)
  }

  get thumbnail(): string {
    return this.getAttribute(ATTRIBUTES.THUMBNAIL) || ''
  }

  set thumbnail(value: string) {
    this.setAttribute(ATTRIBUTES.THUMBNAIL, value)
    this.toggleAttribute('data-hide-thumb', value === '')
  }
  get progress(): string {
    return this.getAttribute(ATTRIBUTES.PROGRESS) || ''
  }

  set progress(value: string) {
    this.setAttribute(ATTRIBUTES.PROGRESS, value)
  }

  set showPauseButton(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_PAUSE_BTN, value)
  }

  set showResumeButton(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_RESUME_BTN, value)
  }

  set showDeleteButton(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_DELETE_BTN, value)
  }

  set showOpenButton(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_OPEN_BTN, value)
  }

  set showCopyUrlButton(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_COPY_URL_BTN, value)
  }

  set showProgress(value: boolean) {
    this.toggleAttribute(ATTRIBUTES.SHOW_PROGRESS, value)
  }
}

if (!customElements.get(JOB_ITEM_TAG_NAME)) {
  customElements.define(JOB_ITEM_TAG_NAME, JobItem)
}

declare global {
  interface HTMLElementTagNameMap {
    [JOB_ITEM_TAG_NAME]: JobItem
  }
}
