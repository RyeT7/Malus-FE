import { useCallback, useEffect, useRef, useState } from 'react'
import { setLiveSlide } from './api'
import { applyLive, toLiveState } from './live'

type Keyed<T> = { sessionId: string; value: T }

export function useSlideDriver(sessionId: string | null) {
  const [desired, setDesired] = useState<Keyed<number> | null>(null)
  const [error, setError] = useState<Keyed<string> | null>(null)
  const target = useRef<number | null>(null)
  const running = useRef(false)
  const current = useRef(sessionId)

  useEffect(() => {
    current.current = sessionId
  }, [sessionId])

  const go = useCallback(async (slide: number) => {
    const id = current.current
    if (!id) {
      return
    }
    target.current = slide
    setDesired({ sessionId: id, value: slide })
    if (running.current) {
      return
    }
    running.current = true
    setError(null)
    try {
      while (target.current !== null && current.current === id) {
        const next = target.current
        target.current = null
        try {
          applyLive(toLiveState(await setLiveSlide(id, next)))
        } catch (err) {
          setError({ sessionId: id, value: err instanceof Error ? err.message : 'Could not change the slide.' })
        }
      }
    } finally {
      target.current = null
      running.current = false
      setDesired(null)
    }
  }, [])

  return {
    desired: desired && desired.sessionId === sessionId ? desired.value : null,
    error: error && error.sessionId === sessionId ? error.value : '',
    go,
  }
}
