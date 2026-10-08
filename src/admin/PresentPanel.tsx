import { useMemo, useState } from 'react'
import { endLiveSession, startLiveSession } from '../lib/api'
import { activeSession, applyLive, toLiveState, useLive } from '../lib/live'
import { usePresentation } from '../lib/usePresentation'
import { useSlideDriver } from '../lib/useSlideDriver'
import { buildSlides } from '../slides/buildSlides'

const bigButton =
  'min-h-16 cursor-pointer border border-ink px-4 py-3 text-lg hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink'
const primaryButton = 'cursor-pointer bg-ink px-5 py-3 text-paper hover:underline disabled:cursor-wait disabled:opacity-60'
const linkButton = 'cursor-pointer underline decoration-wash underline-offset-[0.2em] hover:decoration-2 disabled:cursor-wait'

export function PresentPanel() {
  const { state, retry } = usePresentation()
  const slides = useMemo(() => buildSlides(state.status === 'ready' ? state.sections : []), [state])
  const live = useLive()
  const session = activeSession(live)
  const driver = useSlideDriver(session?.sessionId ?? null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const start = () =>
    run(async () => {
      applyLive(toLiveState(await startLiveSession(slides.length)))
    })

  const end = (id: string) => {
    if (!window.confirm('End the live session? Audience devices stop following your slides.')) {
      return
    }
    void run(async () => {
      applyLive(toLiveState(await endLiveSession(id)))
    })
  }

  const current = session ? (driver.desired ?? session.slide) : 0
  const last = (session?.slideCount ?? slides.length) - 1
  const go = (target: number) => void driver.go(Math.min(Math.max(target, 0), last))

  return (
    <section aria-labelledby="present-title">
      <h2 id="present-title" className="text-[clamp(1.75rem,4vw,2.5rem)]">
        Present
      </h2>
      <p className="mt-2 max-w-prose text-sm">
        While a live session runs, audience devices in slide mode follow your slide. Open this page on your phone to use it as a remote.
      </p>

      {live.status !== 'connected' && (
        <p role="status" className="mt-4 text-sm font-semibold">
          {live.status === 'offline' ? 'Live updates are disconnected. Reconnecting…' : 'Connecting to live updates…'}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold">
          {error}
        </p>
      )}

      {state.status === 'loading' && <p className="mt-8">Loading the published slides…</p>}
      {state.status === 'error' && (
        <p className="mt-8">
          Could not load the published slides: {state.message}{' '}
          <button type="button" onClick={retry} className={linkButton}>
            Try again
          </button>
        </p>
      )}

      {state.status === 'ready' && !session && (
        <div className="mt-8">
          <p>No live session is running. The published presentation has {slides.length} slides.</p>
          <button type="button" onClick={() => void start()} disabled={busy} className={`${primaryButton} mt-4`}>
            {busy ? 'Starting…' : 'Start live session'}
          </button>
        </div>
      )}

      {state.status === 'ready' && session && (
        <div className="mt-8">
          <p className="text-sm">
            Live · slide {current + 1} of {session.slideCount}
          </p>
          <p className="mt-2 text-[clamp(1.5rem,4vw,2rem)] leading-tight">{slides[current]?.label ?? `Slide ${current + 1}`}</p>
          <p className="mt-1 text-sm">Next: {current < last ? (slides[current + 1]?.label ?? `Slide ${current + 2}`) : 'none, this is the last slide'}</p>

          {session.slideCount !== slides.length && (
            <p role="alert" className="mt-4 max-w-prose text-sm font-semibold">
              The published presentation now has {slides.length} slides, but this session was started with {session.slideCount}. End the session
              and start a new one so the audience sees the same slides.
            </p>
          )}

          <div className="mt-6 grid max-w-md grid-cols-2 gap-3">
            <button type="button" onClick={() => go(current - 1)} disabled={current <= 0} className={bigButton}>
              ← Previous
            </button>
            <button type="button" onClick={() => go(current + 1)} disabled={current >= last} className={bigButton}>
              Next →
            </button>
          </div>
          {driver.error && (
            <p role="alert" className="mt-3 text-sm font-semibold">
              {driver.error}
            </p>
          )}

          <label className="mt-6 block max-w-md text-sm">
            Go to slide
            <select value={current} onChange={(e) => go(Number(e.target.value))} className="mt-1 block w-full border border-ink bg-paper px-3 py-2 text-base">
              {Array.from({ length: session.slideCount }, (_, i) => (
                <option key={i} value={i}>
                  {i + 1}. {slides[i]?.label ?? `Slide ${i + 1}`}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a href={`/?view=slides&slide=${current + 1}&present=1`}>
              Open presenter slides
            </a>
            <button type="button" onClick={() => end(session.sessionId)} disabled={busy} className={linkButton}>
              {busy ? 'Ending…' : 'End live session'}
            </button>
          </p>
        </div>
      )}
    </section>
  )
}
