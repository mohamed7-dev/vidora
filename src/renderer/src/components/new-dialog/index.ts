import './screens/media-info-screen/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIButton, UIInput } from '../ui'
import { UIDialog } from '../ui/dialog'
import { YtdlpInfo } from '@root/shared/downloads'
import type { MediaInfoScreen } from './screens/media-info-screen'
export class NewDialog extends HTMLElement {
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
  private btnNew: UIButton | null = null
  private validateBtn: UIButton | null = null
  private mediaUrlInput: UIInput | null = null
  private _dialogEl: UIDialog | null = null
  private mediaInfoScreen: MediaInfoScreen | null = null

  // private mediaLoadingScreen: HTMLElement | null = null
  private _mounted = false
  private _listeners: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._renderShell()
  }

  private _renderShell(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NewDialog.sheet]
    // Clone from cached template and extract only the trigger button
    const frag = NewDialog.tpl.content.cloneNode(true) as DocumentFragment
    const btn = frag.querySelector('#trigger-button') as UIButton | null
    if (btn) {
      this.shadowRoot.appendChild(btn)
      this.btnNew = btn
      this.btnNew.addEventListener('click', () => this.open(), { once: false })
    }
  }

  private async mountDialog(): Promise<void> {
    if (this._mounted) return
    if (!this.shadowRoot) return
    // Replace the trigger-only shell with the full dialog content
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NewDialog.sheet]
    const frag = NewDialog.tpl.content.cloneNode(true) as DocumentFragment
    this.shadowRoot.appendChild(frag)
    // cache header tab triggers
    this.validateBtn = this.shadowRoot?.querySelector('#validate-button') as UIButton | null
    this.mediaUrlInput = this.shadowRoot?.querySelector('#media-url-input') as UIInput | null
    this._dialogEl = this.shadowRoot?.querySelector('ui-dialog') as UIDialog | null
    this.mediaInfoScreen = this.shadowRoot?.querySelector(
      'media-info-screen'
    ) as MediaInfoScreen | null
    this._listeners = new AbortController()
    this.setupListeners(this._listeners.signal)
    this.initValidationButton()
    this._mounted = true
  }

  private unmountDialog(): void {
    if (!this._mounted) return
    this._listeners?.abort()
    this._listeners = null
    this._dialogEl?.remove()
    this._dialogEl = null
    this.validateBtn = null
    this.mediaUrlInput = null
    this.mediaInfoScreen = null
    this._mounted = false
    // Re-render the trigger-only shell after unmount
    this._renderShell()
  }

  private initValidationButton(): void {
    if (!this.validateBtn) return
    const setDisabled = (disabled: boolean): void => {
      this.validateBtn?.toggleAttribute('disabled', disabled)
    }
    const reflectValidity = (val: string): void => {
      const valid = this.isValidUrl(val)
      setDisabled(!valid)
      if (this.mediaUrlInput) {
        this.mediaUrlInput.toggleAttribute('invalid', !valid)
      }
    }
    const current = this.mediaUrlInput?.value?.trim() ?? ''
    reflectValidity(current)
    this.mediaUrlInput?.addEventListener('ui-input', (e: Event) => {
      const ev = e as CustomEvent<{ value: string }>
      reflectValidity(ev.detail?.value ?? '')
    })
    this.mediaUrlInput?.addEventListener('change', (e: Event) => {
      const ev = e as CustomEvent<{ value: string }>
      reflectValidity(ev.detail?.value ?? this.mediaUrlInput?.value ?? '')
    })
  }

  private isValidUrl(value: string): boolean {
    const v = (value || '').trim()
    if (!v) return false
    try {
      const u = new URL(v)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  private setupListeners(signal?: AbortSignal): void {
    document.addEventListener(
      'keydown',
      (event) => {
        if (event.ctrlKey && event.key === 'v') {
          this.pasteAndGetInfo()
        }
      },
      { signal }
    )
    this.validateBtn?.addEventListener(
      'click',
      () => {
        const text = this.mediaUrlInput?.value
        if (text) {
          this.getInfo(text)
        }
      },
      { signal }
    )
    this._dialogEl?.addEventListener('ui-request-close', (e) => {
      if (e.detail.source === 'close-button') {
        this.close()
      }
    })
    this.addEventListener('download:started', () => {
      this._dialogEl?.close?.()
    })
  }

  private async pasteAndGetInfo(): Promise<void> {
    const clipboardText = await window.api.clipboard?.readText()
    if (clipboardText) this.getInfo(clipboardText)
  }

  private async getInfo(text: string): Promise<void> {
    if (!this._dialogEl) return
    // set pending to true
    this._dialogEl.setAttribute('data-active-screen', 'media-loading')
    try {
      const info = await window.api.downloads.getInfo(text)
      this.mediaInfoScreen && (this.mediaInfoScreen.info = info as YtdlpInfo)
      this.mediaInfoScreen && (this.mediaInfoScreen.url = text)
      this._dialogEl.setAttribute('data-active-screen', 'media-info')
    } catch {
      this._dialogEl.setAttribute('data-active-screen', 'media-url')
    }
  }

  open(): void {
    void this.mountDialog().then(() => {
      this._dialogEl?.openDialog()
    })
  }

  close(): void {
    if (this._dialogEl) this._dialogEl.close()
    this.unmountDialog()
  }
}

customElements.define('new-dialog', NewDialog)

declare global {
  interface HTMLElementTagNameMap {
    'new-dialog': NewDialog
  }
}
