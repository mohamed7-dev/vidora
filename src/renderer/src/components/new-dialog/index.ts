import './screens/media-info-screen/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { UIButton, UIInput, UIAlert, UICheckbox } from '../ui'
import { UIDialog } from '../ui/dialog'
import { DOWNLOAD_STARTED_EVENT_NAME, type MediaInfoScreen } from './screens/media-info-screen'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '../ui/lib/template-loader'
import { localizeElementsText } from '@renderer/lib/utils'
import { MediaInfoChannelPayload, YtdlpInfo } from '@root/shared/ipc/get-media-info'

const NEW_DIALOG_NAME = 'new-dialog'
const ATTRIBUTES = {
  HIDE_TRIGGER_BTN: 'hide-trigger'
}

export class NewDialog extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  // refs
  private _dialogEl: UIDialog | null = null
  private _mediaInfoScreen: MediaInfoScreen | null = null
  private _alert: UIAlert | null = null
  private _mediaUrlValidateBtn: UIButton | null = null
  private _mediaUrlInput: UIInput | null = null
  private _loaderText: HTMLParagraphElement | null = null
  private _playlistModeCheckbox: UICheckbox | null = null
  // states
  private _listeners: AbortController | null = null
  private _onGettingInfoUnsub: (() => void) | null = null
  private pasteLinkUnsub: (() => void) | null = null
  private _downloadMode: 'single' | 'playlist' = 'single'
  private _mediaUrl: string | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._listeners?.abort()
    this._listeners = null
    this._onGettingInfoUnsub?.()
    this._onGettingInfoUnsub = null
    this.pasteLinkUnsub?.()
    this.pasteLinkUnsub = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NewDialog.sheet]
    this.shadowRoot.append(NewDialog.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._dialogEl = this.shadowRoot.querySelector('ui-dialog') as UIDialog | null
    this._mediaInfoScreen = this.shadowRoot.querySelector(
      'media-info-screen'
    ) as MediaInfoScreen | null
    this._mediaUrlValidateBtn = this.shadowRoot.querySelector(
      '[data-el="validate-button"]'
    ) as UIButton | null
    this._mediaUrlInput = this.shadowRoot.querySelector(
      '[data-el="media-url-input"]'
    ) as UIInput | null
    this._alert = this.shadowRoot.querySelector('ui-alert') as UIAlert | null
    this._loaderText = this.shadowRoot.querySelector(
      "[data-el='loader-text']"
    ) as HTMLParagraphElement | null
    this._playlistModeCheckbox = this.shadowRoot?.querySelector(
      "[data-el='playlist-mode-checkbox']"
    ) as UICheckbox | null
  }

  private _init(): void {
    this._validateUrl()
  }

  private _setupListeners(): void {
    this._listeners?.abort()
    this._listeners = new AbortController()
    const signal = this._listeners.signal
    // this._mediaUrlInput?.addEventListener(
    //   'input',
    //   (e: Event) => {
    //     const ev = e as CustomEvent<{ value: string }>
    //     this._validateUrl(ev.detail?.value)
    //   },
    //   { signal }
    // )
    // this._mediaUrlInput?.addEventListener(
    //   'change',
    //   (e: Event) => {
    //     const ev = e as CustomEvent<{ value: string }>
    //     this._validateUrl(ev.detail?.value)
    //   },
    //   { signal }
    // )
    document.addEventListener(
      'keydown',
      async (event) => {
        await this._handleKeydown(event)
      },
      { signal }
    )

    this._mediaUrlValidateBtn?.addEventListener(
      'click',
      async () => {
        await this._handleValidateBtnClick()
      },
      { signal }
    )

    // this._dialogEl?.addEventListener('ui-request-close', (e) => {
    //   if (e.detail.source === 'close-button') {
    //     this.close()
    //   }
    // })

    this.addEventListener(DOWNLOAD_STARTED_EVENT_NAME, () => {
      this._dialogEl?.closeDialog()
    })

    // Paste Link
    this._mediaUrlInput?.addEventListener(
      'contextmenu',
      (e) => {
        this._handleContextMenu(e)
      },
      { signal }
    )

    this.pasteLinkUnsub = window.api.pasteLink.onPaste((text) => {
      this._handleOnLinkPasted(text)
    })

    this._onGettingInfoUnsub = window.api?.downloads?.onGettingInfo((payload) => {
      this._handleStatusIpc(payload)
    })

    this._playlistModeCheckbox?.addEventListener(
      'change',
      () => {
        this._handleModeChange()
      },
      { signal }
    )
  }

  private async _handleModeChange(): Promise<void> {
    this._downloadMode = this._playlistModeCheckbox?.checked ? 'playlist' : 'single'
  }

  private _handleContextMenu(e: Event): void {
    e.preventDefault()
    window.api?.pasteLink?.showMenu()
  }

  private async _handleValidateBtnClick(): Promise<void> {
    const isValid = this._validateUrl(this._mediaUrl ?? '')
    if (isValid) {
      if (this._downloadMode === 'single') {
        await this._getInfo(this._mediaUrl as string)
      } else {
        // go to media-info-screen directly
        this._dialogEl?.setAttribute('data-active-screen', 'media-info')
      }
    }
  }

  private async _handleKeydown(e: KeyboardEvent): Promise<void> {
    if (e.ctrlKey && e.key === 'v') {
      this._mediaUrl = (await window.api.clipboard?.readText()) ?? ''
      if (!this._mediaUrlInput) return
      this._mediaUrlInput.value = this._mediaUrl
    }
  }

  private _handleStatusIpc(payload: MediaInfoChannelPayload): void {
    this._alert?.hide()
    switch (payload.status) {
      case 'begin':
        this._dialogEl?.setAttribute('data-active-screen', 'media-loading')
        if (this._loaderText) {
          this._loaderText.textContent = payload.message
        }
        break
      case 'progress':
        this._dialogEl?.setAttribute('data-active-screen', 'media-loading')
        if (this._loaderText) {
          this._loaderText.textContent = payload.message
        }
        break
      case 'complete':
        this._dialogEl?.setAttribute('data-active-screen', 'media-info')
        if (this._alert) {
          this._alert.variant = 'default'
          this._alert.alertTitle = 'Success'
          this._alert.alertDescription = payload.message
        }
        this._alert?.show()
        setTimeout(() => {
          this._alert?.hide()
        }, 2000)
        break
      case 'error':
        this._dialogEl?.setAttribute('data-active-screen', 'media-url')
        if (this._alert) {
          this._alert.variant = 'destructive'
          this._alert.alertTitle = 'Error'
          this._alert.alertDescription = payload.message
        }
        this._alert?.show()
        break
    }
  }

  private _handleOnLinkPasted(text: string): void {
    if (!this._mediaUrlInput) return
    this._mediaUrlInput.value = text
    this._mediaUrl = text
  }

  private _validateUrl(value?: string): boolean {
    if (!this._mediaUrlValidateBtn || !this._mediaUrlInput) return false
    const isValid = this._isValidUrl(value || this._mediaUrlInput.value)
    this._mediaUrlInput.invalid = !isValid
    // this._mediaUrlValidateBtn.disabled = !isValid
    return isValid
  }

  private _isValidUrl(value: string): boolean {
    const v = (value || '').trim()
    if (!v) return false
    try {
      const u = new URL(v)
      return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
      return false
    }
  }

  private async _getInfo(text: string): Promise<void> {
    const info = await window.api.downloads.getInfo(text)
    this._mediaInfoScreen && (this._mediaInfoScreen.info = info as YtdlpInfo)
    this._mediaInfoScreen && (this._mediaInfoScreen.url = text)
  }

  get hideTriggerBtn(): boolean {
    return this.hasAttribute(ATTRIBUTES.HIDE_TRIGGER_BTN)
  }

  set hideTriggerBtn(value: boolean) {
    if (value) {
      this.setAttribute(ATTRIBUTES.HIDE_TRIGGER_BTN, '')
    } else {
      this.removeAttribute(ATTRIBUTES.HIDE_TRIGGER_BTN)
    }
  }

  open(): void {
    this._dialogEl?.openDialog()
  }

  close(): void {
    this._dialogEl?.closeDialog()
  }
}
if (!customElements.get(NEW_DIALOG_NAME)) {
  customElements.define(NEW_DIALOG_NAME, NewDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    [NEW_DIALOG_NAME]: NewDialog
  }
}
