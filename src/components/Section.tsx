import type { PresentationSection, SectionItem } from '../types/api'
import { ItemReferences } from './ItemReferences'
import { Reveal } from './Reveal'
import { Scene } from './Scene'

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
    <dl className="border-t border-mist/20">
      {items.map((item, i) => (
        <Reveal key={i} delay={i * 60}>
          <div className="border-b border-mist/20 py-4 sm:grid sm:grid-cols-[minmax(0,11rem)_1fr] sm:gap-8">
            <dt className="text-sm tracking-wide text-mist uppercase">{item.heading}</dt>
            <dd className="mt-1 sm:mt-0">
              <span className="whitespace-pre-line">{item.detail}</span>
              <ItemReferences item={item} />
            </dd>
          </div>
        </Reveal>
      ))}
    </dl>
  )
}

function ItemList({ items, headingLevel }: { items: SectionItem[]; headingLevel: 'h3' | 'h4' }) {
  const Heading = headingLevel
  return (
    <ol className="border-t border-mist/20">
      {items.map((item, i) => (
        <li key={i} className="border-b border-mist/20">
          <Reveal delay={i * 60} className="py-6">
            <Heading className="font-sans text-lg leading-snug font-medium tracking-normal text-paper sm:text-xl">{item.heading}</Heading>
            {item.detail && (
              <div className="mt-3 space-y-3 text-mist">
                <Paragraphs text={item.detail} />
              </div>
            )}
            <ItemReferences item={item} />
          </Reveal>
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
    <div className="space-y-14">
      {semesters.map((semester) => (
        <div key={semester}>
          <Reveal>
            <h3 className="mb-4 text-[clamp(1.75rem,3.2vw,2.25rem)] italic">
              {semester > 0 ? `Semester ${semester}` : 'Unscheduled'}
            </h3>
          </Reveal>
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
    <div className="mt-10">
      {section.layout === 'facts' && <Facts items={items} />}
      {section.layout === 'timeline' && <Semesters items={items} />}
      {section.layout === 'list' && <ItemList items={items} headingLevel="h3" />}
    </div>
  )
}

export function Section({ section, anchor }: { section: PresentationSection; anchor: string }) {
  const id = anchor
  return (
    <Scene as="section" id={id} labelledBy={`${id}-title`}>
      <Reveal>
        <h2 id={`${id}-title`} className="scene-title text-[clamp(2.75rem,8vw,5.5rem)]">
          {section.title}
        </h2>
        <span aria-hidden="true" className="mt-6 block h-px w-16 bg-wash" />
      </Reveal>
      <div className="mt-10 md:pl-[16rem]">
        {section.body.trim() !== '' && (
          <Reveal className="max-w-150 space-y-4 text-lg text-mist">
            <Paragraphs text={section.body} />
          </Reveal>
        )}
        <div className="max-w-150">
          <Items section={section} />
        </div>
      </div>
    </Scene>
  )
}
