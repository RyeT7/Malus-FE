import type { SectionContent, SectionKind } from '../types/api'

export type KindInfo = {
  kind: SectionKind
  label: string
  rule: string
  itemLabel: string
}

export const kinds: KindInfo[] = [
  { kind: 'biodata', label: 'Biodata', rule: 'At least one fact, such as Name or Major.', itemLabel: 'Fact' },
  { kind: 'strengths', label: 'Strengths', rule: 'Exactly three strengths.', itemLabel: 'Strength' },
  { kind: 'weaknesses', label: 'Weaknesses', rule: 'Exactly three weaknesses.', itemLabel: 'Weakness' },
  { kind: 'workplan', label: 'Workplan', rule: 'Every point needs a semester, covering at least two semesters.', itemLabel: 'Point' },
  { kind: 'innovations', label: 'Innovations', rule: 'At least one innovation.', itemLabel: 'Innovation' },
  { kind: 'proposed_changes', label: 'Proposed changes', rule: 'At least one proposed change.', itemLabel: 'Change' },
  { kind: 'why_me', label: 'Why I deserve the title', rule: 'The body text is required.', itemLabel: 'Reason' },
]

export const maxSemester = 12

export function kindInfo(kind: SectionKind): KindInfo {
  return kinds.find((k) => k.kind === kind) ?? kinds[0]
}

export function publishProblem(kind: SectionKind, content: SectionContent): string | null {
  const items = content.items
  switch (kind) {
    case 'strengths':
    case 'weaknesses':
      return items.length === 3 ? null : `Needs exactly 3 items, has ${items.length}.`
    case 'workplan': {
      const missing = items.findIndex((item) => !item.semester)
      if (missing >= 0) {
        return `Point ${missing + 1} needs a semester.`
      }
      const semesters = new Set(items.map((item) => item.semester))
      return semesters.size >= 2 ? null : `Needs points in at least 2 semesters, has ${semesters.size}.`
    }
    case 'biodata':
    case 'innovations':
    case 'proposed_changes':
      return items.length > 0 ? null : 'Needs at least one item.'
    case 'why_me':
      return content.body.trim() !== '' ? null : 'Needs body text.'
  }
}
