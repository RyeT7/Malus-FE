import type { ReactNode } from 'react'
import { useInView } from '../lib/useInView'

type SceneProps = {
  as?: 'section' | 'div'
  id?: string
  labelledBy?: string
  children: ReactNode
}

export function Scene({ as: Tag = 'div', id, labelledBy, children }: SceneProps) {
  const { ref, visible } = useInView<HTMLDivElement>({ once: false, rootMargin: '-35% 0px -35% 0px' })
  return (
    <Tag id={id} aria-labelledby={labelledBy} data-lit={visible} className="scene slide relative isolate overflow-hidden">
      <div ref={ref} aria-hidden="true" className="absolute inset-0 -z-20" />
      <div className="slide-body relative">{children}</div>
    </Tag>
  )
}
