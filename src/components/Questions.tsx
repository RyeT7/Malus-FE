import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { ApiError, askQuestion, listQuestions, upvoteQuestion } from '../lib/api'
import type { Question } from '../types/api'
import { getViewerId, loadVotedQuestions, saveVotedQuestions } from '../lib/viewer'
import { Reveal } from './Reveal'

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

  const field =
    'mt-2 block w-full border-0 border-b border-mist/60 bg-transparent px-0 py-2 text-paper transition-colors duration-300 placeholder:text-mist/70 hover:border-mist focus:border-paper focus:shadow-[0_1px_0_0_var(--color-paper)] focus:outline-none focus-visible:outline-none'

  return (
    <section id="questions" aria-labelledby="questions-title" className="grid scroll-mt-12 gap-10 md:grid-cols-[12rem_1fr] md:gap-16">
      <Reveal>
        <h2 id="questions-title" className="text-[clamp(2.5rem,6vw,3.5rem)] text-paper md:sticky md:top-12">
          Questions
        </h2>
      </Reveal>

      <div className="min-w-0">
        <Reveal>
          <p className="max-w-130 text-lg text-mist">
            Ask anything about the plan. Leave your name blank to ask anonymously.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <form onSubmit={submit} className="mt-10 max-w-150 space-y-8" noValidate>
            <div>
              <label htmlFor="question-text" className="block text-sm tracking-wide text-mist uppercase">
                Your question
              </label>
              <textarea
                id="question-text"
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={maxQuestionLength}
                rows={2}
                aria-invalid={formError !== ''}
                aria-describedby="question-count question-error"
                className={`${field} resize-none text-lg [field-sizing:content] min-h-[2lh]`}
              />
              <p id="question-count" className="mt-2 text-right text-sm text-mist tabular-nums">
                {text.length} / {maxQuestionLength}
              </p>
            </div>
            <div>
              <label htmlFor="question-author" className="block text-sm tracking-wide text-mist uppercase">
                Name <span className="normal-case tracking-normal">(optional)</span>
              </label>
              <input
                id="question-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={100}
                autoComplete="name"
                className={field}
              />
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <button
                type="submit"
                disabled={submitting}
                className="group inline-flex cursor-pointer items-center gap-3 bg-paper px-7 py-3 text-ink transition-colors duration-300 hover:bg-mist disabled:cursor-wait disabled:opacity-70"
              >
                {submitting ? 'Posting…' : 'Ask'}
                <span aria-hidden="true" className="transition-transform duration-300 ease-(--ease-out-soft) group-hover:translate-x-1">
                  →
                </span>
              </button>
              <p id="question-error" role="alert" className="font-medium text-paper">
                {formError}
              </p>
            </div>
          </form>
        </Reveal>

        <p role="status" aria-live="polite" className="sr-only">
          {status}
        </p>

        <div className="mt-16 max-w-150">
          {!loaded && <p className="text-mist">Loading questions…</p>}
          {loaded && loadError && (
            <p className="text-mist">
              Could not load questions: {loadError}{' '}
              <button type="button" onClick={() => void refresh()} className="cursor-pointer text-paper underline decoration-mist underline-offset-[0.25em]">
                Try again
              </button>
            </p>
          )}
          {loaded && !loadError && questions.length === 0 && <p className="text-mist">No questions yet. Be the first to ask.</p>}
          {questions.length > 0 && (
            <ol className="border-t border-mist/25">
              {questions.map((q) => {
                const hasVoted = voted.has(q.id)
                return (
                  <li key={q.id} className="enter flex gap-6 border-b border-mist/25 py-6">
                    <button
                      type="button"
                      onClick={() => void upvote(q.id)}
                      disabled={q.answered || hasVoted || pendingVote === q.id}
                      aria-pressed={hasVoted}
                      aria-label={`Upvote: ${q.text}. ${q.votes} ${q.votes === 1 ? 'vote' : 'votes'}`}
                      className="group flex w-12 shrink-0 cursor-pointer flex-col items-center gap-1 self-start py-1 text-mist transition-colors duration-300 hover:text-paper disabled:cursor-default disabled:hover:text-mist aria-pressed:text-paper aria-pressed:hover:text-paper"
                    >
                      <span aria-hidden="true" className="text-xs transition-transform duration-300 ease-(--ease-out-soft) group-hover:-translate-y-0.5 group-disabled:translate-y-0">
                        ▲
                      </span>
                      <span key={q.votes} className="pop font-display text-2xl leading-none tabular-nums">
                        {q.votes}
                      </span>
                    </button>
                    <div className="min-w-0">
                      <p className="text-lg break-words text-paper">{q.text}</p>
                      <p className="mt-2 text-sm text-mist">
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
      </div>
    </section>
  )
}
