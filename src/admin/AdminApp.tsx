import { useCallback, useEffect, useState } from 'react'
import { listSections, reorderSections } from '../lib/api'
import { authEnabled, signIn, signOut } from '../lib/auth'
import { useSession } from '../lib/useSession'
import type { AdminSection } from '../types/api'
import { QuestionsPanel } from './QuestionsPanel'
import { SectionEditor } from './SectionEditor'
import { VersionHistory } from './VersionHistory'

type View = { type: 'section'; id: string } | { type: 'new' } | { type: 'questions' }

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; sections: AdminSection[] }

const linkButton = 'cursor-pointer underline decoration-wash underline-offset-[0.2em] hover:decoration-2'
const moveButton =
  'cursor-pointer px-2 py-1 text-sm hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink'
const navButton = 'block w-full cursor-pointer py-3 text-left hover:underline aria-[current]:font-semibold'

function sectionStatus(section: AdminSection): string {
  if (!section.published) {
    return 'Draft only'
  }
  return section.hasUnpublishedChanges ? `Live v${section.published.number}, unpublished changes` : `Live v${section.published.number}`
}

function sameView(a: View, b: View): boolean {
  return a.type === b.type && (a.type !== 'section' || (b.type === 'section' && a.id === b.id))
}

function Editor() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<View | null>(null)
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    listSections(controller.signal).then(
      (sections) => setLoad({ status: 'ready', sections }),
      (err: unknown) => {
        if (!controller.signal.aborted) {
          setLoad({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
        }
      },
    )
    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => {
    setNotice('Reloaded the latest version.')
    setLoad({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  const saved = useCallback((section: AdminSection, message: string) => {
    setNotice(message)
    setLoad((prev) => {
      if (prev.status !== 'ready') {
        return prev
      }
      const exists = prev.sections.some((s) => s.id === section.id)
      return {
        status: 'ready',
        sections: exists ? prev.sections.map((s) => (s.id === section.id ? section : s)) : [...prev.sections, section],
      }
    })
    setSelected({ type: 'section', id: section.id })
  }, [])

  const deleted = useCallback((id: string, message: string) => {
    setNotice(message)
    setDirty(false)
    setSelected(null)
    setLoad((prev) => (prev.status === 'ready' ? { status: 'ready', sections: prev.sections.filter((s) => s.id !== id) } : prev))
  }, [])

  const sections = load.status === 'ready' ? load.sections : []
  const fallback: View = sections.length > 0 ? { type: 'section', id: sections[0].id } : { type: 'new' }
  const known = selected !== null && (selected.type !== 'section' || sections.some((s) => s.id === selected.id))
  const current: View = known ? selected : fallback
  const section = current.type === 'section' ? sections.find((s) => s.id === current.id) : undefined

  function select(view: View) {
    if (sameView(view, current)) {
      return
    }
    if (dirty && !window.confirm('You have unsaved changes in this section. Leave without saving?')) {
      return
    }
    setNotice('')
    setDirty(false)
    setSelected(view)
  }

  async function move(index: number, by: number) {
    const target = index + by
    if (target < 0 || target >= sections.length) {
      return
    }
    const order = sections.map((s) => s.id)
    ;[order[index], order[target]] = [order[target], order[index]]
    setMoving(true)
    try {
      setLoad({ status: 'ready', sections: await reorderSections(order) })
      setNotice(`Moved "${sections[index].draft.title}" ${by < 0 ? 'up' : 'down'}.`)
    } catch (err) {
      setNotice(`Could not reorder: ${err instanceof Error ? err.message : 'Something went wrong.'}`)
    } finally {
      setMoving(false)
    }
  }

  return (
    <div className="mt-10 flex flex-col md:grid md:grid-cols-[17rem_1fr] md:gap-12">
      <nav aria-label="Sections" className="mb-10 md:mb-0">
        {load.status === 'loading' && <p className="text-sm">Loading sections…</p>}
        {load.status === 'error' && (
          <div role="alert" className="text-sm">
            <p>Could not load sections: {load.message}</p>
            <button type="button" onClick={reload} className={`${linkButton} mt-2`}>
              Try again
            </button>
          </div>
        )}
        {load.status === 'ready' && (
          <>
            <p className="text-sm">The presentation shows published sections in this order.</p>
            <ol className="mt-3 border-t border-mist">
              {sections.map((s, i) => (
                <li key={s.id} className="flex items-center gap-1 border-b border-mist">
                  <button
                    type="button"
                    onClick={() => select({ type: 'section', id: s.id })}
                    aria-current={current.type === 'section' && current.id === s.id ? 'true' : undefined}
                    className={`${navButton} min-w-0 flex-1`}
                  >
                    <span className="block truncate">{s.draft.title}</span>
                    <span className="block text-sm font-normal">{sectionStatus(s)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(i, -1)}
                    disabled={moving || i === 0}
                    aria-label={`Move ${s.draft.title} up`}
                    className={moveButton}
                  >
                    {'\u2191\uFE0E'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void move(i, 1)}
                    disabled={moving || i === sections.length - 1}
                    aria-label={`Move ${s.draft.title} down`}
                    className={moveButton}
                  >
                    {'\u2193\uFE0E'}
                  </button>
                </li>
              ))}
              <li className="border-b border-mist">
                <button
                  type="button"
                  onClick={() => select({ type: 'new' })}
                  aria-current={current.type === 'new' ? 'true' : undefined}
                  className={navButton}
                >
                  + New section
                </button>
              </li>
            </ol>
          </>
        )}
        <ul className="mt-8 border-t border-mist">
          <li className="border-b border-mist">
            <button
              type="button"
              onClick={() => select({ type: 'questions' })}
              aria-current={current.type === 'questions' ? 'true' : undefined}
              className={navButton}
            >
              <span className="block">Questions</span>
              <span className="block text-sm font-normal">Mark audience questions answered</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className="min-w-0">
        <p role="status" aria-live="polite" className="mb-4 min-h-[1lh] text-sm font-semibold">
          {notice}
        </p>
        {current.type === 'questions' && <QuestionsPanel />}
        {load.status === 'ready' && (current.type === 'new' || section) && (
          <SectionEditor
            key={section ? `editor:${section.id}:${section.revision}` : 'editor:new'}
            section={section}
            onSaved={saved}
            onDeleted={deleted}
            onReload={reload}
            onDirtyChange={setDirty}
          />
        )}
        {section && (
          <VersionHistory
            key={`history:${section.id}:${section.revision}`}
            section={section}
            blocked={dirty ? 'Save or discard your changes above before restoring a version.' : ''}
            onRestored={saved}
            onConflict={reload}
          />
        )}
      </div>
    </div>
  )
}

export function AdminApp() {
  const session = useSession()

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-mist pb-6">
        <h1 className="text-[clamp(2rem,5vw,3rem)]">Edit presentation</h1>
        <p className="text-sm">
          <a href="/">View presentation</a>
          {session.status === 'signed-in' && (
            <>
              {' · '}
              {session.me.name ?? session.me.subject}
              {authEnabled && (
                <>
                  {' · '}
                  <button type="button" onClick={() => void signOut()} className={linkButton}>
                    Sign out
                  </button>
                </>
              )}
            </>
          )}
        </p>
      </header>

      {session.status === 'loading' && <p className="mt-10">Checking sign-in…</p>}
      {session.status === 'error' && <p className="mt-10">Could not check sign-in: {session.message}</p>}
      {session.status === 'signed-out' &&
        (authEnabled ? (
          <div className="mt-10">
            <p>Sign in with the admin account to edit the presentation.</p>
            <button type="button" onClick={() => void signIn()} className="mt-4 cursor-pointer bg-ink px-5 py-2 text-paper hover:underline">
              Sign in
            </button>
          </div>
        ) : (
          <p className="mt-10">Admin sign-in is not configured, and the gateway did not accept the request.</p>
        ))}
      {session.status === 'signed-in' && !session.me.admin && (
        <p className="mt-10">This account is signed in but is not an admin for this presentation.</p>
      )}
      {session.status === 'signed-in' && session.me.admin && <Editor />}
    </main>
  )
}
