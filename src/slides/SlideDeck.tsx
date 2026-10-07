import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react'
import type { Slide } from './buildSlides'
import { SlideView } from './SlideView'

type Props = {
  slides: Slide[]
  index: number
  onIndexChange: (index: number) => void
  onExit: () => void
}

const swipeThreshold = 60

const controlButton =
  'cursor-pointer px-3 py-2 text-mist transition-colors hover:text-paper disabled:cursor-default disabled:opacity-40 disabled:hover:text-mist'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

export function SlideDeck({ slides, index, onIndexChange, onExit }: Props) {
  const deck = useRef<HTMLDivElement>(null)
  const swipeStart = useRef<{ x: number; y: number } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const last = slides.length - 1
  const current = Math.min(Math.max(index, 0), last)
  const slide = slides[current]

  const go = useCallback((target: number) => onIndexChange(Math.min(Math.max(target, 0), last)), [onIndexChange, last])

  useEffect(() => {
    if (current !== index) {
      onIndexChange(current)
    }
  }, [current, index, onIndexChange])

  useEffect(() => {
    deck.current?.focus({ preventScroll: true })
    const root = document.documentElement
    const previous = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void document.documentElement.requestFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || isTyping(e.target)) {
        return
      }
      const onButton = e.target instanceof HTMLButtonElement
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
          go(current + 1)
          break
        case ' ':
          if (onButton) {
            return
          }
          go(e.shiftKey ? current - 1 : current + 1)
          break
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          go(current - 1)
          break
        case 'Home':
          go(0)
          break
        case 'End':
          go(last)
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'Escape':
          if (document.fullscreenElement) {
            return
          }
          onExit()
          break
        default:
          return
      }
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [current, go, last, onExit, toggleFullscreen])

  function pointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType !== 'mouse') {
      swipeStart.current = { x: e.clientX, y: e.clientY }
    }
  }

  function pointerUp(e: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) {
      return
    }
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.abs(dx) > swipeThreshold && Math.abs(dx) > Math.abs(dy) * 1.5) {
      go(dx < 0 ? current + 1 : current - 1)
    }
  }

  const position = `${current + 1} of ${slides.length}`

  return (
    <div
      ref={deck}
      tabIndex={-1}
      role="region"
      aria-roledescription="slide deck"
      aria-label="Presentation slides"
      onPointerDown={pointerDown}
      onPointerUp={pointerUp}
      onPointerCancel={() => (swipeStart.current = null)}
      className="fixed inset-0 z-10 flex touch-pan-y flex-col outline-none"
    >
      <div aria-hidden="true" className="h-px w-full bg-mist/15">
        <div className="h-full bg-wash transition-[width] duration-500" style={{ width: `${((current + 1) / slides.length) * 100}%` }} />
      </div>

      <div
        key={current}
        role="group"
        aria-roledescription="slide"
        aria-label={`${position}: ${slide.label}`}
        className="enter flex min-h-0 flex-1 overflow-y-auto"
      >
        <div className="m-auto w-full max-w-6xl px-6 py-12 sm:px-12">
          <SlideView slide={slide} onJump={go} />
        </div>
      </div>

      <nav aria-label="Slide controls" className="flex items-center justify-between gap-4 border-t border-mist/10 px-4 py-2 text-sm sm:px-8">
        <button type="button" onClick={onExit} className={controlButton}>
          Exit
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(current - 1)} disabled={current === 0} aria-label="Previous slide" className={controlButton}>
            ← Previous
          </button>
          <span className="px-3 text-mist tabular-nums">
            {current + 1} / {slides.length}
          </span>
          <button type="button" onClick={() => go(current + 1)} disabled={current === last} aria-label="Next slide" className={controlButton}>
            Next →
          </button>
        </div>
        <button type="button" onClick={toggleFullscreen} aria-pressed={fullscreen} className={controlButton}>
          {fullscreen ? 'Exit full screen' : 'Full screen'}
        </button>
      </nav>

      <p role="status" aria-live="polite" className="sr-only">
        Slide {position}: {slide.label}
      </p>
    </div>
  )
}
