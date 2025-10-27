import template from './template.html?raw'
import resetStyle from '@renderer/assets/reset.css?inline'
import styleCss from './style.css?inline'
import iconNewSvg from '@renderer/assets/icons/plus.svg?raw'
import { UIButton, UIInput } from '../ui'
import { UIDialog } from '../ui/dialog'

export class NewDialog extends HTMLElement {
  private btnNew: UIButton | null = null
  private validateBtn: UIButton | null = null
  private mediaUrlInput: UIInput | null = null
  private _dialogEl: UIDialog | null = null
  private mediaLoadingScreen: HTMLElement | null = null
  private _mounted = false
  private _listeners: AbortController | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this.renderShell()
  }

  private applySvgIcons(): void {
    if (this.btnNew) this.btnNew.innerHTML = iconNewSvg
  }

  private renderShell(): void {
    const style = document.createElement('style')
    style.textContent = resetStyle + styleCss
    this.shadowRoot?.appendChild(style)
    const hostBtn = document.createElement('ui-button') as UIButton
    hostBtn.className = 'trigger-button'
    hostBtn.id = 'host-trigger-button'
    hostBtn.setAttribute('variant', 'ghost')
    hostBtn.setAttribute('size', 'icon')
    hostBtn.setAttribute('style', '--ui-button-icon-size: 22px')
    this.shadowRoot?.appendChild(hostBtn)
    this.btnNew = hostBtn
    this.applySvgIcons()
    this.btnNew.addEventListener('click', () => this.open())
  }

  private async mountDialog(): Promise<void> {
    if (this._mounted) return
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>('#new-dialog-template')
    if (!templateElement) return
    const frag = templateElement.content.cloneNode(true)
    this.shadowRoot?.appendChild(frag)
    this.validateBtn = this.shadowRoot?.querySelector('#validate-button') as UIButton | null
    this.mediaUrlInput = this.shadowRoot?.querySelector('#media-url-input') as UIInput | null
    this._dialogEl = this.shadowRoot?.querySelector('ui-dialog') as UIDialog | null
    this.mediaLoadingScreen = this.shadowRoot?.querySelector(
      "[data-screen='media-loading']"
    ) as HTMLElement | null
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
    this.mediaLoadingScreen = null
    this._mounted = false
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
      // TODO: render info into media-info-screen
      this._dialogEl.setAttribute('data-active-screen', 'media-info')
    } catch {
      // TODO: surface error message to the user in the url screen
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
