import type { PresentationSection, SectionItem } from '../types/api'
import { sectionAnchor } from '../lib/sections'

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

function Paragraphs({ text }: { text: string }) {
  return paragraphs(text).map((p, i) => (
    <p key={i} className="whitespace-pre-line">
      {p}
    </p>
  ))
}

function Facts({ items }: { items: SectionItem[] }) {
  return (
    <dl className="border-t border-mist">
      {items.map((item, i) => (
        <div key={i} className="border-b border-mist py-3 sm:grid sm:grid-cols-[minmax(0,12rem)_1fr] sm:gap-6">
          <dt className="font-semibold">{item.heading}</dt>
          <dd className="whitespace-pre-line">{item.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

function ItemList({ items, headingLevel }: { items: SectionItem[]; headingLevel: 'h3' | 'h4' }) {
  const Heading = headingLevel
  return (
    <ol className="border-t border-mist">
      {items.map((item, i) => (
        <li key={i} className="border-b border-mist py-5">
          <Heading className="font-display text-[1.375rem] leading-[1.25]">{item.heading}</Heading>
          {item.detail && (
            <div className="mt-2 space-y-3">
              <Paragraphs text={item.detail} />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}

function Semesters({ items }: { items: SectionItem[] }) {
  const bySemester = new Map<number, SectionItem[]>()
  for (const item of items) {
    const semester = item.semester ?? 0
    bySemester.set(semester, [...(bySemester.get(semester) ?? []), item])
  }
  const semesters = [...bySemester.keys()].sort((a, b) => a - b)
  return (
    <div className="space-y-10">
      {semesters.map((semester) => (
        <div key={semester}>
          <h3 className="mb-3 text-[1.625rem]">{semester > 0 ? `Semester ${semester}` : 'Unscheduled'}</h3>
          <ItemList items={bySemester.get(semester) ?? []} headingLevel="h4" />
        </div>
      ))}
    </div>
  )
}

function Items({ section }: { section: PresentationSection }) {
  const items = section.items ?? []
  if (items.length === 0) {
    return null
  }
  return (
    <div className="mt-8 max-w-150">
      {section.kind === 'biodata' ? (
        <Facts items={items} />
      ) : section.kind === 'workplan' ? (
        <Semesters items={items} />
      ) : (
        <ItemList items={items} headingLevel="h3" />
      )}
    </div>
  )
}

export function Section({ section }: { section: PresentationSection }) {
  const id = sectionAnchor(section)
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-8 border-t border-mist pt-10">
      <h2 id={`${id}-title`} className="text-[clamp(1.75rem,4vw,2.5rem)]">
        {section.title}
      </h2>
      {section.body.trim() !== '' && (
        <div className="mt-6 max-w-150 space-y-4">
          <Paragraphs text={section.body} />
        </div>
      )}
      <Items section={section} />
    </section>
  )
}
