import { useCallback, useEffect, useMemo, useState } from 'react'
import { activeSession, useLive } from '../lib/live'
import { usePresentation } from '../lib/usePresentation'
import { useSlideDriver } from '../lib/useSlideDriver'
import { buildSlides } from './buildSlides'
import { SlideDeck } from './SlideDeck'

type Props = {
  slide: number
  presenting: boolean
  onSlideChange: (index: number) => void
  onExit: () => void
}

const statusButton = 'cursor-pointer px-3 py-2 text-paper underline decoration-mist underline-offset-[0.2em] hover:decoration-2'

export function SlideMode({ slide, presenting, onSlideChange, onExit }: Props) {
  const { state, retry } = usePresentation()
  const slides = useMemo(() => buildSlides(state.status === 'ready' ? state.sections : []), [state])
  const live = useLive()
  const session = activeSession(live)
  const driver = useSlideDriver(presenting && session ? session.sessionId : null)
  const [following, setFollowing] = useState(true)

  const tracking = presenting || following
  const liveSlide = session ? (driver.desired ?? session.slide) : null
  const raw = tracking && liveSlide !== null ? liveSlide : slide
  const index = Math.min(Math.max(raw, 0), Math.max(slides.length - 1, 0))
  const ready = state.status === 'ready'

  useEffect(() => {
    if (ready && index !== slide) {
      onSlideChange(index)
    }
  }, [ready, index, slide, onSlideChange])

  const { go } = driver
  const change = useCallback(
    (target: number) => {
      if (target === index) {
        return
      }
      if (presenting && session) {
        void go(target)
        return
      }
      if (session && following) {
        setFollowing(false)
      }
      onSlideChange(target)
    },
    [index, presenting, session, following, go, onSlideChange],
  )

  if (state.status === 'loading') {
    return (
      <p role="status" className="fixed inset-0 z-10 flex items-center justify-center bg-ink text-mist">
        Loading the presentation…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-ink px-6 text-center">
        <p>Could not load the presentation: {state.message}</p>
        <div className="flex gap-4">
          <button type="button" onClick={retry} className="cursor-pointer bg-paper px-6 py-3 text-ink hover:bg-mist">
            Try again
          </button>
          <button type="button" onClick={onExit} className="cursor-pointer px-6 py-3 text-mist hover:text-paper">
            Back to reading
          </button>
        </div>
      </div>
    )
  }

  let status = null
  if (presenting) {
    status = (
      <span className="px-3 py-2">
        {session ? <span className="text-paper">Presenting live</span> : <span className="text-mist">Not live</span>}
        {driver.error && (
          <span role="alert" className="ml-3 text-paper">
            {driver.error}
          </span>
        )}
      </span>
    )
  } else if (session) {
    status = following ? (
      <span className="px-3 py-2 text-paper">Following live</span>
    ) : (
      <button type="button" onClick={() => setFollowing(true)} className={statusButton}>
        Rejoin live
      </button>
    )
  }

  return <SlideDeck slides={slides} index={index} onIndexChange={change} onExit={onExit} status={status} />
}
