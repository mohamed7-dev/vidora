import { UiButton } from '@renderer/components/ui/button/ui-button'

export type NextPage = number | null

export type InfiniteLoaderRenderOptions = {
  /** When null, there is no next page */
  nextPage: NextPage
  /** Overall loading state for fetching the next page */
  isFetchingNextPage: boolean
  /** Called with the next page index when a load is triggered */
  fetchPage: (page: number) => void
  /** Optional custom label for the load-more button */
  buttonLabel?: string
  /** Optional custom end-of-list message */
  endMessage?: string
}

/**
 * Manual-only infinite loader renderer.
 * It returns a container element that either shows:
 * - a disabled/active "Load more" button when there is a next page, or
 * - a "you have reached the end" message when there is no next page.
 */
export function createInfiniteLoaderElement(
  options: InfiniteLoaderRenderOptions
): UiButton | HTMLParagraphElement {
  const { nextPage, isFetchingNextPage, fetchPage, buttonLabel, endMessage } = options

  let element: UiButton | HTMLParagraphElement

  if (nextPage != null) {
    const button = document.createElement('ui-button')
    button.type = 'button'
    button.variant = 'outline'
    button.disabled = isFetchingNextPage
    button.textContent = isFetchingNextPage
      ? window.api.i18n.t`Loading…`
      : buttonLabel || window.api.i18n.t`Load more`
    button.addEventListener('click', () => {
      if (nextPage != null && !isFetchingNextPage) {
        fetchPage(nextPage)
      }
    })
    element = button
  } else {
    const message = document.createElement('p')
    message.style.textAlign = 'center'
    message.style.fontSize = 'var(--font-size-small)'
    message.style.color = 'inherit'
    message.textContent = endMessage || window.api.i18n.t`You have reached the end of the list`
    element = message
  }

  return element
}
