export function createTemplateFromHtml(html: string): HTMLTemplateElement {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const inner = doc.querySelector('template')

  // Always return a template owned by the current document.
  const t = document.createElement('template')
  t.innerHTML = inner ? inner.innerHTML : html
  return t
}

export function createStyleSheetFromStyle(style: string): CSSStyleSheet {
  const s = new CSSStyleSheet()
  s.replaceSync(style)
  return s
}
