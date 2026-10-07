import { useEffect, useRef } from 'react'

export function StageLights() {
  const spot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = spot.current
    if (!node || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return
    }
    node.classList.add('stage-spot-follow')
    let frame = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        node.style.setProperty('--spot-x', `${e.clientX}px`)
        node.style.setProperty('--spot-y', `${e.clientY}px`)
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', move)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="stage-haze stage-haze-a" />
      <div className="stage-haze stage-haze-b" />
      <div className="stage-haze stage-haze-c" />
      <div ref={spot} className="stage-spot" />
      <div className="stage-beam">
        <span />
      </div>
      <div className="stage-grain" />
    </div>
  )
}
