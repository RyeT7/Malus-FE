import { useEffect, useState } from 'react'
import { ApiError, listVersions, rollbackSection } from '../lib/api'
import type { AdminSection, SectionVersion } from '../types/api'

type Props = {
  section: AdminSection
  blocked: string
  onRestored: (section: AdminSection, message: string) => void
  onConflict: () => void
}

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; versions: SectionVersion[] }

const smallButton =
  'cursor-pointer border border-ink px-3 py-1 text-sm hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function VersionHistory({ section, blocked, onRestored, onConflict }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [confirming, setConfirming] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const live = section.published?.number

  useEffect(() => {
    const controller = new AbortController()
    listVersions(section.id, controller.signal).then(
      (versions) => setState({ status: 'ready', versions }),
      (err: unknown) => {
        if (!controller.signal.aborted) {
          setState({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
        }
      },
    )
    return () => controller.abort()
  }, [section.id])

  async function restore(version: number) {
    setBusy(true)
    setError('')
    try {
      const updated = await rollbackSection(section.id, version, section.revision)
      onRestored(updated, `Restored version ${version} as version ${updated.published?.number ?? ''}.`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        onConflict()
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
      setBusy(false)
      setConfirming(null)
    }
  }

  return (
    <section aria-labelledby={`history-${section.kind}`} className="mt-16 border-t border-mist pt-8">
      <h2 id={`history-${section.kind}`} className="text-[1.75rem]">
        Version history
      </h2>
      <p className="mt-2 text-sm">Restoring publishes a copy of an older version as a new version. Nothing is deleted.</p>
      {blocked && <p className="mt-2 text-sm font-semibold">{blocked}</p>}
      {error && (
        <p role="alert" className="mt-2 font-semibold">
          {error}
        </p>
      )}

      {state.status === 'loading' && <p className="mt-6">Loading versions…</p>}
      {state.status === 'error' && <p className="mt-6">Could not load versions: {state.message}</p>}
      {state.status === 'ready' && state.versions.length === 0 && <p className="mt-6">Nothing has been published yet.</p>}
      {state.status === 'ready' && state.versions.length > 0 && (
        <ol className="mt-6 border-t border-mist">
          {state.versions.map((v) => (
            <li key={v.number} className="border-b border-mist py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <p>
                  <span className="font-semibold">Version {v.number}</span>
                  <span className="text-sm"> · {formatDate(v.publishedAt)}</span>
                  {v.number === live && <span className="text-sm"> · live</span>}
                </p>
                {v.number !== live &&
                  (confirming === v.number ? (
                    <span className="flex gap-2">
                      <button type="button" onClick={() => void restore(v.number)} disabled={busy} className={smallButton}>
                        Confirm restore
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} disabled={busy} className={smallButton}>
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(v.number)}
                      disabled={busy || blocked !== ''}
                      aria-label={`Restore version ${v.number}`}
                      className={smallButton}
                    >
                      Restore
                    </button>
                  ))}
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-sm underline decoration-wash underline-offset-[0.2em]">Show content</summary>
                <div className="mt-3 space-y-2 border-l-2 border-mist pl-4 text-sm">
                  <p className="font-semibold">{v.content.title}</p>
                  {v.content.body && <p className="whitespace-pre-line">{v.content.body}</p>}
                  {v.content.items.length > 0 && (
                    <ol className="list-decimal space-y-1 pl-5">
                      {v.content.items.map((item, i) => (
                        <li key={i}>
                          {item.semester ? `Semester ${item.semester}: ` : ''}
                          <span className="font-semibold">{item.heading}</span>
                          {item.detail && ` — ${item.detail}`}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
