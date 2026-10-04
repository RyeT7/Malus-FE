import type { PresentationSection } from '../types/api'
import type { OutlineItem } from '../types/outline'

export const outline: OutlineItem[] = [
  { label: 'Biodata', kinds: ['biodata'] },
  { label: 'Strengths and weaknesses', kinds: ['strengths', 'weaknesses'] },
  { label: 'Workplan', kinds: ['workplan'] },
  { label: 'Innovations', kinds: ['innovations'] },
  { label: 'Proposed changes', kinds: ['proposed_changes'] },
  { label: 'Why I deserve the title', kinds: ['why_me'] },
]

export function sectionAnchor(section: PresentationSection): string {
  return section.kind.replaceAll('_', '-')
}

export function outlineTarget(item: OutlineItem, sections: PresentationSection[]): PresentationSection | undefined {
  for (const kind of item.kinds) {
    const section = sections.find((s) => s.kind === kind)
    if (section) {
      return section
    }
  }
  return undefined
}
