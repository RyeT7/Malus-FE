import { useEffect, useState } from 'react'
import type { Me } from '../types/api'
import { ApiError, getMe } from './api'
import { authEnabled, getAccount } from './auth'

export type Session =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; me: Me }
  | { status: 'error'; message: string }

export function useSession(): Session {
  const [session, setSession] = useState<Session>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      if (authEnabled && !(await getAccount())) {
        if (!controller.signal.aborted) {
          setSession({ status: 'signed-out' })
        }
        return
      }
      const me = await getMe(controller.signal)
      if (!controller.signal.aborted) {
        setSession({ status: 'signed-in', me })
      }
    }

    load().catch((err: unknown) => {
      if (controller.signal.aborted) {
        return
      }
      if (err instanceof ApiError && err.status === 401) {
        setSession({ status: 'signed-out' })
        return
      }
      setSession({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
    })

    return () => controller.abort()
  }, [])

  return session
}
