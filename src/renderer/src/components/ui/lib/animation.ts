export type PresenceAnimator = {
  enter(): Promise<void>
  exit(): Promise<void>
  cancel(): void
}

type AnimatorOptions = {
  duration?: number
  easing?: string
  fill?: FillMode
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function animateTo(
  el: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  options: KeyframeAnimationOptions
): Animation | null {
  const fn = (el as HTMLElement).animate
  if (typeof fn !== 'function') return null
  return (el as HTMLElement).animate(keyframes, options)
}

export function createPresenceAnimator(
  el: Element | null,
  keyframesIn: Keyframe[] | PropertyIndexedKeyframes,
  keyframesOut: Keyframe[] | PropertyIndexedKeyframes,
  options: AnimatorOptions = {}
): PresenceAnimator {
  const { duration = 180, easing = 'ease', fill = 'forwards' } = options

  let current: Animation | null = null

  const cancel = (): void => {
    try {
      current?.cancel()
    } catch {
      // ignore
    }
    current = null
  }

  const run = async (keyframes: Keyframe[] | PropertyIndexedKeyframes): Promise<void> => {
    cancel()
    if (!el) return

    if (prefersReducedMotion()) return

    const anim = animateTo(el, keyframes, { duration, easing, fill })
    current = anim
    if (!anim) return

    try {
      await anim.finished
    } catch {
      // cancelled
    } finally {
      if (current === anim) current = null
    }
  }

  return {
    enter: () => run(keyframesIn),
    exit: () => run(keyframesOut),
    cancel
  }
}
