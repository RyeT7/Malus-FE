import { useCallback, useEffect, useState } from 'react'
import { ApiError, answerQuestion, listQuestions } from '../lib/api'
import type { Question } from '../types/api'

const refreshMs = 10_000

const smallButton =
  'cursor-pointer border border-ink px-3 py-1 text-sm hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink'

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; questions: Question[] }

function byVotes(a: Question, b: Question): number {
  return b.votes - a.votes || a.askedAt.localeCompare(b.askedAt)
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function QuestionsPanel() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [pending, setPending] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const refresh = useCallback((signal?: AbortSignal) => {
    return listQuestions(signal).then(
      (questions) => setLoad({ status: 'ready', questions }),
      (err: unknown) => {
        if (!signal?.aborted) {
          setLoad((prev) => (prev.status === 'ready' ? prev : { status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' }))
        }
      },
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh(controller.signal)
      }
    }, refreshMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh])

  async function markAnswered(question: Question) {
    setPending(question.id)
    setError('')
    try {
      const updated = await answerQuestion(question.id)
      setLoad((prev) =>
        prev.status === 'ready' ? { status: 'ready', questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)) } : prev,
      )
      setNotice(`Marked as answered: ${question.text}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setNotice('That question was already answered.')
        void refresh()
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      setPending('')
    }
  }

  const questions = load.status === 'ready' ? load.questions : []
  const open = questions.filter((q) => !q.answered).sort(byVotes)
  const answered = questions
    .filter((q) => q.answered)
    .sort((a, b) => (b.answeredAt ?? '').localeCompare(a.answeredAt ?? ''))

  return (
    <section aria-labelledby="questions-admin-title">
      <h2 id="questions-admin-title" className="text-[clamp(1.75rem,4vw,2.5rem)]">
        Questions
      </h2>
      <p className="mt-2 text-sm">Audience questions, most votes first. The list refreshes every 10 seconds.</p>

      <p role="status" aria-live="polite" className="mt-4 min-h-[1lh] text-sm font-semibold">
        {notice}
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}

      {load.status === 'loading' && <p className="mt-6">Loading questions…</p>}
      {load.status === 'error' && (
        <p className="mt-6">
          Could not load questions: {load.message}{' '}
          <button type="button" onClick={() => void refresh()} className="cursor-pointer underline decoration-wash underline-offset-[0.2em]">
            Try again
          </button>
        </p>
      )}

      {load.status === 'ready' && (
        <>
          <h3 className="mt-8 text-[1.375rem]">Unanswered ({open.length})</h3>
          {open.length === 0 ? (
            <p className="mt-3 text-sm">No open questions.</p>
          ) : (
            <ol className="mt-3 border-t border-mist">
              {open.map((q) => (
                <li key={q.id} className="flex flex-wrap items-start justify-between gap-4 border-b border-mist py-4">
                  <div className="min-w-0 flex-1">
                    <p className="break-words">{q.text}</p>
                    <p className="mt-1 text-sm">
                      {q.votes} {q.votes === 1 ? 'vote' : 'votes'} · {q.anonymous ? 'Anonymous' : q.author} · {formatTime(q.askedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void markAnswered(q)}
                    disabled={pending === q.id}
                    aria-label={`Mark answered: ${q.text}`}
                    className={smallButton}
                  >
                    {pending === q.id ? 'Saving…' : 'Mark answered'}
                  </button>
                </li>
              ))}
            </ol>
          )}

          <h3 className="mt-10 text-[1.375rem]">Answered ({answered.length})</h3>
          {answered.length === 0 ? (
            <p className="mt-3 text-sm">None yet.</p>
          ) : (
            <ol className="mt-3 border-t border-mist">
              {answered.map((q) => (
                <li key={q.id} className="border-b border-mist py-3">
                  <p className="break-words">{q.text}</p>
                  <p className="mt-1 text-sm">
                    {q.votes} {q.votes === 1 ? 'vote' : 'votes'} · answered {q.answeredAt ? formatTime(q.answeredAt) : ''}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  )
}
