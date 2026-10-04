import type { PresentationSection } from '../types/api'
import { sectionAnchor } from '../lib/sections'

function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

export function Section({ section }: { section: PresentationSection }) {
  const id = sectionAnchor(section)
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-mist pt-10">
      <h2 id={`${id}-title`} className="text-[clamp(1.75rem,4vw,2.5rem)]">
        {section.title}
      </h2>
      <div className="mt-6 max-w-150 space-y-4">
        {paragraphs(section.body).map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            {p}
          </p>
        ))}
      </div>
    </section>
  )
}
