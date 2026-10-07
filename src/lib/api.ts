import type {
  AdminSection,
  List,
  LiveConnection,
  LiveSession,
  Me,
  Presentation,
  ProblemDetails,
  Question,
  SectionContent,
  SectionKind,
  SectionAttachment,
  SectionVersion,
  UploadTicket,
} from '../types/api'
import { getAccessToken } from './auth'

const baseUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = RequestInit & { auth?: boolean }

async function request<T>(path: string, { auth = false, ...init }: RequestOptions = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth) {
    const token = await getAccessToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  let response: Response
  try {
    response = await fetch(baseUrl + path, { ...init, headers })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  if (!response.ok) {
    let message = response.statusText || 'Request failed'
    try {
      const problem = (await response.json()) as ProblemDetails
      message = problem.detail || problem.title || message
    } catch {
      message = response.statusText || message
    }
    throw new ApiError(response.status, message)
  }

  return (await response.json()) as T
}

export function getMe(signal?: AbortSignal): Promise<Me> {
  return request<Me>('/v1/me', { signal, auth: true })
}

export function getPresentation(signal?: AbortSignal): Promise<Presentation> {
  return request<Presentation>('/v1/presentation', { signal })
}

export async function listQuestions(signal?: AbortSignal): Promise<Question[]> {
  const list = await request<List<Question>>('/v1/questions', { signal })
  return list.items
}

export function answerQuestion(id: string): Promise<Question> {
  return request<Question>(`/v1/questions/${encodeURIComponent(id)}/answer`, { method: 'POST', auth: true })
}

export function askQuestion(text: string, author: string): Promise<Question> {
  return request<Question>('/v1/questions', {
    method: 'POST',
    body: JSON.stringify({ text, author }),
  })
}

export function upvoteQuestion(id: string, viewerId: string): Promise<Question> {
  return request<Question>(`/v1/questions/${encodeURIComponent(id)}/upvotes`, {
    method: 'POST',
    headers: { 'X-Viewer-ID': viewerId },
  })
}

function ifMatch(revision: number): HeadersInit {
  return { 'If-Match': `"${revision}"` }
}

function sectionPath(id: string): string {
  return `/v1/sections/${encodeURIComponent(id)}`
}

export async function listSections(signal?: AbortSignal): Promise<AdminSection[]> {
  const list = await request<List<AdminSection>>('/v1/sections', { signal, auth: true })
  return list.items
}

function contentPayload(content: SectionContent) {
  return {
    title: content.title,
    body: content.body,
    items: content.items.map((item) => ({
      heading: item.heading,
      detail: item.detail,
      semester: item.semester ?? 0,
      sources: item.sources ?? [],
      attachments: (item.attachments ?? []).map((a) => a.id),
    })),
  }
}

export function createSection(kind: SectionKind, content: SectionContent): Promise<AdminSection> {
  return request<AdminSection>('/v1/sections', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ kind, ...contentPayload(content) }),
  })
}

export function saveDraft(id: string, revision: number, content: SectionContent): Promise<AdminSection> {
  return request<AdminSection>(`${sectionPath(id)}/draft`, {
    method: 'PUT',
    auth: true,
    headers: ifMatch(revision),
    body: JSON.stringify(contentPayload(content)),
  })
}

export function publishSection(id: string, revision: number): Promise<AdminSection> {
  return request<AdminSection>(`${sectionPath(id)}/publish`, {
    method: 'POST',
    auth: true,
    headers: ifMatch(revision),
  })
}

export async function listVersions(id: string, signal?: AbortSignal): Promise<SectionVersion[]> {
  const list = await request<List<SectionVersion>>(`${sectionPath(id)}/versions`, { signal, auth: true })
  return list.items
}

export function rollbackSection(id: string, version: number, revision: number): Promise<AdminSection> {
  return request<AdminSection>(`${sectionPath(id)}/rollback`, {
    method: 'POST',
    auth: true,
    headers: ifMatch(revision),
    body: JSON.stringify({ version }),
  })
}

export const maxAttachmentBytes = 10 * 1024 * 1024
export const attachmentTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

export function attachmentHref(id: string): string {
  return `${baseUrl}/v1/attachments/${encodeURIComponent(id)}/content`
}

export async function attachmentLink(id: string): Promise<string> {
  const result = await request<{ url: string }>(`/v1/attachments/${encodeURIComponent(id)}/content`, { auth: true })
  return result.url
}

export async function uploadAttachment(file: File): Promise<SectionAttachment> {
  const ticket = await request<UploadTicket>('/v1/attachments', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ fileName: file.name, contentType: file.type, size: file.size }),
  })

  let response: Response
  try {
    response = await fetch(ticket.uploadUrl, { method: 'PUT', headers: ticket.headers, body: file })
  } catch {
    throw new ApiError(0, 'Could not reach file storage. Check your connection and try again.')
  }
  if (!response.ok) {
    throw new ApiError(response.status, `File storage rejected the upload (${response.status}).`)
  }

  return request<SectionAttachment>(`/v1/attachments/${encodeURIComponent(ticket.attachment.id)}/complete`, {
    method: 'POST',
    auth: true,
  })
}

export async function getLiveSession(signal?: AbortSignal): Promise<LiveSession | null> {
  try {
    return await request<LiveSession>('/v1/live/session', { signal })
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null
    }
    throw err
  }
}

export function getLiveConnection(signal?: AbortSignal): Promise<LiveConnection> {
  return request<LiveConnection>('/v1/live/connection', { signal })
}

export function liveStreamHref(url: string): string {
  return /^[a-z]+:\/\//i.test(url) ? url : baseUrl + url
}

function sessionPathOf(id: string): string {
  return `/v1/sessions/${encodeURIComponent(id)}`
}

export function startLiveSession(slideCount: number): Promise<LiveSession> {
  return request<LiveSession>('/v1/sessions', { method: 'POST', auth: true, body: JSON.stringify({ slideCount }) })
}

export function setLiveSlide(id: string, slide: number): Promise<LiveSession> {
  return request<LiveSession>(`${sessionPathOf(id)}/slide`, { method: 'PUT', auth: true, body: JSON.stringify({ slide }) })
}

export function endLiveSession(id: string): Promise<LiveSession> {
  return request<LiveSession>(`${sessionPathOf(id)}/end`, { method: 'POST', auth: true })
}
