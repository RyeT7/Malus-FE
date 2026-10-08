export type SectionLayout = 'list' | 'facts' | 'timeline'

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
  id: string
  title: string
  body: string
  layout: SectionLayout
  items?: SectionItem[]
  version: number
  publishedAt: string
}

export type SectionContent = {
  title: string
  body: string
  layout: SectionLayout
  items: SectionItem[]
}

export type SectionVersion = {
  number: number
  content: SectionContent
  publishedAt: string
}

export type AdminSection = {
  id: string
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

export type LiveSession = {
  id: string
  slideCount: number
  slide: number
  version: number
  active: boolean
  startedAt: string
  updatedAt: string
  endedAt?: string
}

export type LiveConnection = {
  kind: 'sse' | 'webpubsub'
  url: string
}

export type LiveState = {
  sessionId: string
  slide: number
  slideCount: number
  version: number
  active: boolean
}

export type List<T> = {
  items: T[]
}

export type ProblemDetails = {
  title?: string
  status?: number
  detail?: string
}
