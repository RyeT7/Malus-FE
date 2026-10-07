import { useCallback, useEffect, useState } from 'react'
import { listSections } from '../lib/api'
import { authEnabled, signIn, signOut } from '../lib/auth'
import { useSession } from '../lib/useSession'
import type { AdminSection, SectionKind } from '../types/api'
import { kindInfo, kinds } from './kinds'
import { PresentPanel } from './PresentPanel'
import { QuestionsPanel } from './QuestionsPanel'
import { SectionEditor } from './SectionEditor'
import { VersionHistory } from './VersionHistory'

type View = SectionKind | 'questions' | 'present'

function initialView(): View {
  return window.location.hash === '#present' ? 'present' : kinds[0].kind
}

type Load = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; sections: AdminSection[] }

const linkButton = 'cursor-pointer underline decoration-wash underline-offset-[0.2em] hover:decoration-2'

function sectionStatus(section: AdminSection | undefined): string {
  if (!section) {
    return 'Not created'
  }
  if (!section.published) {
    return 'Draft only'
  }
  return section.hasUnpublishedChanges ? `Live v${section.published.number}, unpublished changes` : `Live v${section.published.number}`
}

function Editor() {
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [selected, setSelected] = useState<View>(initialView)
  const [notice, setNotice] = useState('')
  const [dirty, setDirty] = useState(false)

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
    setLoad((prev) =>
      prev.status === 'ready'
        ? { status: 'ready', sections: [...prev.sections.filter((s) => s.kind !== section.kind), section] }
        : prev,
    )
  }, [])

  function select(kind: View) {
    if (kind === selected) {
      return
    }
    if (dirty && !window.confirm('You have unsaved changes in this section. Leave without saving?')) {
      return
    }
    setNotice('')
    setDirty(false)
    setSelected(kind)
  }

  const byKind = new Map(load.status === 'ready' ? load.sections.map((s) => [s.kind, s]) : [])
  const info = selected === 'questions' || selected === 'present' ? null : kindInfo(selected)
  const section = selected === 'questions' || selected === 'present' ? undefined : byKind.get(selected)
  const editing = info !== null && load.status === 'ready'

  return (
    <div className="mt-10 flex flex-col md:grid md:grid-cols-[15rem_1fr] md:gap-12">
      <nav aria-label="Sections" className="mb-10 md:mb-0">
        <ul className="border-t border-mist">
          {kinds.map((k) => (
            <li key={k.kind} className="border-b border-mist">
              <button
                type="button"
                onClick={() => select(k.kind)}
                aria-current={k.kind === selected ? 'true' : undefined}
                className="block w-full cursor-pointer py-3 text-left hover:underline aria-[current]:font-semibold"
              >
                <span className="block">{k.label}</span>
                <span className="block text-sm font-normal">{load.status === 'ready' ? sectionStatus(byKind.get(k.kind)) : load.status === 'loading' ? 'Loading…' : 'Not loaded'}</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="mt-8 border-t border-mist">
          <li className="border-b border-mist">
            <button
              type="button"
              onClick={() => select('present')}
              aria-current={selected === 'present' ? 'true' : undefined}
              className="block w-full cursor-pointer py-3 text-left hover:underline aria-[current]:font-semibold"
            >
              <span className="block">Present</span>
              <span className="block text-sm font-normal">Run the live session and control slides</span>
            </button>
          </li>
          <li className="border-b border-mist">
            <button
              type="button"
              onClick={() => select('questions')}
              aria-current={selected === 'questions' ? 'true' : undefined}
              className="block w-full cursor-pointer py-3 text-left hover:underline aria-[current]:font-semibold"
            >
              <span className="block">Questions</span>
              <span className="block text-sm font-normal">Mark audience questions answered</span>
            </button>
          </li>
        </ul>
      </nav>

      <div className={selected === 'present' ? 'order-first mb-10 min-w-0 md:order-none md:mb-0' : 'min-w-0'}>
        <p role="status" aria-live="polite" className="mb-4 min-h-[1lh] text-sm font-semibold">
          {notice}
        </p>
        {selected === 'present' && <PresentPanel />}
        {selected === 'questions' && <QuestionsPanel />}
        {info !== null && load.status === 'loading' && <p>Loading sections…</p>}
        {info !== null && load.status === 'error' && (
          <div role="alert">
            <p>Could not load sections: {load.message}</p>
            <button type="button" onClick={reload} className={`${linkButton} mt-2`}>
              Try again
            </button>
          </div>
        )}
        {editing && (
          <SectionEditor
            key={`${selected}:${section?.id ?? 'new'}:${section?.revision ?? 0}`}
            info={info}
            section={section}
            onSaved={saved}
            onReload={reload}
            onDirtyChange={setDirty}
          />
        )}
        {section && (
          <VersionHistory
            key={`${section.id}:${section.revision}`}
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
