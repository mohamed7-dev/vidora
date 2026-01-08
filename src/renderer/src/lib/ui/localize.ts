export function localizeElementsText(root: HTMLElement | ShadowRoot): void {
  const t = window.api.i18n.t

  // translate text content -> keep
  root.querySelectorAll('[data-i18n]')?.forEach((e) => {
    const key = e.getAttribute('data-i18n')
    if (!key) return
    e.textContent = t(key as unknown as TemplateStringsArray)
  })

  // placeholder translations -> keep
  root.querySelectorAll('[data-i18n-placeholder]')?.forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) el.setAttribute('placeholder', t(key as unknown as TemplateStringsArray))
  })

  // aria-label translations -> keep
  root.querySelectorAll('[data-i18n-aria-label]')?.forEach((el) => {
    const key = el.getAttribute('data-i18n-aria-label')
    if (key) el.setAttribute('aria-label', t(key as unknown as TemplateStringsArray))
  })

  // label translations -> keep
  root.querySelectorAll('[data-i18n-label]')?.forEach((el) => {
    const key = el.getAttribute('data-i18n-label')
    if (key) el.setAttribute('label', t(key as unknown as TemplateStringsArray))
  })

  // translate label attribute
  root.querySelectorAll('[label]')?.forEach((e) => {
    const key = e.getAttribute('label')
    if (!key) return
    e.setAttribute('label', t(key as unknown as TemplateStringsArray))
  })

  // translate title attribute
  root.querySelectorAll('[title]')?.forEach((e) => {
    const key = e.getAttribute('title')
    if (!key) return
    e.setAttribute('title', t(key as unknown as TemplateStringsArray))
  })

  // translate placeholder attribute
  // root.querySelectorAll('[placeholder]')?.forEach((e) => {
  //   const key = e.getAttribute('placeholder')
  //   if (!key) return
  //   e.setAttribute('placeholder', t(key as unknown as TemplateStringsArray))
  // })
}
