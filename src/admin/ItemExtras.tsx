import { useRef, useState, type ChangeEvent } from 'react'
import { attachmentLink, attachmentTypes, maxAttachmentBytes, uploadAttachment } from '../lib/api'
import { formatBytes } from '../lib/format'
import type { SectionAttachment, SectionSource } from '../types/api'

const smallButton =
  'cursor-pointer border border-mist px-3 py-1 text-sm hover:border-ink disabled:cursor-default disabled:opacity-50 disabled:hover:border-mist'

type SourcesProps = {
  id: string
  itemName: string
  sources: SectionSource[]
  onChange: (sources: SectionSource[]) => void
}

export function SourcesEditor({ id, itemName, sources, onChange }: SourcesProps) {
  function update(index: number, patch: Partial<SectionSource>) {
    onChange(sources.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold">Sources</legend>
      {sources.length === 0 && <p className="mt-1 text-sm">No sources cited.</p>}
      <ul className="mt-2 space-y-3">
        {sources.map((source, i) => (
          <li key={i} className="grid gap-2 sm:grid-cols-[minmax(0,12rem)_1fr_auto] sm:items-end">
            <div>
              <label htmlFor={`${id}-source-${i}-label`} className="block text-xs">
                Label
              </label>
              <input
                id={`${id}-source-${i}-label`}
                type="text"
                value={source.label}
                maxLength={200}
                onChange={(e) => update(i, { label: e.target.value })}
                className="mt-1 block w-full border border-ink bg-paper px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label htmlFor={`${id}-source-${i}-url`} className="block text-xs">
                Link (https://…)
              </label>
              <input
                id={`${id}-source-${i}-url`}
                type="url"
                inputMode="url"
                value={source.url}
                maxLength={2048}
                onChange={(e) => update(i, { url: e.target.value })}
                className="mt-1 block w-full border border-ink bg-paper px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => onChange(sources.filter((_, j) => j !== i))}
              aria-label={`Remove source ${i + 1} from ${itemName}`}
              className={smallButton}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onChange([...sources, { label: '', url: '' }])} className={`${smallButton} mt-3`}>
        Add source
      </button>
    </fieldset>
  )
}

type AttachmentsProps = {
  id: string
  itemName: string
  attachments: SectionAttachment[]
  onChange: (attachments: SectionAttachment[]) => void
}

export function AttachmentsEditor({ id, itemName, attachments, onChange }: AttachmentsProps) {
  const input = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function attach(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }
    setError('')
    if (!attachmentTypes.includes(file.type)) {
      setError('Only PDF, PNG, JPEG or WebP files can be attached.')
      return
    }
    if (file.size > maxAttachmentBytes) {
      setError(`Files must be at most ${formatBytes(maxAttachmentBytes)}.`)
      return
    }
    setBusy(true)
    setStatus(`Uploading ${file.name}…`)
    try {
      const uploaded = await uploadAttachment(file)
      onChange([...attachments, uploaded])
      setStatus(`${file.name} attached. Save the draft to keep it.`)
    } catch (err) {
      setStatus('')
      setError(err instanceof Error ? err.message : 'The upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function open(attachment: SectionAttachment) {
    setError('')
    try {
      window.open(await attachmentLink(attachment.id), '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open the file.')
    }
  }

  return (
    <fieldset className="mt-4">
      <legend className="text-sm font-semibold">Attachments</legend>
      {attachments.length === 0 && <p className="mt-1 text-sm">No files attached.</p>}
      <ul className="mt-2 space-y-2">
        {attachments.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 break-all">
              {a.fileName} <span className="text-xs">({formatBytes(a.size)})</span>
            </span>
            <button type="button" onClick={() => void open(a)} aria-label={`Open ${a.fileName}`} className={smallButton}>
              Open
            </button>
            <button
              type="button"
              onClick={() => onChange(attachments.filter((x) => x.id !== a.id))}
              aria-label={`Remove ${a.fileName} from ${itemName}`}
              className={smallButton}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <input
        ref={input}
        id={`${id}-file`}
        type="file"
        accept={attachmentTypes.join(',')}
        onChange={(e) => void attach(e)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button type="button" onClick={() => input.current?.click()} disabled={busy} className={`${smallButton} mt-3`}>
        {busy ? 'Uploading…' : 'Attach file'}
      </button>
      <p className="mt-1 text-xs">PDF, PNG, JPEG or WebP, up to {formatBytes(maxAttachmentBytes)}.</p>
      <p role="status" aria-live="polite" className="text-sm">
        {status}
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold">
          {error}
        </p>
      )}
    </fieldset>
  )
}
