import type {
  AdminSection,
  List,
  Me,
  Presentation,
  ProblemDetails,
  Question,
  SectionContent,
  SectionKind,
  SectionVersion,
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

export function createSection(kind: SectionKind, content: SectionContent): Promise<AdminSection> {
  return request<AdminSection>('/v1/sections', {
    method: 'POST',
    auth: true,
    body: JSON.stringify({ kind, ...content }),
  })
}

export function saveDraft(id: string, revision: number, content: SectionContent): Promise<AdminSection> {
  return request<AdminSection>(`${sectionPath(id)}/draft`, {
    method: 'PUT',
    auth: true,
    headers: ifMatch(revision),
    body: JSON.stringify(content),
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
