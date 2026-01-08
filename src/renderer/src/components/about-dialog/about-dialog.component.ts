import html from './about-dialog.template.html?raw'
import style from './about-dialog.style.css?inline'
import appLogoUrl from '@renderer/assets/logo.svg?url'

import { createStyleSheetFromStyle, createTemplateFromHtml } from '@renderer/lib/ui/dom-utils'
import { UiDialog } from '../ui/dialog/ui-dialog'
import { DATA } from '@root/shared/data'

const ABOUT_DIALOG_TAG_NAME = 'about-dialog'
export class AboutDialog extends HTMLElement {
  private static readonly tpl = createTemplateFromHtml(html)
  private static readonly sheet = createStyleSheetFromStyle(style)

  //refs
  private _dialogEl: null | UiDialog = null
  private _logoEl: null | HTMLImageElement = null
  private _appNameEl: null | HTMLElement = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    this._render()
    this._queryRefs()
    this._init()
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
  }

  private _init(): void {
    if (this._logoEl) {
      this._logoEl.src = appLogoUrl
    }

    if (this._appNameEl) {
      this._appNameEl.textContent = DATA.appName
    }
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
