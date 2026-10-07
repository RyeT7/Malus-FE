import { attachmentHref } from '../lib/api'
import { formatBytes } from '../lib/format'
import type { SectionItem } from '../types/api'

function fileKind(contentType: string): string {
  if (contentType === 'application/pdf') {
    return 'PDF'
  }
  return contentType.replace('image/', '').toUpperCase()
}

export function ItemReferences({ item, size = 'sm' }: { item: SectionItem; size?: 'sm' | 'lg' }) {
  const sources = item.sources ?? []
  const attachments = item.attachments ?? []
  if (sources.length === 0 && attachments.length === 0) {
    return null
  }
  const text = size === 'lg' ? 'text-[clamp(0.95rem,1.4vw,1.15rem)]' : 'text-sm'

  return (
    <div className={`mt-3 space-y-1.5 ${text} text-mist`}>
      {sources.length > 0 && (
        <p>
          <span className="tracking-wide uppercase">Sources</span>{' '}
          {sources.map((source, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-paper hover:decoration-2">
                {source.label || new URL(source.url).host}
              </a>
            </span>
          ))}
        </p>
      )}
      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((file) => (
            <li key={file.id}>
              <a href={attachmentHref(file.id)} target="_blank" rel="noopener noreferrer" className="text-paper hover:decoration-2">
                {file.fileName}
              </a>{' '}
              <span>
                ({fileKind(file.contentType)}, {formatBytes(file.size)})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
