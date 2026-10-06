import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, createSection, publishSection, saveDraft } from '../lib/api'
import type { AdminSection, SectionContent } from '../types/api'
import { ItemsEditor } from './ItemsEditor'
import { publishProblem, type KindInfo } from './kinds'

type Props = {
  info: KindInfo
  section?: AdminSection
  onSaved: (section: AdminSection, message: string) => void
  onReload: () => void
  onDirtyChange: (dirty: boolean) => void
}

const primaryButton = 'cursor-pointer bg-ink px-5 py-2 text-paper hover:underline disabled:cursor-default disabled:opacity-50 disabled:hover:no-underline'
const secondaryButton =
  'cursor-pointer border border-ink px-5 py-2 hover:bg-ink hover:text-paper disabled:cursor-default disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-ink'

function normalize(content: SectionContent): string {
  return JSON.stringify({
    title: content.title,
    body: content.body,
    items: content.items.map((item) => ({ heading: item.heading, detail: item.detail, semester: item.semester || 0 })),
  })
}

function emptyContent(info: KindInfo): SectionContent {
  return { title: info.label, body: '', items: [] }
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function SectionEditor({ info, section, onSaved, onReload, onDirtyChange }: Props) {
  const [form, setForm] = useState<SectionContent>(() => (section ? section.draft : emptyContent(info)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conflict, setConflict] = useState(false)

  const id = `editor-${info.kind}`
  const dirty = section ? normalize(form) !== normalize(section.draft) : true
  const problem = section ? publishProblem(info.kind, section.draft) : null

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
  } else if (problem) {
    publishBlocker = `Can't publish yet: ${problem}`
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
        onSaved(await createSection(info.kind, form), 'Draft created.')
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

  return (
    <section aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="text-[clamp(1.75rem,4vw,2.5rem)]">
        {info.label}
      </h2>
      <p className="mt-2 text-sm">
        {!section && 'Not created yet.'}
        {section && !section.published && 'Draft only, not published yet.'}
        {section?.published && `Live: version ${section.published.number}, published ${formatDate(section.published.publishedAt)}.`}
        {section?.published && section.hasUnpublishedChanges && ' The draft has unpublished changes.'}
      </p>
      <p className="mt-1 text-sm">Publishing rule: {info.rule}</p>

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
            Body <span className="text-sm">{info.kind === 'why_me' ? '(required to publish)' : '(optional intro)'}</span>
          </label>
          <textarea
            id={`${id}-body`}
            value={form.body}
            maxLength={20000}
            rows={info.kind === 'why_me' ? 10 : 4}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="mt-2 block w-full resize-y border border-ink bg-paper px-3 py-2"
          />
        </div>
        <fieldset>
          <legend className="text-[1.375rem] font-display">Items</legend>
          <div className="mt-4">
            <ItemsEditor
              idPrefix={id}
              items={form.items}
              itemLabel={info.itemLabel}
              withSemester={info.kind === 'workplan'}
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
