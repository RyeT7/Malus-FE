import { useMemo } from 'react'
import { usePresentation } from '../lib/usePresentation'
import { buildSlides } from './buildSlides'
import { SlideDeck } from './SlideDeck'

type Props = {
  slide: number
  onSlideChange: (index: number) => void
  onExit: () => void
}

export function SlideMode({ slide, onSlideChange, onExit }: Props) {
  const { state, retry } = usePresentation()
  const slides = useMemo(() => buildSlides(state.status === 'ready' ? state.sections : []), [state])

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

  return <SlideDeck slides={slides} index={slide} onIndexChange={onSlideChange} onExit={onExit} />
}
