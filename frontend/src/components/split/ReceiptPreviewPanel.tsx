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
    : s.includes('kmart') ? '#D0021B'
    : '#6b7280'
  const label = s.includes('woolworths') ? 'Woolworths'
    : s.includes('costco') ? 'Costco'
    : s.includes('kmart') ? 'Kmart'
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

// --- Costco HTML receipt formatter ---

const _ITEM_CODE = /^\d{5,6}$/
const _QTY = /^1x$/i
const _PRICE = /^\d[\d,]*\.\d{2}$/
const _MINUS = /^-$/
const _GST_CODE = /^[01]$/
const _STOP = /\*{4}|total\s+number\s+of\s+items/i
const _TPD = /^TPD\s+/i
const _LOGISTICS = /^(MP\d+|T\d+H\d+|P\d+|SL\d+|C\d+\/L\d+\/P\d+\/D\d+|L\d+\/P\d+|L\/\d+\/P\d+\/D\d+)$/i
const _DATE_REF = /^\d{5,6}\b.*\d{1,2}\/\d{1,2}/i
const _BARE_AMT = /^\$?\d[\d,]*\.\d{2}$/
const _HEADER = /^(close|receipt\b|member\s*[:#]?|costco\b|warehouse\b|date\s*[.:]?\s*$|store\s*[.:]?\s*$|total\s*[.:]?\s*$|sub.?total|order\b|invoice\b|abn\b|thank\b|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i

function isLogisticsLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/)
  return tokens.length > 0 && tokens.every(t => _LOGISTICS.test(t))
}

function buildName(buf: string[]): { name: string; isTPD: boolean } {
  let isTPD = false
  const kept: string[] = []
  for (const line of buf) {
    if (!line || line.length <= 1) continue
    if (_TPD.test(line)) { isTPD = true; const r = line.replace(_TPD, '').trim(); if (r) kept.push(r); continue }
    if (isLogisticsLine(line)) continue
    if (_DATE_REF.test(line)) continue
    if (_BARE_AMT.test(line)) continue
    if (/^\d$/.test(line)) continue
    if (_QTY.test(line)) continue
    if (_HEADER.test(line)) continue
    kept.push(line)
  }
  return { name: kept.join(' ').trim(), isTPD }
}

function formatCostcoReceiptText(rawText: string): string {
  const lines = rawText.split('\n').map(l => l.trim())
  const n = lines.length
  const W = 46 // total line width for name + price columns
  const SEP = '─'.repeat(W)

  const out: string[] = []

  // Emit header: TAX INVOICE and Member lines from the first 8 lines
  for (let j = 0; j < Math.min(8, n); j++) {
    const l = lines[j]
    if (/TAX INVOICE/i.test(l)) out.push(l)
    else if (/^Member\s+\d/i.test(l) || /^MEMBER\s+\d/i.test(l)) out.push(l)
  }
  out.push(SEP)

  interface Row { name: string; price: number; isDiscount: boolean }
  const rows: Row[] = []
  let buf: string[] = []
  let i = 0

  while (i < n) {
    const line = lines[i]
    if (!line) { i++; continue }
    if (_STOP.test(line)) break

    if (_ITEM_CODE.test(line)) {
      i++ // past code
      if (i < n && _QTY.test(lines[i])) i++ // skip 1x
      let price = 0
      if (i < n && _PRICE.test(lines[i])) { price = parseFloat(lines[i].replace(',', '')); i++ }
      if (i < n && _PRICE.test(lines[i])) i++ // skip repeated
      let isNeg = false
      if (i < n && _MINUS.test(lines[i])) { isNeg = true; i++ }
      if (i < n && _GST_CODE.test(lines[i])) i++

      if (price > 0) {
        const { name, isTPD } = buildName(buf)
        if (name) rows.push({ name: isTPD ? `TPD ${name}` : name, price, isDiscount: isNeg || isTPD })
      }
      buf = []
      continue
    }
    buf.push(line)
    i++
  }

  // Format item rows
  function padRow(name: string, price: number, isDiscount: boolean): string {
    const priceStr = `${isDiscount ? '-' : ''}$${price.toFixed(2)}`
    const maxName = W - priceStr.length - 1
    const truncName = name.length > maxName ? name.substring(0, maxName - 1) + '…' : name
    return truncName + ' '.repeat(W - truncName.length - priceStr.length) + priceStr
  }

  for (const row of rows) out.push(padRow(row.name, row.price, row.isDiscount))
  out.push(SEP)

  // Footer: extract TOTAL and DEBIT from the raw text
  for (const line of lines) {
    const mTotal = line.match(/^\*{4}.*?([\d,]+\.\d{2})\s*$/i)
    if (mTotal) {
      const p = `$${mTotal[1]}`
      out.push('TOTAL (INCL GST)' + ' '.repeat(W - 16 - p.length) + p)
    }
    const mDebit = line.match(/DEBIT\s+(MASTERCARD|VISA|EFTPOS|CARD)\s+([\d,]+\.\d{2})/i)
    if (mDebit) {
      const label = `DEBIT ${mDebit[1].toUpperCase()}`
      const p = `$${mDebit[2]}`
      out.push(label + ' '.repeat(Math.max(1, W - label.length - p.length)) + p)
    }
  }

  return out.join('\n')
}

// --- Component ---

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

  const isCostco = /costco/i.test(store)
  const displayText = isHtml && isCostco && previewText
    ? formatCostcoReceiptText(previewText)
    : previewText

  const preStyle: React.CSSProperties = {
    padding: '16px',
    fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, monospace',
    fontSize: '13px',
    lineHeight: 1.6,
    whiteSpace: 'pre',
    wordBreak: 'normal',
    overflowX: 'auto',
    color: '#1C1B18',
  }

  if (!file && !previewText) return null

  if (!collapsible) {
    return (
      <div
        className="flex flex-col overflow-hidden rounded-md border border-rule bg-card shadow-card"
        style={{ height: 'calc(100vh - 120px)' }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-rule px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <StoreBadge store={store} />
            <span className="min-w-0 truncate font-mono text-xs text-ink-2" title={fileName}>
              {fileName}
            </span>
          </div>
          {isPdf && blobUrl && (
            <a href={blobUrl} target="_blank" rel="noopener noreferrer"
              title="Open full size in new tab"
              className="shrink-0 text-ink-3 transition hover:text-ink focus:outline-none">
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
          {isHtml && displayText && (
            <pre style={preStyle}>{displayText}</pre>
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
        <div className="mt-2 flex flex-col overflow-hidden rounded-md border border-rule bg-card shadow-card"
          style={{ height: '60vh' }}>
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
            {isHtml && displayText && (
              <pre style={preStyle}>{displayText}</pre>
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
