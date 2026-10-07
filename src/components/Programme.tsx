import { outline, outlineTarget, sectionAnchor } from '../lib/sections'
import type { PresentationSection } from '../types/api'
import { Reveal } from './Reveal'

export function Programme({ sections }: { sections: PresentationSection[] }) {
  return (
    <nav aria-labelledby="programme-title" className="grid gap-10 md:grid-cols-[12rem_1fr] md:gap-16">
      <Reveal>
        <h2 id="programme-title" className="scene-title text-[clamp(2.5rem,6vw,3.5rem)]">
          Programme
        </h2>
      </Reveal>
      <ol className="border-t border-mist/20">
        {outline.map((item, i) => {
          const target = outlineTarget(item, sections)
          return (
            <li key={item.label} className="border-b border-mist/20">
              <Reveal delay={i * 70}>
                {target ? (
                  <a
                    href={`#${sectionAnchor(target)}`}
                    className="group flex items-center justify-between gap-6 py-5 font-display text-[clamp(1.6rem,3.4vw,2.25rem)] no-underline"
                  >
                    <span className="transition-transform duration-500 ease-(--ease-out-soft) group-hover:translate-x-3">
                      {item.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-px w-10 origin-right scale-x-0 bg-wash transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-x-100 group-focus-visible:scale-x-100"
                    />
                  </a>
                ) : (
                  <span className="block py-5 font-display text-[clamp(1.6rem,3.4vw,2.25rem)]">{item.label}</span>
                )}
              </Reveal>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
