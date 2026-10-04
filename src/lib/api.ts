import type { List, Presentation, ProblemDetails, Question } from '../types/api'

const baseUrl = (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json')
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
