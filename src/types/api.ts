export type SectionKind =
  | 'biodata'
  | 'strengths'
  | 'weaknesses'
  | 'workplan'
  | 'innovations'
  | 'proposed_changes'
  | 'why_me'

export type PresentationSection = {
  kind: SectionKind
  title: string
  body: string
  version: number
  publishedAt: string
}

export type Presentation = {
  sections: PresentationSection[]
}

export type Question = {
  id: string
  text: string
  author?: string
  anonymous: boolean
  votes: number
  answered: boolean
  askedAt: string
  answeredAt?: string
}

export type List<T> = {
  items: T[]
}

export type ProblemDetails = {
  title?: string
  status?: number
  detail?: string
}
