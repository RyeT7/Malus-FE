import { useCallback, useEffect, useState } from 'react'
import type { PresentationSection } from '../types/api'
import { getPresentation } from './api'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; sections: PresentationSection[] }

export function usePresentation() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getPresentation(controller.signal)
      .then((p) => setState({ status: 'ready', sections: p.sections }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return
        }
        setState({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
      })
    return () => controller.abort()
  }, [attempt])

  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return { state, retry }
}
