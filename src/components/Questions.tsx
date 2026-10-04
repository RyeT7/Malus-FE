import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, askQuestion, listQuestions, upvoteQuestion } from '../lib/api'
import type { Question } from '../types/api'
import { getViewerId, loadVotedQuestions, saveVotedQuestions } from '../lib/viewer'

const refreshMs = 10_000
const maxQuestionLength = 500

function sortQuestions(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => {
    if (a.answered !== b.answered) {
      return a.answered ? 1 : -1
    }
    if (a.votes !== b.votes) {
      return b.votes - a.votes
    }
    return a.askedAt.localeCompare(b.askedAt)
  })
}

function replace(questions: Question[], updated: Question): Question[] {
  const exists = questions.some((q) => q.id === updated.id)
  const next = exists ? questions.map((q) => (q.id === updated.id ? updated : q)) : [...questions, updated]
  return sortQuestions(next)
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong.'
}

export function Questions() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [voted, setVoted] = useState(loadVotedQuestions)
  const [pendingVote, setPendingVote] = useState('')
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [status, setStatus] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  const refresh = useCallback((signal?: AbortSignal) => {
    return listQuestions(signal).then(
      (items) => {
        setQuestions(sortQuestions(items))
        setLoadError('')
        setLoaded(true)
      },
      (err: unknown) => {
        if (signal?.aborted) {
          return
        }
        setLoadError(errorMessage(err))
        setLoaded(true)
      },
    )
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const load = () => listQuestions(controller.signal)
    const apply = (items: Question[]) => {
      setQuestions(sortQuestions(items))
      setLoadError('')
      setLoaded(true)
    }
    const fail = (err: unknown) => {
      if (controller.signal.aborted) {
        return
      }
      setLoadError(errorMessage(err))
      setLoaded(true)
    }
    load().then(apply, fail)
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        load().then(apply, fail)
      }
    }, refreshMs)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [])

  function markVoted(id: string) {
    setVoted((prev) => {
      const next = new Set(prev).add(id)
      saveVotedQuestions(next)
      return next
    })
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (text.trim() === '') {
      setFormError('Write a question first.')
      textRef.current?.focus()
      return
    }
    setSubmitting(true)
    setFormError('')
    try {
      const created = await askQuestion(text, author)
      setQuestions((prev) => replace(prev, created))
      setText('')
      setStatus('Your question was posted.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function upvote(id: string) {
    setPendingVote(id)
    try {
      const updated = await upvoteQuestion(id, getViewerId())
      setQuestions((prev) => replace(prev, updated))
      markVoted(id)
      setStatus('Vote counted.')
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        markVoted(id)
        setStatus(errorMessage(err))
        void refresh()
      } else {
        setStatus(`Could not vote: ${errorMessage(err)}`)
      }
    } finally {
      setPendingVote('')
    }
  }

  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-8 border-t border-mist pt-10">
      <h2 id="questions-title" className="text-[clamp(1.75rem,4vw,2.5rem)]">
        Questions
      </h2>
      <p className="mt-4 max-w-136">
        Ask anything about the plan. Leave your name blank to ask anonymously.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-150 space-y-4" noValidate>
        <div>
          <label htmlFor="question-text" className="block">
            Your question
          </label>
          <textarea
            id="question-text"
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={maxQuestionLength}
            rows={3}
            aria-invalid={formError !== ''}
            aria-describedby="question-count question-error"
            className="mt-2 block w-full resize-y border border-ink bg-paper px-3 py-2"
          />
          <p id="question-count" className="mt-1 text-sm">
            {text.length} / {maxQuestionLength}
          </p>
        </div>
        <div>
          <label htmlFor="question-author" className="block">
            Name <span className="text-sm">(optional)</span>
          </label>
          <input
            id="question-author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            maxLength={100}
            autoComplete="name"
            className="mt-2 block w-full border border-ink bg-paper px-3 py-2"
          />
        </div>
        <p id="question-error" role="alert" className="min-h-[1lh] font-semibold">
          {formError}
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer bg-ink px-5 py-2 text-paper hover:underline disabled:cursor-wait disabled:opacity-70"
        >
          {submitting ? 'Posting…' : 'Ask'}
        </button>
      </form>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="mt-12">
        {!loaded && <p>Loading questions…</p>}
        {loaded && loadError && (
          <p>
            Could not load questions: {loadError}{' '}
            <button type="button" onClick={() => void refresh()} className="cursor-pointer underline decoration-wash underline-offset-[0.2em]">
              Try again
            </button>
          </p>
        )}
        {loaded && !loadError && questions.length === 0 && <p>No questions yet. Be the first to ask.</p>}
        {questions.length > 0 && (
          <ol className="border-t border-mist">
            {questions.map((q) => {
              const hasVoted = voted.has(q.id)
              return (
                <li key={q.id} className="flex gap-5 border-b border-mist py-5">
                  <button
                    type="button"
                    onClick={() => void upvote(q.id)}
                    disabled={q.answered || hasVoted || pendingVote === q.id}
                    aria-pressed={hasVoted}
                    aria-label={`Upvote: ${q.text}. ${q.votes} ${q.votes === 1 ? 'vote' : 'votes'}`}
                    className="flex w-14 shrink-0 cursor-pointer flex-col items-center self-start border border-ink py-1 hover:bg-ink hover:text-paper disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-ink aria-pressed:bg-ink aria-pressed:text-paper aria-pressed:hover:bg-ink aria-pressed:hover:text-paper"
                  >
                    <span aria-hidden="true">▲</span>
                    <span className="tabular-nums">{q.votes}</span>
                  </button>
                  <div className="min-w-0">
                    <p className="break-words">{q.text}</p>
                    <p className="mt-1 text-sm">
                      {q.anonymous ? 'Anonymous' : q.author}
                      {q.answered && ' · Answered'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
