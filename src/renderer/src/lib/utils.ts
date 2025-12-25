export function localizeElementsText(root: HTMLElement | ShadowRoot): void {
  const t = window.api.i18n.t

  // translate label attribute
  root.querySelectorAll('[label]')?.forEach((e) => {
    const key = e.getAttribute('label')
    if (!key) return
    e.setAttribute('label', t(key))
  })

  // translate text content
  root.querySelectorAll('[data-i18n]')?.forEach((e) => {
    const key = e.getAttribute('data-i18n')
    if (!key) return
    e.textContent = t(key)
  })

  // translate placeholder attribute
  root.querySelectorAll('[placeholder]')?.forEach((e) => {
    const key = e.getAttribute('placeholder')
    if (!key) return
    e.setAttribute('placeholder', t(key))
  })

  // placeholder translations
  root.querySelectorAll('[data-i18n-placeholder]')?.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) el.setAttribute('placeholder', t(key))
  })

  // aria-label translations
  root.querySelectorAll('[data-i18n-aria-label]')?.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label')
    if (key) el.setAttribute('aria-label', t(key))
  })
}
