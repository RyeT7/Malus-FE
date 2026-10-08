import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, createSection, deleteSection, publishSection, saveDraft } from '../lib/api'
import type { AdminSection, SectionContent } from '../types/api'
import { ItemsEditor } from './ItemsEditor'
import { layouts } from './layouts'

type Props = {
  section?: AdminSection
  onSaved: (section: AdminSection, message: string) => void
  onDeleted: (id: string, message: string) => void
  onReload: () => void
  onDirtyChange: (dirty: boolean) => void
}

const primaryButton = 'cursor-pointer bg-ink px-5 py-2 text-paper hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline'
const linkButton = 'cursor-pointer underline decoration-wash underline-offset-[0.2em] hover:decoration-2 disabled:cursor-default disabled:opacity-50'
const secondaryButton =
  'cursor-pointer border border-ink px-5 py-2 hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink'

function normalize(content: SectionContent): string {
  return JSON.stringify({
    title: content.title,
    body: content.body,
    layout: content.layout,
    items: content.items.map((item) => ({
      heading: item.heading,
      detail: item.detail,
      semester: item.semester || 0,
      sources: (item.sources ?? []).map((s) => [s.label, s.url]),
      attachments: (item.attachments ?? []).map((a) => a.id),
    })),
  })
}

const emptyContent: SectionContent = { title: '', body: '', layout: 'list', items: [] }

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function SectionEditor({ section, onSaved, onDeleted, onReload, onDirtyChange }: Props) {
  const [form, setForm] = useState<SectionContent>(() => (section ? section.draft : emptyContent))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)

  const id = `editor-${section?.id ?? 'new'}`
  const dirty = section ? normalize(form) !== normalize(section.draft) : true

  useEffect(() => {
    onDirtyChange(Boolean(section) && dirty)
  }, [section, dirty, onDirtyChange])

  let publishBlocker = ''
  if (!section) {
    publishBlocker = 'Save a draft first.'
  } else if (dirty) {
    publishBlocker = 'Save your changes before publishing.'
  } else if (!section.hasUnpublishedChanges) {
    publishBlocker = 'Nothing new to publish.'
  }

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (err) {
      if (err instanceof ApiError && err.status === 412) {
        setConflict(true)
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.')
      }
    } finally {
      setBusy(false)
    }
  }

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (form.title.trim() === '') {
      setError('The title is required.')
      return
    }
    void run(async () => {
      if (section) {
        onSaved(await saveDraft(section.id, section.revision, form), 'Draft saved.')
      } else {
        onSaved(await createSection(form), 'Draft created.')
      }
    })
  }

  function publish() {
    if (!section) {
      return
    }
    void run(async () => {
      const updated = await publishSection(section.id, section.revision)
      onSaved(updated, `Published version ${updated.published?.number ?? ''}.`)
    })
  }

  function remove() {
    if (!section) {
      return
    }
    const name = section.draft.title
    if (!window.confirm(`Delete "${name}"? It is removed from the presentation together with its version history. This cannot be undone.`)) {
      return
    }
    void run(async () => {
      await deleteSection(section.id, section.revision)
      onDeleted(section.id, `Deleted "${name}".`)
    })
  }

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-[clamp(1.75rem,4vw,2.5rem)]">
        {section ? section.draft.title : 'New section'}
      </h2>
      <p className="mt-2 text-sm">
        {!section && 'Not created yet. New sections are added at the end.'}
        {section && !section.published && 'Draft only, not published yet.'}
        {section?.published && `Live: version ${section.published.number}, published ${formatDate(section.published.publishedAt)}.`}
        {section?.published && section.hasUnpublishedChanges && ' The draft has unpublished changes.'}
      </p>

      {conflict && (
        <div role="alert" className="mt-6 border-l-2 border-wash pl-4">
          <p className="font-semibold">This section was changed somewhere else, so your save was not applied.</p>
          <p className="mt-1">Reloading shows the latest version and discards the edits on this page.</p>
          <button type="button" onClick={onReload} className={`${secondaryButton} mt-3`}>
            Reload latest version
          </button>
        </div>
      )}

      <form onSubmit={save} className="mt-8 space-y-6" noValidate>
        <div>
          <label htmlFor={`${id}-heading`} className="block">
            Title
          </label>
          <input
            id={`${id}-heading`}
            type="text"
            value={form.title}
            maxLength={200}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-2 block w-full border border-ink bg-paper px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor={`${id}-body`} className="block">
            Body <span className="text-sm">(optional)</span>
          </label>
          <textarea
            id={`${id}-body`}
            value={form.body}
            maxLength={20000}
            rows={6}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="mt-2 block w-full resize-y border border-ink bg-paper px-3 py-2"
          />
        </div>
        <fieldset>
          <legend className="text-[1.375rem] font-display">Layout</legend>
          <div className="mt-3 space-y-2">
            {layouts.map((l) => (
              <label key={l.layout} className="flex cursor-pointer items-baseline gap-3">
                <input
                  type="radio"
                  name={`${id}-layout`}
                  value={l.layout}
                  checked={form.layout === l.layout}
                  onChange={() => setForm({ ...form, layout: l.layout })}
                />
                <span>
                  {l.label} <span className="text-sm">{l.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-[1.375rem] font-display">Items</legend>
          <div className="mt-4">
            <ItemsEditor
              idPrefix={id}
              items={form.items}
              withSemester={form.layout === 'timeline'}
              onChange={(items) => setForm({ ...form, items })}
            />
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="font-semibold">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-mist pt-6">
          <button type="submit" disabled={busy || conflict || !dirty} className={primaryButton}>
            {section ? 'Save draft' : 'Create draft'}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy || conflict || publishBlocker !== ''}
            aria-describedby={publishBlocker ? `${id}-publish-blocker` : undefined}
            className={secondaryButton}
          >
            Publish
          </button>
          {busy && <span className="text-sm">Working…</span>}
          {section && (
            <button type="button" onClick={remove} disabled={busy} className={`${linkButton} ml-auto`}>
              Delete section
            </button>
          )}
        </div>
        {publishBlocker && (
          <p id={`${id}-publish-blocker`} className="text-sm">
            {publishBlocker}
          </p>
        )}
      </form>
    </section>
  )
}
