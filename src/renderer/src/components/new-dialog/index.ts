import './screens/media-info-screen/index'
import html from './template.html?raw'
import style from './style.css?inline'
import { MEDIA_INFO_EVENTS, type MediaInfoScreen } from './screens/media-info-screen'
import { MediaInfoChannelPayload, YtdlpInfo } from '@root/shared/ipc/get-media-info'
import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { UiDialog } from '../ui/dialog/ui-dialog'
import { UIAlert } from '../ui/alert/ui-alert'
import { UiButton } from '../ui/button/ui-button'
import { UICheckbox } from '../ui/checkbox/ui-checkbox'
import { UiInput, UIInputValueDetail } from '../ui/input/ui-input'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { OpenChangeEventDetail, UI_DIALOG_EVENTS } from '../ui/dialog/constants'
import { UIAlertTitle } from '../ui/alert/ui-alert-title'
import { UiAlertContent } from '../ui/alert/ui-alert-content'
import { pagesRoutes } from '@renderer/lib/routes'

const NEW_DIALOG_NAME = 'new-dialog'
const ATTRIBUTES = {
  DATA_ACTIVE_SCREEN: 'data-active-screen',
  MEDIA_URL: 'media-url'
}

export const NEW_DIALOG_EVENTS = {
  OPEN: 'new-dialog-open'
}

const SCREENS = {
  URL_INPUT: 'media-url',
  LOADING: 'media-loading',
  INFO: 'media-info'
} as const

export class NewDialog extends HTMLElement {
  private static readonly sheet: CSSStyleSheet = createStyleSheetFromStyle(style)
  private static readonly tpl: HTMLTemplateElement = createTemplateFromHtml(html)
  // refs
  private _dialogEl: UiDialog | null = null
  private _mediaInfoScreen: MediaInfoScreen | null = null
  private _alert: UIAlert | null = null
  private _alertTitle: UIAlertTitle | null = null
  private _alertContent: UiAlertContent | null = null
  private _mediaUrlValidateBtn: UiButton | null = null
  private _mediaUrlInput: UiInput | null = null
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

  static get observedAttributes(): string[] {
    return [ATTRIBUTES.MEDIA_URL]
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
    if (name === ATTRIBUTES.MEDIA_URL && oldValue !== newValue) {
      this._syncMediaUrl(newValue)
    }
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._setupListeners()
  }

