import { useCallback, useEffect, useState } from 'react'

export type View = { mode: 'reading' } | { mode: 'slides'; slide: number }

const historyKey = 'malusSlides'

function readView(): View {
  const params = new URLSearchParams(window.location.search)
  if (params.get('view') !== 'slides') {
    return { mode: 'reading' }
  }
  const n = Number(params.get('slide'))
  return { mode: 'slides', slide: Number.isInteger(n) && n >= 1 ? n - 1 : 0 }
}

function slidesUrl(slide: number): string {
  const url = new URL(window.location.href)
  url.searchParams.set('view', 'slides')
  url.searchParams.set('slide', String(slide + 1))
  url.hash = ''
  return url.toString()
}

function readingUrl(): string {
  const url = new URL(window.location.href)
  url.searchParams.delete('view')
  url.searchParams.delete('slide')
  return url.toString()
}

export function useView() {
  const [view, setView] = useState<View>(readView)

  useEffect(() => {
    const sync = () => setView(readView())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])

  const present = useCallback((slide = 0) => {
    window.history.pushState({ [historyKey]: true }, '', slidesUrl(slide))
    setView({ mode: 'slides', slide })
  }, [])

  const goTo = useCallback((slide: number) => {
    window.history.replaceState(window.history.state, '', slidesUrl(slide))
    setView({ mode: 'slides', slide })
  }, [])

  const exit = useCallback(() => {
    if (window.history.state?.[historyKey]) {
      window.history.back()
      return
    }
    window.history.replaceState(null, '', readingUrl())
    setView({ mode: 'reading' })
  }, [])

  return { view, present, goTo, exit }
}
