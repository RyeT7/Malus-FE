import type { PresentationSection } from '../types/api'

const reserved = new Set(['programme', 'questions', 'question-text', 'question-count', 'question-author', 'question-error'])

function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function sectionAnchors(sections: PresentationSection[]): Map<string, string> {
  const anchors = new Map<string, string>()
  const used = new Set<string>()
  for (const section of sections) {
    const base = slug(section.title) || 'section'
    let anchor = base
    for (let n = 2; used.has(anchor) || reserved.has(anchor); n++) {
      anchor = `${base}-${n}`
    }
    used.add(anchor)
    anchors.set(section.id, anchor)
  }
  return anchors
}
