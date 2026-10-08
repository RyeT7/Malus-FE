import type { PresentationSection, SectionItem } from '../types/api'

export type ProgrammeEntry = { label: string; slide: number | null }

export type NumberedItem = SectionItem & { number: number; part: number }

export type Slide =
  | { type: 'title'; label: string }
  | { type: 'programme'; label: string; entries: ProgrammeEntry[] }
  | { type: 'text'; label: string; title: string; paragraphs: string[]; continued: boolean }
  | { type: 'facts'; label: string; title: string; items: NumberedItem[]; continued: boolean }
  | { type: 'items'; label: string; title: string; subtitle?: string; items: NumberedItem[]; continued: boolean }
  | { type: 'questions'; label: string }

export const maxItemsPerSlide = 4
export const maxCharsPerSlide = 650

export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
}

function chunkParagraphs(paragraphs: string[]): string[][] {
  const chunks: string[][] = []
  let current: string[] = []
  let size = 0
  for (const p of paragraphs) {
    if (current.length > 0 && size + p.length > maxCharsPerSlide) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(p)
    size += p.length
  }
  if (current.length > 0) {
    chunks.push(current)
  }
  return chunks
}

function itemSize(item: SectionItem): number {
  return item.heading.length + item.detail.length
}

export function numberItems(items: SectionItem[]): NumberedItem[] {
  return items.flatMap((item, i) => {
    if (itemSize(item) <= maxCharsPerSlide) {
      return [{ ...item, number: i + 1, part: 0 }]
    }
    return chunkParagraphs(paragraphsOf(item.detail)).map((chunk, part) => ({
      ...item,
      detail: chunk.join('\n\n'),
      number: i + 1,
      part,
    }))
  })
}

export function chunkItems(items: NumberedItem[]): NumberedItem[][] {
  const chunks: NumberedItem[][] = []
  let current: NumberedItem[] = []
  let size = 0
  for (const item of items) {
    const next = itemSize(item)
    if (current.length > 0 && (current.length >= maxItemsPerSlide || size + next > maxCharsPerSlide)) {
      chunks.push(current)
      current = []
      size = 0
    }
    current.push(item)
    size += next
  }
  if (current.length > 0) {
    chunks.push(current)
  }
  return chunks
}

function sectionSlides(section: PresentationSection): Slide[] {
  const slides: Slide[] = []
  const items = section.items ?? []
  const base = { title: section.title, label: section.title }
  const paragraphs = paragraphsOf(section.body)
  const shortIntro = section.layout === 'list' && paragraphs.join('').length <= 220 && items.length > 0

  if (paragraphs.length > 0 && !shortIntro) {
    chunkParagraphs(paragraphs).forEach((chunk, i) => {
      slides.push({ type: 'text', ...base, paragraphs: chunk, continued: i > 0 })
    })
  }

  const intro = shortIntro ? paragraphs : []
  const withIntro = <T extends Slide>(slide: T, i: number): T =>
    i === 0 && intro.length > 0 && slide.type === 'items' ? { ...slide, subtitle: intro.join(' ') } : slide

  if (section.layout === 'facts') {
    chunkItems(numberItems(items)).forEach((chunk, i) => {
      slides.push({ type: 'facts', ...base, items: chunk, continued: slides.length > 0 || i > 0 })
    })
  } else if (section.layout === 'timeline') {
    const bySemester = new Map<number, SectionItem[]>()
    for (const item of items) {
      const semester = item.semester ?? 0
      bySemester.set(semester, [...(bySemester.get(semester) ?? []), item])
    }
    for (const semester of [...bySemester.keys()].sort((a, b) => a - b)) {
      const label = semester > 0 ? `Semester ${semester}` : 'Unscheduled'
      chunkItems(numberItems(bySemester.get(semester) ?? [])).forEach((chunk, i) => {
        slides.push({ type: 'items', ...base, label: `${section.title}: ${label}`, subtitle: label, items: chunk, continued: i > 0 })
      })
    }
  } else {
    chunkItems(numberItems(items)).forEach((chunk, i) => {
      slides.push(withIntro({ type: 'items', ...base, items: chunk, continued: slides.length > 0 || i > 0 }, i))
    })
  }

  if (slides.length === 0) {
    slides.push({ type: 'text', ...base, paragraphs: [], continued: false })
  }
  return slides
}

export function buildSlides(sections: PresentationSection[]): Slide[] {
  const slides: Slide[] = [{ type: 'title', label: 'Title' }]
  const programme: Slide & { type: 'programme' } = { type: 'programme', label: 'Programme', entries: [] }
  slides.push(programme)

  for (const section of sections) {
    programme.entries.push({ label: section.title, slide: slides.length })
    slides.push(...sectionSlides(section))
  }

  slides.push({ type: 'questions', label: 'Questions' })
  return slides
}
