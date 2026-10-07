import { useSyncExternalStore } from 'react'
import type { LiveSession, LiveState } from '../types/api'
import { getLiveConnection, getLiveSession, liveStreamHref } from './api'

export type LiveStatus = 'connecting' | 'connected' | 'offline'

export type LiveSnapshot = {
  status: LiveStatus
  state: LiveState | null
}

const maxRetryMs = 30_000
const idleCloseMs = 5_000

let snapshot: LiveSnapshot = { status: 'connecting', state: null }
const listeners = new Set<() => void>()
const retired = new Set<string>()
let received = 0
let disconnect: (() => void) | null = null
let closeTimer: number | undefined

function emit(next: Partial<LiveSnapshot>) {
  snapshot = { ...snapshot, ...next }
  listeners.forEach((listener) => listener())
}

export function toLiveState(session: LiveSession): LiveState {
  return {
    sessionId: session.id,
    slide: session.slide,
    slideCount: session.slideCount,
    version: session.version,
    active: session.active,
  }
}

export function applyLive(incoming: LiveState) {
  received++
  const current = snapshot.state
  if (retired.has(incoming.sessionId)) {
    return
  }
  if (current && current.sessionId === incoming.sessionId) {
    if (incoming.version <= current.version) {
      return
    }
  } else if (!incoming.active) {
    retired.add(incoming.sessionId)
    return
  } else if (current) {
    retired.add(current.sessionId)
  }
  if (!incoming.active) {
    retired.add(incoming.sessionId)
  }
  emit({ state: incoming })
}

function applyFetched(session: LiveSession | null, receivedBefore: number) {
  if (session) {
    applyLive(toLiveState(session))
    return
  }
  const current = snapshot.state
  if (current?.active && received === receivedBefore) {
    retired.add(current.sessionId)
    emit({ state: { ...current, active: false } })
  }
}

async function handleMessage(data: unknown) {
  const text = data instanceof Blob ? await data.text() : String(data)
  let message: unknown
  try {
    message = JSON.parse(text)
  } catch {
    return
  }
  if (typeof message !== 'object' || message === null) {
    return
  }
  const m = message as Record<string, unknown>
  if (m.type !== 'state' || typeof m.sessionId !== 'string' || typeof m.slide !== 'number' || typeof m.version !== 'number') {
    return
  }
  applyLive({
    sessionId: m.sessionId,
    slide: m.slide,
    slideCount: typeof m.slideCount === 'number' ? m.slideCount : 0,
    version: m.version,
    active: m.active === true,
  })
}

function connect(): () => void {
  let closed = false
  let attempt = 0
  let retry: number | undefined
  let source: EventSource | null = null
  let socket: WebSocket | null = null
  let controller = new AbortController()

  const refresh = () => {
    const before = received
    getLiveSession(controller.signal).then(
      (session) => applyFetched(session, before),
      () => undefined,
    )
  }

  const connected = () => {
    attempt = 0
    emit({ status: 'connected' })
    refresh()
  }

  const schedule = () => {
    if (closed) {
      return
    }
    emit({ status: 'offline' })
    const delay = Math.min(maxRetryMs, 1000 * 2 ** attempt) * (0.5 + Math.random() / 2)
    attempt++
    retry = window.setTimeout(() => void open(), delay)
  }

  const open = async () => {
    controller.abort()
    controller = new AbortController()
    let connection
    try {
      connection = await getLiveConnection(controller.signal)
    } catch {
      schedule()
      return
    }
    if (closed) {
      return
    }
    const url = liveStreamHref(connection.url)
    if (connection.kind === 'webpubsub') {
      const ws = new WebSocket(url)
      socket = ws
      ws.onopen = connected
      ws.onmessage = (e) => void handleMessage(e.data)
      ws.onclose = () => {
        if (socket === ws) {
          socket = null
          schedule()
        }
      }
      return
    }
    const es = new EventSource(url)
    source = es
    es.onopen = connected
    es.onmessage = (e) => void handleMessage(e.data)
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        es.close()
        source = null
        schedule()
      } else {
        emit({ status: 'connecting' })
      }
    }
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible' && snapshot.status === 'connected') {
      refresh()
    }
  }

  document.addEventListener('visibilitychange', onVisible)
  void open()

  return () => {
    closed = true
    controller.abort()
    window.clearTimeout(retry)
    document.removeEventListener('visibilitychange', onVisible)
    source?.close()
    source = null
    const ws = socket
    socket = null
    ws?.close()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  window.clearTimeout(closeTimer)
  disconnect ??= connect()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      closeTimer = window.setTimeout(() => {
        disconnect?.()
        disconnect = null
        emit({ status: 'connecting' })
      }, idleCloseMs)
    }
  }
}

function getSnapshot(): LiveSnapshot {
  return snapshot
}

export function useLive(): LiveSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot)
}

export function activeSession(live: LiveSnapshot): LiveState | null {
  return live.state?.active ? live.state : null
}
