const viewerKey = 'malus.viewer-id'
const votedKey = 'malus.voted-questions'

let fallbackViewerId: string | undefined

export function getViewerId(): string {
  try {
    const existing = localStorage.getItem(viewerKey)
    if (existing) {
      return existing
    }
    const id = crypto.randomUUID()
    localStorage.setItem(viewerKey, id)
    return id
  } catch {
    fallbackViewerId ??= crypto.randomUUID()
    return fallbackViewerId
  }
}

export function loadVotedQuestions(): Set<string> {
  try {
    const raw = localStorage.getItem(votedKey)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [])
  } catch {
    return new Set()
  }
}

export function saveVotedQuestions(ids: Set<string>): void {
  try {
    localStorage.setItem(votedKey, JSON.stringify([...ids]))
  } catch {
    return
  }
}
