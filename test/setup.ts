// Make RAF deterministic for component code that schedules work.
if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(performance.now()), 0) as unknown as number
  }
}
if (!globalThis.cancelAnimationFrame) {
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id as unknown as NodeJS.Timeout)
  }
}

// matchMedia is used for prefers-reduced-motion checks.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => {
    return {
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false
    } as unknown as MediaQueryList
  }) as typeof window.matchMedia
}

// Basic Web Animations API stub for jsdom.
const proto = HTMLElement.prototype as unknown as { animate?: (...args: unknown[]) => unknown }
if (typeof proto.animate !== 'function') {
  ;(HTMLElement.prototype as unknown as { animate: () => Animation }).animate =
    function animate(): Animation {
      const finished = Promise.resolve()
      return {
        finished,
        cancel: () => undefined
      } as unknown as Animation
    }
}

// Constructable Stylesheets stub for jsdom.
if (typeof globalThis.CSSStyleSheet === 'undefined') {
  class CSSStyleSheetPolyfill {
    replaceSync(): void {
      // no-op
    }
  }
  ;(globalThis as unknown as { CSSStyleSheet: typeof CSSStyleSheetPolyfill }).CSSStyleSheet =
    CSSStyleSheetPolyfill
} else {
  const sheetProto = (globalThis.CSSStyleSheet as unknown as { prototype: unknown }).prototype as {
    replaceSync?: (cssText: string) => void
  }
  if (typeof sheetProto.replaceSync !== 'function') {
    sheetProto.replaceSync = () => undefined
  }
}
