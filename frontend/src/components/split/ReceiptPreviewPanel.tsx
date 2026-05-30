import { useState, useEffect } from 'react'

interface Props {
  file: File | null
  previewText: string | null
  store: string
  fileName: string
  collapsible?: boolean
}

function StoreBadge({ store }: { store: string }) {
  const s = store.toLowerCase()
  const bg = s.includes('woolworths') ? '#1a7f37'
    : s.includes('costco') ? '#0062cc'
    : '#6b7280'
  const label = s.includes('woolworths') ? 'Woolworths'
    : s.includes('costco') ? 'Costco'
    : store
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
      style={{ background: bg }}
    >
      {label}
    </span>
  )
}


export default function ReceiptPreviewPanel({ file, previewText, store, fileName, collapsible = false }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const isHtml = !!(file && (file.name.toLowerCase().endsWith('.html') || file.type === 'text/html'))
  const isPdf = !!(file && file.type === 'application/pdf')

  useEffect(() => {
    if (!file || isHtml) { setBlobUrl(null); return }
    const url = URL.createObjectURL(file)
    setBlobUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, isHtml])

  if (!file && !previewText) return null

  if (!collapsible) {
    return (
      <div
        className="flex flex-col overflow-hidden rounded-md border border-rule bg-card shadow-card"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        {/* Header with store badge */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <StoreBadge store={store} />
            <span className="min-w-0 truncate font-mono text-xs text-ink-2" title={fileName}>
              {fileName}
            </span>
          </div>
          {isPdf && blobUrl && (
            <a
              href={blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full size in new tab"
              className="shrink-0 text-ink-3 transition hover:text-ink focus:outline-none"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>
          )}
        </div>
        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {isPdf && blobUrl && (
            <iframe src={blobUrl} title="Receipt" className="h-full w-full border-0" style={{ minHeight: '100%' }} />
          )}
          {isHtml && previewText && (
            <pre className="p-3 font-mono text-[11px] leading-relaxed text-ink-2"
              style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {previewText}
            </pre>
          )}
          {!isPdf && !isHtml && (
            <div className="flex h-full items-center justify-center p-8 text-sm text-ink-3">
              No preview available.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Collapsible (mobile) variant
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between rounded-md border border-rule bg-card px-4 py-3 text-sm font-medium text-ink transition hover:bg-paper focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <StoreBadge store={store} />
          <span>{open ? 'Hide receipt' : 'Show receipt'}</span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          className="shrink-0 text-ink-3"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="mt-2 flex flex-col overflow-hidden rounded-md border border-rule bg-card shadow-card"
          style={{ height: '60vh' }}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-3 py-2">
            <span className="min-w-0 truncate font-mono text-xs text-ink-2" title={fileName}>
              {fileName}
            </span>
            {isPdf && blobUrl && (
              <a href={blobUrl} target="_blank" rel="noopener noreferrer"
                title="Open full size" className="shrink-0 text-ink-3 transition hover:text-ink focus:outline-none">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isPdf && blobUrl && (
              <iframe src={blobUrl} title="Receipt" className="h-full w-full border-0" style={{ minHeight: '100%' }} />
            )}
            {isHtml && previewText && (
              <pre className="p-3 font-mono text-[11px] leading-relaxed text-ink-2"
                style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {previewText}
              </pre>
            )}
            {!isPdf && !isHtml && (
              <div className="flex h-full items-center justify-center p-8 text-sm text-ink-3">
                No preview available.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
