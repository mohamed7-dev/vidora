import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIButton } from '../ui'

export class JobItem extends HTMLElement {
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

  // refs
  private _pauseBtn: UIButton | null = null
  private _resumeBtn: UIButton | null = null
  private _deleteBtn: UIButton | null = null
  private _title: HTMLParagraphElement | null = null
  private _subtitle: HTMLParagraphElement | null = null
  private _thumbnail: HTMLImageElement | null = null

  // states
  private t = window.api?.i18n?.t || (() => '')

  static get observedAttributes(): string[] {
    return [
      'hide-controls',
      'hide-progress',
      'hide-pause-btn',
      'hide-resume-btn',
      'hide-delete-btn',
      'state',
      'progress',
      'title',
      'subtitle',
      'thumbnail'
    ]
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'hide-controls') {
      this.toggleAttribute('data-hide-controls', _newValue !== null)
    }
    if (name === 'hide-progress') {
      this.toggleAttribute('data-hide-progress', _newValue !== null)
    }
    if (name === 'hide-pause-btn') {
      this.toggleAttribute('data-hide-pause-btn', _newValue !== null)
    }
    if (name === 'hide-resume-btn') {
      this.toggleAttribute('data-hide-resume-btn', _newValue !== null)
    }
    if (name === 'hide-delete-btn') {
      this.toggleAttribute('data-hide-delete-btn', _newValue !== null)
    }
    if (name === 'state') {
      this._applyState()
    }
    if (name === 'progress') {
      this._applyProgress()
    }
    if (name === 'title') {
      this._applyTitle()
    }
    if (name === 'subtitle') {
      this._applySubtitle()
    }
    if (name === 'thumbnail') {
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
    this._applyI18n()
    this._applyState()
    this._applyTitle()
    this._applySubtitle()
    this._applyProgress()
    this._applyThumbnail()
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._thumbnail = this.shadowRoot?.querySelector('[data-el="thumbnail"]') as HTMLImageElement
    this._title = this.shadowRoot?.querySelector('[data-el="title"]') as HTMLParagraphElement
    this._subtitle = this.shadowRoot?.querySelector('[data-el="subtitle"]') as HTMLParagraphElement
    this._pauseBtn = this.shadowRoot?.querySelector('[data-el="pauseBtn"]') as UIButton
    this._resumeBtn = this.shadowRoot?.querySelector('[data-el="resumeBtn"]') as UIButton
    this._deleteBtn = this.shadowRoot?.querySelector('[data-el="deleteBtn"]') as UIButton
  }

  private _applyListeners(): void {
    if (!this._pauseBtn || !this._resumeBtn || !this._deleteBtn) return
    this._pauseBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('pause'))
    })
    this._resumeBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('resume'))
    })
    this._deleteBtn.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('delete'))
    })
  }

  private _applyI18n(): void {
    const i18n = this.shadowRoot?.querySelectorAll('[data-i18n]')
    if (!i18n) return
    i18n.forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') || '')
    })
  }

  private _applyState(): void {
    const state = (this.getAttribute('state') || '').toLowerCase()
    // Defaults: show all
    let hideControls = false
    let hideProgress = false

    switch (state) {
      case 'downloading':
        hideControls = false
        hideProgress = false
        break
      case 'queued':
        hideControls = false
        hideProgress = true
        break
      case 'completed':
        hideControls = false
        hideProgress = true
        break
      default:
        // Leave defaults (both visible)
        break
    }

    this.toggleAttribute('data-hide-controls', hideControls)
    this.toggleAttribute('data-hide-progress', hideProgress)

    // toggle controls visibility
    if (this._pauseBtn) this._pauseBtn.style.display = state === 'downloading' ? '' : 'none'
    if (this._resumeBtn) this._resumeBtn.style.display = state === 'paused' ? '' : 'none'
  }

  private _applyTitle(): void {
    const title = this.getAttribute('title')
    if (!title) return
    if (this._title) this._title.textContent = title
  }

  private _applySubtitle(): void {
    const subtitle = this.getAttribute('subtitle')
    if (!subtitle) return
    if (this._subtitle) this._subtitle.textContent = subtitle
  }

  private _applyThumbnail(): void {
    const thumbnail = this.getAttribute('thumbnail')
    if (!thumbnail) return
    if (this._thumbnail) {
      this._thumbnail.src = thumbnail
      this._thumbnail.alt = this.getAttribute('title') || ''
    }
  }

  private _applyProgress(): void {
    const progress = this.getAttribute('progress')
    if (!progress) return
    const bar = this.shadowRoot?.querySelector('[data-el="bar"]') as HTMLDivElement
    if (!bar) return
    bar.style.width = progress
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [JobItem.sheet]
    const frag = JobItem.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.appendChild(frag)
  }
}

if (!customElements.get('job-item')) {
  customElements.define('job-item', JobItem)
}

declare global {
  interface HTMLElementTagNameMap {
    'job-item': JobItem
  }

  interface HTMLElementEventMap {
    pause: CustomEvent<void>
    resume: CustomEvent<void>
    delete: CustomEvent<void>
  }
}
