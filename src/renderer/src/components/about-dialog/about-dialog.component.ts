import html from './about-dialog.template.html?raw'
import style from './about-dialog.style.css?inline'
import appLogoUrl from '@renderer/assets/logo.svg?url'

import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { UiDialog } from '../ui/dialog/ui-dialog'
import { localizeElementsText } from '@renderer/lib/ui/localize'
import { OpenChangeEventDetail, UI_DIALOG_EVENTS } from '../ui/dialog/constants'

const ABOUT_DIALOG_TAG_NAME = 'about-dialog'
export class AboutDialog extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly sheet = createStyleSheetFromStyle(style)

  private _navigationEventsAborter = new AbortController()
  //refs
  private _dialogEl: null | UiDialog = null
  private _logoEl: null | HTMLImageElement = null
  private _appNameEl: null | HTMLElement = null
  private _appVersionEl: null | HTMLElement = null
  private _appCreatorNameEl: null | HTMLElement = null
  private _newIssueLinkEl: null | HTMLAnchorElement = null
  private _backEl: null | HTMLButtonElement = null
  private _screenTargets: NodeListOf<HTMLElement> | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    if (!this._navigationEventsAborter) this._navigationEventsAborter = new AbortController()
    this._render()
    localizeElementsText(this.shadowRoot as ShadowRoot)
    this._queryRefs()
    this._syncInfo()
    this._wireNavigation()
    this._setupListeners()
  }

  disconnedtedCallback(): void {
    this._cleanup()
    this._dialogEl?.removeEventListener(UI_DIALOG_EVENTS.OPEN_CHANGE, (e) =>
      this._handleOpenChange(e as CustomEvent<OpenChangeEventDetail>)
    )
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    this.shadowRoot.adoptedStyleSheets = [AboutDialog.sheet]
    this.shadowRoot.append(AboutDialog.tpl.content.cloneNode(true))
  }

  private _queryRefs(): void {
    this._dialogEl = this.shadowRoot?.querySelector('ui-dialog') as UiDialog
    this._logoEl = this.shadowRoot?.querySelector('[data-el="logo"]') as HTMLImageElement
    this._appNameEl = this.shadowRoot?.querySelector('[data-el="app-name"]') as HTMLElement
    this._appVersionEl = this.shadowRoot?.querySelector('[data-el="app-version"]') as HTMLElement
    this._appCreatorNameEl = this.shadowRoot?.querySelector(
      '[data-el="app-creator-name"]'
    ) as HTMLElement
    this._newIssueLinkEl = this.shadowRoot?.querySelector(
      '[data-el="new-issue-link"]'
    ) as HTMLAnchorElement
    this._backEl = this.shadowRoot?.querySelector('[data-el="back"]') as HTMLButtonElement
    this._screenTargets = this.shadowRoot?.querySelectorAll(
      'area-article[data-screen-target]'
    ) as NodeListOf<HTMLElement>
  }

  private async _syncInfo(): Promise<void> {
    // default to home screen
    this.dataset.activeScreen = 'home'

    if (this._logoEl) {
      this._logoEl.src = appLogoUrl
    }
    try {
      const info = await window.api.app.getInfo()

      if (this._appNameEl) {
        this._appNameEl.textContent = info.name
      }

      if (this._appVersionEl) {
        this._appVersionEl.textContent = info.version
      }

      if (this._appCreatorNameEl) {
        this._appCreatorNameEl.textContent = info.creatorName
      }

      if (this._newIssueLinkEl) {
        this._newIssueLinkEl.href = info.githubNewIssueUrl
      }
    } catch {
      // Swallow errors; about dialog should still render without app info.
    }
  }

  private _setupListeners(): void {
    this._dialogEl?.addEventListener(UI_DIALOG_EVENTS.OPEN_CHANGE, (e) =>
      this._handleOpenChange(e as CustomEvent<OpenChangeEventDetail>)
    )
  }

  private _wireNavigation(): void {
    this._navigationEventsAborter.abort()
    this._navigationEventsAborter = new AbortController()

    if (this._backEl) {
      this._backEl.addEventListener(
        'click',
        () => {
          this.dataset.activeScreen = 'home'
        },
        { signal: this._navigationEventsAborter.signal }
      )
    }

    if (this._screenTargets) {
      this._screenTargets.forEach((target) => {
        const screenId = target.getAttribute('data-screen-target')
        if (!screenId) return

        target.addEventListener(
          'click',
          () => {
            this.dataset.activeScreen = screenId
          },
          {
            signal: this._navigationEventsAborter.signal
          }
        )
      })
    }
  }

  private _handleOpenChange(e: CustomEvent<OpenChangeEventDetail>): void {
    const detail = e.detail
    if (detail.dialogId !== this._dialogEl?.instanceId) return
    if (!detail.open) {
      this._cleanup()
    } else {
      this._init()
    }
  }

  private _cleanup(): void {
    this.dataset.activeScreen = 'home'
    this._navigationEventsAborter.abort()
  }

  private _init(): void {
    this.dataset.activeScreen = 'home'
    this._wireNavigation()
  }

  //--------------------Public API-------------------------
  openDialog(): void {
    if (this._dialogEl) this._dialogEl.open = true
  }

  closeDialog(): void {
    if (this._dialogEl) this._dialogEl.open = false
  }
}

if (!customElements.get(ABOUT_DIALOG_TAG_NAME)) {
  customElements.define(ABOUT_DIALOG_TAG_NAME, AboutDialog)
}

declare global {
  interface HTMLElementTagNameMap {
    [ABOUT_DIALOG_TAG_NAME]: AboutDialog
  }
}
