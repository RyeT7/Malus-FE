import type { SectionLayout } from '../types/api'

export const layouts: { layout: SectionLayout; label: string; description: string }[] = [
  { layout: 'list', label: 'List', description: 'Numbered items with a heading and optional detail.' },
  { layout: 'facts', label: 'Facts', description: 'Label and value pairs, such as Name and Major.' },
  { layout: 'timeline', label: 'Timeline', description: 'Items grouped by semester, one slide per semester.' },
]

export const maxSemester = 12