  disconnectedCallback(): void {
    this._teardown()
  }
  private _teardown(): void {
    this._listeners?.abort()
    this._listeners = null
    this._onGettingInfoUnsub?.()
    this._onGettingInfoUnsub = null
    this.pasteLinkUnsub?.()
    this.pasteLinkUnsub = null
    // clear local members
    this._mediaUrl = null
    this._downloadMode = 'single'
    if (this._mediaUrlInput) {
      this._mediaUrlInput.value = ''
    }
    this._mediaUrlInput = null
    this._mediaUrlValidateBtn = null
    this._loaderText = null
    this._playlistModeCheckbox = null
    this._alert?.hide()
    this._alert = null
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [NewDialog.sheet]
    this.shadowRoot.append(NewDialog.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    if (!this.shadowRoot) return
    this._dialogEl = this.shadowRoot.querySelector('ui-dialog') as UiDialog | null
    this._mediaInfoScreen = this.shadowRoot.querySelector(
      '[data-el="media-info-screen"]'
    ) as MediaInfoScreen | null
    this._mediaUrlValidateBtn = this.shadowRoot.querySelector(
      '[data-el="validate-button"]'
    ) as UiButton | null
    this._mediaUrlInput = this.shadowRoot.querySelector(
      '[data-el="media-url-input"]'
    ) as UiInput | null
    this._alert = this.shadowRoot.querySelector('ui-alert') as UIAlert | null
    this._alertTitle = this.shadowRoot.querySelector('ui-alert-title') as UIAlertTitle | null
    this._alertContent = this.shadowRoot.querySelector('ui-alert-content') as UiAlertContent | null
    this._loaderText = this.shadowRoot.querySelector(
      "[data-el='loader-text']"
    ) as HTMLParagraphElement | null
    this._playlistModeCheckbox = this.shadowRoot?.querySelector(
      "[data-el='playlist-mode-checkbox']"
    ) as UICheckbox | null
  }

  private _syncMediaUrl(newValue: string): void {
    this._mediaUrl = newValue
    if (this._mediaUrlInput) {
      this._mediaUrlInput.value = newValue
    }
  }

  private _init(): void {
    this._validateUrl()
  }

  private _setupListeners(): void {
    this._listeners?.abort()
    this._listeners = new AbortController()
    const signal = this._listeners.signal
    this._mediaUrlInput?.addEventListener(
      'input',
      (event) => {
        this._handleInputChange(event as CustomEvent<UIInputValueDetail>)
      },
      { signal }
    )

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

    this.addEventListener(MEDIA_INFO_EVENTS.DOWNLOAD_STARTED, () => {
      if (!this._dialogEl) return
      this._dialogEl.open = false
      window.api.navigation.navigate(pagesRoutes.downloading)
    })

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

    // Listen globally so any part of the app can request opening this dialog.
    document.addEventListener(NEW_DIALOG_EVENTS.OPEN, () => this.openDialog(), { signal })

    this._dialogEl?.addEventListener(
      UI_DIALOG_EVENTS.OPEN_CHANGE,
      (e) => {
        const detail = (e as unknown as CustomEvent<OpenChangeEventDetail>).detail
        if (!detail.open) {
          // Tear down subscriptions and local state, then rebuild the tree so
          // each open starts from a fresh DOM.
          this._teardown()
          this._render()
          this._queryRefs()
          this._init()
          localizeElementsText(this.shadowRoot as ShadowRoot)
          this._setupListeners()
        }
      },
      { signal }
    )
  }

  private _handleInputChange(e: CustomEvent<UIInputValueDetail>): void {
    const value = e.detail.value
    const isValid = this._validateUrl(value)
    if (isValid) {
      this._mediaUrl = value
    }
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
        this._dialogEl?.setAttribute(ATTRIBUTES.DATA_ACTIVE_SCREEN, SCREENS.INFO)
      }
    }
  }

  private async _handleKeydown(e: KeyboardEvent): Promise<void> {
    const isInputFocused = this.shadowRoot?.activeElement === this._mediaUrlInput

    if (e.ctrlKey && e.key === 'v') {
      // Avoid duplicating the browser's native paste behavior.
      // Only handle Ctrl+V when the media URL input is not currently focused.
      if (!isInputFocused) {
        e.preventDefault()
        this._mediaUrl = (await window.api.clipboard?.readText()) ?? ''
        if (!this._mediaUrlInput) return
        this._mediaUrlInput.value = this._mediaUrl
        this._validateUrl(this._mediaUrl)
      }
    }
    if (e.ctrlKey && e.key === 'x') {
      // Let the browser handle cutting text when the input is focused to
      // avoid any duplicate clipboard behavior.
      if (!isInputFocused) {
        e.preventDefault()
        if (this._mediaUrlInput) {
          this._mediaUrlInput.value = ''
        }
        this._mediaUrl = ''
        this._validateUrl()
      }
    }
  }

  private _handleStatusIpc(payload: MediaInfoChannelPayload): void {
    this._alert?.hide()
    switch (payload.status) {
      case 'begin':
        this._dialogEl?.setAttribute(ATTRIBUTES.DATA_ACTIVE_SCREEN, SCREENS.LOADING)
        if (this._loaderText) {
          this._loaderText.textContent = payload.message
        }
        break
      case 'progress':
        this._dialogEl?.setAttribute(ATTRIBUTES.DATA_ACTIVE_SCREEN, SCREENS.LOADING)
        if (this._loaderText) {
          this._loaderText.textContent = payload.message
        }
        break
      case 'complete':
        this._dialogEl?.setAttribute(ATTRIBUTES.DATA_ACTIVE_SCREEN, SCREENS.INFO)
        if (this._alert && this._alertTitle && this._alertContent) {
          this._alert.variant = 'default'
          this._alertTitle.textContent = 'Success'
          this._alertContent.textContent = payload.message
        }
        this._alert?.show()
        setTimeout(() => {
          this._alert?.hide()
        }, 2000)
        break
      case 'error':
        this._dialogEl?.setAttribute(ATTRIBUTES.DATA_ACTIVE_SCREEN, SCREENS.URL_INPUT)
        if (this._alert && this._alertTitle && this._alertContent) {
          this._alert.variant = 'destructive'
          this._alertTitle.textContent = 'Error'
          this._alertContent.textContent = payload.message
        }
        this._alert?.show()
        break
    }
  }

  private _handleOnLinkPasted(text: string): void {
    if (!this._mediaUrlInput) return
    this._mediaUrlInput.value = text

    if (this._validateUrl(text)) {
      this._mediaUrl = text
    }
  }

  private _validateUrl(value?: string): boolean {
    if (!this._mediaUrlValidateBtn || !this._mediaUrlInput) return false
    const isValid = this._isValidUrl(value || this._mediaUrlInput.value)
    if (!isValid) {
      this._mediaUrlInput.setCustomValidity('Invalid media url!')
    }
    this._mediaUrlValidateBtn.disabled = !isValid
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

  //----------------------Public API---------------------------

  openDialog(): void {
    if (this._dialogEl) {
      this._dialogEl.open = true
    }
  }

  closeDialog(): void {
    if (this._dialogEl) {
      this._dialogEl.open = false
    }
  }

  set mediaUrl(value: string) {
    this.setAttribute(ATTRIBUTES.MEDIA_URL, value)
  }

  validate(): void {
    this._mediaUrlValidateBtn?.click()
  }

  focusInput(): void {
    this._mediaUrlInput?.focus()
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
