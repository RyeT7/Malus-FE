import type { PresentationSection } from '../types/api'
import { Reveal } from './Reveal'

type Props = {
  sections: PresentationSection[]
  anchors: Map<string, string>
}

export function Programme({ sections, anchors }: Props) {
  return (
    <nav aria-labelledby="programme-title" className="grid gap-10 md:grid-cols-[12rem_1fr] md:gap-16">
      <Reveal>
        <h2 id="programme-title" className="scene-title text-[clamp(2.5rem,6vw,3.5rem)]">
          Programme
        </h2>
      </Reveal>
      <ol className="border-t border-mist/20">
        {sections.map((section, i) => (
          <li key={section.id} className="border-b border-mist/20">
            <Reveal delay={i * 70}>
              <a
                href={`#${anchors.get(section.id)}`}
                className="group flex items-center justify-between gap-6 py-5 font-display text-[clamp(1.6rem,3.4vw,2.25rem)] no-underline"
              >
                <span className="transition-transform duration-500 ease-(--ease-out-soft) group-hover:translate-x-3">{section.title}</span>
                <span
                  aria-hidden="true"
                  className="h-px w-10 origin-right scale-x-0 bg-wash transition-transform duration-500 ease-(--ease-out-soft) group-hover:scale-x-100 group-focus-visible:scale-x-100"
                />
              </a>
            </Reveal>
          </li>
        ))}
      </ol>
    </nav>
  )
}
