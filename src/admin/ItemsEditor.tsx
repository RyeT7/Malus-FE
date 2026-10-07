import type { SectionItem } from '../types/api'
import { AttachmentsEditor, SourcesEditor } from './ItemExtras'
import { maxSemester } from './kinds'

type Props = {
  idPrefix: string
  items: SectionItem[]
  itemLabel: string
  withSemester: boolean
  onChange: (items: SectionItem[]) => void
}

const smallButton =
  'cursor-pointer border border-mist px-3 py-1 text-sm hover:border-ink disabled:cursor-default disabled:opacity-50 disabled:hover:border-mist'

export function ItemsEditor({ idPrefix, items, itemLabel, withSemester, onChange }: Props) {
  function update(index: number, patch: Partial<SectionItem>) {
    onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function move(index: number, by: number) {
    const target = index + by
    if (target < 0 || target >= items.length) {
      return
    }
    const next = [...items]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function add() {
    onChange([...items, withSemester ? { heading: '', detail: '', semester: 1 } : { heading: '', detail: '' }])
  }

  return (
    <div>
      {items.length === 0 && <p className="text-sm">No items yet.</p>}
      <ol className="space-y-6">
        {items.map((item, i) => {
          const id = `${idPrefix}-item-${i}`
          const name = `${itemLabel} ${i + 1}`
          return (
            <li key={i}>
              <fieldset className="border-l-2 border-mist pl-4">
                <legend className="font-semibold">{name}</legend>
                <label htmlFor={`${id}-heading`} className="mt-2 block text-sm">
                  Heading
                </label>
                <input
                  id={`${id}-heading`}
                  type="text"
                  value={item.heading}
                  maxLength={200}
                  onChange={(e) => update(i, { heading: e.target.value })}
                  className="mt-1 block w-full border border-ink bg-paper px-3 py-2"
                />
                <label htmlFor={`${id}-detail`} className="mt-3 block text-sm">
                  Detail <span className="text-xs">(optional)</span>
                </label>
                <textarea
                  id={`${id}-detail`}
                  value={item.detail}
                  maxLength={5000}
                  rows={3}
                  onChange={(e) => update(i, { detail: e.target.value })}
                  className="mt-1 block w-full resize-y border border-ink bg-paper px-3 py-2"
                />
                {withSemester && (
                  <>
                    <label htmlFor={`${id}-semester`} className="mt-3 block text-sm">
                      Semester
                    </label>
                    <select
                      id={`${id}-semester`}
                      value={item.semester ?? 0}
                      onChange={(e) => update(i, { semester: Number(e.target.value) || undefined })}
                      className="mt-1 block border border-ink bg-paper px-3 py-2"
                    >
                      <option value={0}>Not set</option>
                      {Array.from({ length: maxSemester }, (_, n) => n + 1).map((n) => (
                        <option key={n} value={n}>
                          Semester {n}
                        </option>
                      ))}
                    </select>
                  </>
                )}
                <SourcesEditor id={id} itemName={name} sources={item.sources ?? []} onChange={(sources) => update(i, { sources })} />
                <AttachmentsEditor
                  id={id}
                  itemName={name}
                  attachments={item.attachments ?? []}
                  onChange={(attachments) => update(i, { attachments })}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${name} up`} className={smallButton}>
                    Move up
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === items.length - 1}
                    aria-label={`Move ${name} down`}
                    className={smallButton}
                  >
                    Move down
                  </button>
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove ${name}`} className={smallButton}>
                    Remove
                  </button>
                </div>
              </fieldset>
            </li>
          )
        })}
      </ol>
      <button type="button" onClick={add} className={`${smallButton} mt-6`}>
        Add {itemLabel.toLowerCase()}
      </button>
    </div>
  )
}
