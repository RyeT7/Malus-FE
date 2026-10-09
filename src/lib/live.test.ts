import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveState } from '../types/api'

type LiveModule = typeof import('./live')

let live: LiveModule

function state(sessionId: string, version: number, slide = 0, active = true): LiveState {
  return { sessionId, version, slide, slideCount: 10, active }
}

beforeEach(async () => {
  vi.resetModules()
  live = await import('./live')
})

describe('applyLive', () => {
  it('starts following a new active session', () => {
    live.applyLive(state('s1', 1, 3))
    expect(live.getSnapshot().state).toEqual(state('s1', 1, 3))
  })

  it('ignores updates that are not newer than the current one', () => {
    live.applyLive(state('s1', 5, 4))
    live.applyLive(state('s1', 4, 1))
    live.applyLive(state('s1', 5, 2))
    expect(live.getSnapshot().state?.slide).toBe(4)
  })

  it('applies newer updates of the same session', () => {
    live.applyLive(state('s1', 1, 0))
    live.applyLive(state('s1', 2, 6))
    expect(live.getSnapshot().state).toEqual(state('s1', 2, 6))
  })

  it('stops following when the session ends and ignores it afterwards', () => {
    live.applyLive(state('s1', 1, 2))
    live.applyLive(state('s1', 2, 2, false))
    expect(live.activeSession(live.getSnapshot())).toBeNull()
    live.applyLive(state('s1', 3, 5))
    expect(live.getSnapshot().state?.version).toBe(2)
  })

  it('switches to a new session and ignores late updates from the old one', () => {
    live.applyLive(state('s1', 1, 2))
    live.applyLive(state('s2', 1, 0))
    live.applyLive(state('s1', 9, 7))
    expect(live.getSnapshot().state?.sessionId).toBe('s2')
  })

  it('ignores an ended session it never followed', () => {
    live.applyLive(state('s1', 1, 2, false))
    expect(live.getSnapshot().state).toBeNull()
  })
})

describe('toLiveState', () => {
  it('maps a session from the API', () => {
    const session = { id: 's1', slideCount: 10, slide: 2, version: 3, active: true, startedAt: 't', updatedAt: 't' }
    expect(live.toLiveState(session)).toEqual(state('s1', 3, 2))
  })
})
