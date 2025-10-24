import template from './template.html?raw'
import styleCss from './style.css?inline'
import iconMinSvg from '@renderer/assets/icons/minus.svg?raw'
import iconMaxSvg from '@renderer/assets/icons/square.svg?raw'
import iconCloseSvg from '@renderer/assets/icons/x.svg?raw'
import iconNewSvg from '@renderer/assets/icons/plus.svg?raw'
import iconDropdownSvg from '@renderer/assets/icons/ellipsis-vertical.svg?raw'
import iconSheetSvg from '@renderer/assets/icons/menu.svg?raw'

export class AppHeader extends HTMLElement {
  private t = window.api?.i18n?.t || (() => undefined)
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  connectedCallback(): void {
    const parser = new DOMParser()
    const parsedTree = parser.parseFromString(template, 'text/html')
    const templateElement = parsedTree.querySelector<HTMLTemplateElement>('#app-header-template')
    if (!templateElement) return
    const content = templateElement.content.cloneNode(true)
    const style = document.createElement('style')
    style.textContent = styleCss
    this.shadowRoot?.append(style, content)

    const root = this.shadowRoot as ShadowRoot
    const btnMin = root.querySelector('#chrome-controls-minimize') as HTMLElement | null
    const btnMax = root.querySelector('#chrome-controls-maximize') as HTMLElement | null
    const btnClose = root.querySelector('#chrome-controls-close') as HTMLElement | null
    const btnNew = root.querySelector('#app-header-new-button') as HTMLElement | null
    const btnDropdown = root.querySelector('#app-header-dropdown-button') as HTMLElement | null
    const btnSheet = root.querySelector('#app-header-sheet-button') as HTMLElement | null
    const menuPreferences = root.querySelector('#app-header-menu-preferences') as HTMLElement | null

    if (btnMin) btnMin.innerHTML = iconMinSvg
    if (btnMax) btnMax.innerHTML = iconMaxSvg
    if (btnClose) btnClose.innerHTML = iconCloseSvg
    if (btnNew) btnNew.innerHTML = iconNewSvg
    if (btnDropdown) btnDropdown.innerHTML = iconDropdownSvg
    if (btnSheet) btnSheet.innerHTML = iconSheetSvg

    btnMin?.addEventListener('click', () => {
      window.api?.window?.minimize()
    })
    btnMax?.addEventListener('click', () => {
      window.api?.window?.toggleMaximize()
    })
    btnClose?.addEventListener('click', () => {
      window.api?.window?.close()
    })
    menuPreferences?.addEventListener('click', () => {
      const prefs = root.querySelector('preferences-dialog') as HTMLElement & {
        openDialog?: () => void
      }
      prefs?.openDialog?.()
    })
    this.applyI18n()
  }

  private applyI18n(): void {
    const root = this.shadowRoot as ShadowRoot
    const menuPreferences = root.querySelectorAll('[data-i18n]')
    menuPreferences.forEach((el) => {
      el.textContent = this.t(el.getAttribute('data-i18n') as string) ?? ''
    })
  }
}

customElements.define('app-header', AppHeader)
