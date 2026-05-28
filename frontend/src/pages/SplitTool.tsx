import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import UploadZone from '../components/receipt/UploadZone'
import type { ReceiptItem, ScannedReceipt } from '../types'

// ---- Types ---------------------------------------------------------------

interface EditableItem extends ReceiptItem {
  checked: boolean
}

// ---- ItemRow -------------------------------------------------------------

interface ItemRowProps {
  item: EditableItem
  isEditing: boolean
  draft: string
  onToggle: () => void
  onEditStart: () => void
  onDraftChange: (v: string) => void
  onEditCommit: () => void
  onRemove: () => void
}

function ItemRow({
  item,
  isEditing,
  draft,
  onToggle,
  onEditStart,
  onDraftChange,
  onEditCommit,
  onRemove,
}: ItemRowProps) {
  const isDiscount = item.type === 'discount'

  return (
    <div
      className={[
        'group grid items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0 transition-opacity',
        'grid-cols-[auto_1fr_auto_auto_auto]',
        !item.checked ? 'opacity-40' : '',
      ].join(' ')}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="h-4 w-4 cursor-pointer rounded accent-[var(--primary)]"
      />

      {/* Name */}
      <div className="min-w-0">
        {isEditing ? (
          <input
            autoFocus
            value={draft}
            onChange={e => onDraftChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') onEditCommit()
            }}
            className="w-full rounded-xs border border-rule-strong bg-transparent px-2 py-0.5 text-sm text-ink outline-none focus:border-[var(--primary)]"
          />
        ) : (
          <button
            onClick={onEditStart}
            className="block w-full truncate text-left text-sm text-ink transition hover:text-[var(--primary)] focus:outline-none focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            title={item.name}
          >
            {item.name}
          </button>
        )}
      </div>

      {/* Badge */}
      {isDiscount ? (
        <span className="shrink-0 rounded-xs bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-red-600">
          DISC
        </span>
      ) : (
        <span />
      )}

      {/* Price */}
      <span
        className={[
          'shrink-0 font-mono text-sm font-medium tabular-nums',
          isDiscount ? 'text-red-600' : 'text-ink',
        ].join(' ')}
      >
        {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
      </span>

      {/* Remove */}
      <button
        onClick={onRemove}
        aria-label="Remove item"
        className="shrink-0 text-ink-3 opacity-0 transition hover:text-red-500 focus:outline-none focus-visible:opacity-100 group-hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

// ---- SplitTool -----------------------------------------------------------

type PageState = 'empty' | 'loaded'

const EMPTY_RECEIPT: ScannedReceipt = {
  store: 'Manual',
  items: [],
  subtotal: 0,
  gst: 0,
  total: 0,
  line_count: 0,
  warnings: [],
}

export default function SplitTool() {
  const [pageState, setPageState] = useState<PageState>('empty')
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null)
  const [items, setItems] = useState<EditableItem[]>([])
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const nextIdRef = useRef(0)

  function handleSuccess(data: ScannedReceipt) {
    setReceipt(data)
    setItems(data.items.map(it => ({ ...it, checked: true })))
    setPageState('loaded')
  }

  function handleAddManually() {
    setReceipt(EMPTY_RECEIPT)
    setItems([])
    setPageState('loaded')
  }

  function handleReset() {
    setReceipt(null)
    setItems([])
    setEditingIdx(null)
    setPageState('empty')
  }

  function toggleItem(idx: number) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, checked: !it.checked } : it))
  }

  function startEdit(idx: number, name: string) {
    setEditingIdx(idx)
    setDraft(name)
  }

  function commitEdit(idx: number) {
    const trimmed = draft.trim()
    setItems(prev =>
      prev.map((it, i) => i === idx ? { ...it, name: trimmed || it.name } : it),
    )
    setEditingIdx(null)
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  function addItem() {
    const newIdx = items.length
    nextIdRef.current += 1
    setItems(prev => [...prev, { name: 'New item', price: 0, type: 'item', checked: true }])
    setEditingIdx(newIdx)
    setDraft('New item')
  }

  const total = receipt?.total ?? 0

  return (
    <div className="min-h-screen bg-paper">

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur-md sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-display text-lg font-semibold text-ink focus:outline-none focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ background: 'var(--primary)' }}
          >
            S
          </span>
          SplitHaus
        </Link>

        <div className="flex items-center gap-2">
          {pageState === 'loaded' && (
            <button
              onClick={handleReset}
              className="rounded-xs border border-rule-strong px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              New receipt
            </button>
          )}
        </div>
      </nav>

      {/* Page body */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">
            Split a receipt
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Upload a receipt, tag who got what, share the result with your house.
          </p>
        </div>

        {/* STATE A - Empty */}
        {pageState === 'empty' && (
          <div className="mx-auto max-w-lg">
            <UploadZone onSuccess={handleSuccess} />
            <p className="mt-4 text-center text-sm text-ink-2">
              Or{' '}
              <button
                onClick={handleAddManually}
                className="font-medium underline underline-offset-2 transition hover:no-underline focus:outline-none"
                style={{ color: 'var(--primary)' }}
              >
                add expenses manually
              </button>
            </p>
          </div>
        )}

        {/* STATE C - Loaded */}
        {pageState === 'loaded' && receipt && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">

            {/* Left: items list */}
            <div>
              {/* Store + warnings */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="font-display text-lg font-semibold text-ink">
                  {receipt.store}
                </span>
                {receipt.warnings.map((w, i) => (
                  <span
                    key={i}
                    className="rounded-xs bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Items card */}
              <div className="overflow-hidden rounded-md border border-rule bg-card shadow-card">
                {items.length === 0 && (
                  <div className="py-12 text-center text-sm text-ink-2">
                    No items yet - add one below.
                  </div>
                )}

                {items.map((item, idx) => (
                  <ItemRow
                    key={idx}
                    item={item}
                    isEditing={editingIdx === idx}
                    draft={draft}
                    onToggle={() => toggleItem(idx)}
                    onEditStart={() => startEdit(idx, item.name)}
                    onDraftChange={setDraft}
                    onEditCommit={() => commitEdit(idx)}
                    onRemove={() => removeItem(idx)}
                  />
                ))}

                {/* Add item */}
                <div className={items.length > 0 ? 'border-t border-rule' : ''}>
                  <button
                    onClick={addItem}
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm text-ink-2 transition hover:bg-paper hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Add item manually
                  </button>
                </div>
              </div>

              {receipt.line_count > 0 && (
                <p className="mt-2 font-mono text-xs text-ink-3">
                  {receipt.line_count} lines parsed
                </p>
              )}
            </div>

            {/* Right: summary */}
            <div className="lg:sticky lg:top-[calc(3.5rem+1.25rem)]">
              <div className="rounded-md border border-rule bg-card p-5 shadow-card">
                <h3 className="mb-4 font-display text-base font-semibold text-ink">
                  Summary
                </h3>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-ink-2">
                    <span>Subtotal</span>
                    <span className="font-mono">${receipt.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-ink-2">
                    <span>GST</span>
                    <span className="font-mono">${receipt.gst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-rule pt-2 font-semibold text-ink">
                    <span>Total</span>
                    <span className="font-mono">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  className="mt-5 w-full rounded-xs py-2.5 text-sm font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                  style={{ background: 'var(--primary)' }}
                >
                  Start splitting
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
