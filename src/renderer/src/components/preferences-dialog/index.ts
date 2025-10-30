import './tabs-content/general-tab/index'
import './tabs-content/downloader-tab/index'
import './tabs-content/downloads-tab/index'
import template from './template.html?raw'
import styleCss from './style.css?inline'
import { UIDialog, UIButton, UITabs } from '../ui'

export class PreferencesDialog extends HTMLElement {
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

  constructor() {
    super()

    this.attachShadow({ mode: 'open' })
  }

  private t = window.api?.i18n?.t || (() => '')

  connectedCallback(): void {
    this._render()
    // handle trigger buttons active state
    this.renderTriggerButtons()

    // i18n init and binding
    this.applyI18n()

    const tabs = this.shadowRoot?.querySelector('ui-tabs') as UITabs | null
    // if (tabs) {
    //   const apply = (): void => this.updateTriggerVariants(tabs.value || '')
    //   tabs.addEventListener('change', apply as EventListener)
    //   // initialize once after triggers rendered
    //   apply()
    // }
  }

  private _render(): void {
    if (!this.shadowRoot) return
    this.shadowRoot.innerHTML = ''
    // attach cached stylesheet first to avoid FOUC
    this.shadowRoot.adoptedStyleSheets = [PreferencesDialog.sheet]
    // append cached template content
    this.shadowRoot.append(PreferencesDialog.tpl.content.cloneNode(true))
  }

  private renderTriggerButtons(): void {
    const generalTabTrigger = this.shadowRoot?.querySelector('#general-tab-trigger') as UIButton
    const downloaderTabTrigger = this.shadowRoot?.querySelector(
      '#downloader-tab-trigger'
    ) as UIButton
    const downloadsTabTrigger = this.shadowRoot?.querySelector('#downloads-tab-trigger') as UIButton

    generalTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'general'
    })
    downloaderTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'downloader'
    })
    downloadsTabTrigger.addEventListener('click', () => {
      ;(this.shadowRoot?.querySelector('ui-tabs') as UITabs).value = 'downloads'
    })
  }

  private updateTriggerVariants(active: string): void {
    const general = this.shadowRoot?.querySelector('#general-tab-trigger') as UIButton | null
    const downloader = this.shadowRoot?.querySelector('#downloader-tab-trigger') as UIButton | null
    const downloads = this.shadowRoot?.querySelector('#downloads-tab-trigger') as UIButton | null
    const map: Record<string, UIButton | null> = {
      general,
      downloader,
      downloads
    }
    for (const [key, btn] of Object.entries(map)) {
      if (!btn) continue
      if (key === active) btn.setAttribute('variant', 'secondary')
      else btn.setAttribute('variant', 'ghost')
    }
  }

  private applyI18n(): void {
    const root = this.shadowRoot
    if (!root) return
    const nodes = root.querySelectorAll<HTMLElement>('[data-i18n]')
    nodes.forEach((el) => {
      const key = el.getAttribute('data-i18n') || ''
      if (!key) return
      el.textContent = this.t(key)
    })
  }

  openDialog(): void {
    ;(this.shadowRoot?.querySelector('ui-dialog') as UIDialog)?.openDialog()
  }
}

customElements.define('preferences-dialog', PreferencesDialog)
