import { useEffect, useRef, useState } from 'react'

type Options = {
  once?: boolean
  rootMargin?: string
}

export function useInView<T extends Element>({ once = true, rootMargin = '0px 0px -10% 0px' }: Options = {}) {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || (once && visible)) {
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.some((e) => e.isIntersecting)
        if (once) {
          if (intersecting) {
            setVisible(true)
            observer.disconnect()
          }
          return
        }
        setVisible(intersecting)
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [once, rootMargin, visible])

  return { ref, visible }
}
