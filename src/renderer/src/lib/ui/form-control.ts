export type FormSubmitterLike = HTMLElement & {
  name?: string | null
  value?: string | null
}

/**
 * Finds the form associated with a control.
 *
 * Supports both being inside a <form> and using the `form` attribute
 * to reference a form by id across the DOM.
 */
export function getAssociatedForm(control: HTMLElement): HTMLFormElement | null {
  // If the element exposes a `form` property (like native controls), prefer that.
  const anyControl = control as HTMLElement & {
    form?: HTMLFormElement | string | null
  }
  const formProp = anyControl.form

  if (formProp instanceof HTMLFormElement) return formProp

  if (typeof formProp === 'string' && formProp.length > 0) {
    const root = control.getRootNode() as Document | ShadowRoot | HTMLElement
    const formById = (root as Document | ShadowRoot).getElementById?.(formProp)
    if (formById instanceof HTMLFormElement) return formById
  }

  return control.closest('form') as HTMLFormElement | null
}

function doFormAction(
  control: HTMLElement,
  type: 'submit' | 'reset',
  submitterLike?: FormSubmitterLike
): void {
  const form = getAssociatedForm(control)
  if (!form) return

  const button = document.createElement('button')
  button.type = type
  button.style.position = 'absolute'
  button.style.width = '0'
  button.style.height = '0'
  button.style.clipPath = 'inset(50%)'
  button.style.overflow = 'hidden'
  button.style.whiteSpace = 'nowrap'

  if (submitterLike) {
    if (submitterLike.name) button.name = submitterLike.name
    if (submitterLike.value) button.value = submitterLike.value
    ;['formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget'].forEach((attr) => {
      if (submitterLike.hasAttribute(attr)) {
        const v = submitterLike.getAttribute(attr)
        if (v != null) button.setAttribute(attr, v)
      }
    })
  }

  form.append(button)
  button.click()
  button.remove()
}

export function submitAssociatedForm(
  control: HTMLElement,
  submitterLike?: FormSubmitterLike
): void {
  doFormAction(control, 'submit', submitterLike)
}

export function resetAssociatedForm(control: HTMLElement, submitterLike?: FormSubmitterLike): void {
  doFormAction(control, 'reset', submitterLike)
}
