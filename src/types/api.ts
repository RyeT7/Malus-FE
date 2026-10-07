export type SectionKind =
  | 'biodata'
  | 'strengths'
  | 'weaknesses'
  | 'workplan'
  | 'innovations'
  | 'proposed_changes'
  | 'why_me'

export type SectionSource = {
  label: string
  url: string
}

export type SectionAttachment = {
  id: string
  fileName: string
  contentType: string
  size: number
  ready: boolean
  createdAt: string
}

export type SectionItem = {
  heading: string
  detail: string
  semester?: number
  sources?: SectionSource[]
  attachments?: SectionAttachment[]
}

export type UploadTicket = {
  attachment: SectionAttachment
  uploadUrl: string
  headers: Record<string, string>
  expiresAt: string
}

export type PresentationSection = {
  kind: SectionKind
  title: string
  body: string
  items?: SectionItem[]
  version: number
  publishedAt: string
}

export type SectionContent = {
  title: string
  body: string
  items: SectionItem[]
}

export type SectionVersion = {
  number: number
  content: SectionContent
  publishedAt: string
}

export type AdminSection = {
  id: string
  kind: SectionKind
  draft: SectionContent
  published?: SectionVersion
  hasUnpublishedChanges: boolean
  revision: number
  createdAt: string
  updatedAt: string
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

export type Me = {
  subject: string
  name?: string
  roles: string[]
  admin: boolean
}

export type List<T> = {
  items: T[]
}

export type ProblemDetails = {
  title?: string
  status?: number
  detail?: string
}
