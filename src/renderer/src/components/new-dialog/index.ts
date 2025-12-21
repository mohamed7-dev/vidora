import './screens/media-info-screen/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIButton, UIInput, UIAlert } from '../ui'
import { UIDialog } from '../ui/dialog'
import { YtdlpInfo } from '@root/shared/downloads'
import type { MediaInfoScreen } from './screens/media-info-screen'
import type { StatusSnapshot, TaskStatus } from '@root/shared/status'
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
  private mediaInfoErrorAlert: UIAlert | null = null

  // states
  // private mediaLoadingScreen: HTMLElement | null = null
  private _mounted = false
  private _listeners: AbortController | null = null
  private t = window.api.i18n?.t ?? (() => '')
  private statusUnsub: (() => void) | null = null
  private pasteLinkUnsub: (() => void) | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  private setupStatusListener(): void {
    this.statusUnsub?.()
    this.statusUnsub = window.api.status.onUpdate((snap: StatusSnapshot) => {
      const st = snap.ytdlp as TaskStatus | undefined
      if (!st || st.kind !== 'ytdlp') return

      const scope = (st.messageParams as Record<string, unknown> | undefined)?.scope
      if (scope !== 'getMediaInfo') return

      // lazily cache alert if not yet available
      if (!this.mediaInfoErrorAlert) {
        this.mediaInfoErrorAlert = this.shadowRoot?.querySelector('ui-alert') as UIAlert | null
      }
      const alert = this.mediaInfoErrorAlert
      if (!alert) return

      if (st.state === 'error') {
        const titleEl = alert.querySelector('[slot="title"]') as HTMLElement | null
        const descEl = alert.querySelector('[slot="description"]') as HTMLElement | null
        const key = st.error?.key || st.messageKey || 'status.ytdlp.info_failed'
        const fallback = st.error?.message || st.message || 'Failed to fetch media info.'

        if (titleEl) {
          titleEl.textContent = this.t('newDialog.mediaInfo.error.title') || 'Error'
        }
        if (descEl) {
          descEl.textContent = (key && this.t(key)) || fallback
        }

        alert.setAttribute('variant', 'destructive')
        alert.show()
        // ensure we are on the media-url screen so the user can adjust the URL
        this._dialogEl?.setAttribute('data-active-screen', 'media-url')
      } else if (st.state === 'pending' || st.state === 'success') {
        // clear any previous error when a new request starts or finishes successfully
        alert.hide()
      }
    })
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
    this.mediaInfoErrorAlert = this.shadowRoot?.querySelector('ui-alert') as UIAlert | null
    this._listeners = new AbortController()
    this._applyI18n()
    this.setupListeners(this._listeners.signal)
    this.setupStatusListener()
    this.setupPasteLink()
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
    this.mediaInfoErrorAlert = null
    this.statusUnsub?.()
    this.statusUnsub = null
    this.pasteLinkUnsub?.()
    this.pasteLinkUnsub = null
    this._mounted = false
    // Re-render the trigger-only shell after unmount
    this._renderShell()
  }

  private _applyI18n(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n')
      if (key) {
        el.textContent = this.t(key)
      }
    })
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
      this._dialogEl?.closeDialog?.()
    })
  }

  private setupPasteLink(): void {
    if (!this.mediaUrlInput) return

    this.mediaUrlInput.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      window.api?.pasteLink?.showMenu?.()
    })

    this.pasteLinkUnsub =
      window.api?.pasteLink?.onPaste?.((text: string) => {
        if (!this.mediaUrlInput) return
        this.mediaUrlInput.value = text
        void this.getInfo(text)
      }) ?? null
  }

  private async pasteAndGetInfo(): Promise<void> {
    const clipboardText = await window.api.clipboard?.readText()
    if (clipboardText) this.getInfo(clipboardText)
  }

  private async getInfo(text: string): Promise<void> {
    if (!this._dialogEl) return
    // set pending to true
    this.mediaInfoErrorAlert?.hide()
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
    if (this._dialogEl) this._dialogEl.closeDialog()
    this.unmountDialog()
  }
}

customElements.define('new-dialog', NewDialog)

declare global {
  interface HTMLElementTagNameMap {
    'new-dialog': NewDialog
  }
}
