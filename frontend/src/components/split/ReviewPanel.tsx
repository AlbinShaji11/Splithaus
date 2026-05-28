import { useState } from 'react'
import type { ReceiptItem, ScannedReceipt } from '@/types'

interface ItemRowProps {
  item: ReceiptItem
  isEditing: boolean
  draft: string
  onEditStart: () => void
  onDraftChange: (v: string) => void
  onEditCommit: () => void
  onRemove: () => void
}

function ItemRow({ item, isEditing, draft, onEditStart, onDraftChange, onEditCommit, onRemove }: ItemRowProps) {
  const isDiscount = item.type === 'discount'
  return (
    <div className="group grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
      <div className="min-w-0">
        {isEditing ? (
          <input autoFocus value={draft} maxLength={100}
            onChange={e => onDraftChange(e.target.value)}
            onBlur={onEditCommit}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onEditCommit() }}
            className="w-full rounded-xs border border-rule-strong bg-transparent px-2 py-0.5 text-sm text-ink outline-none focus:border-accent" />
        ) : (
          <button onClick={onEditStart} className="block w-full truncate text-left text-sm text-ink transition hover:text-accent focus:outline-none">
            {item.name}
          </button>
        )}
      </div>
      {isDiscount
        ? <span className="shrink-0 rounded-xs bg-disc/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-disc">DISC</span>
        : <span />}
      <span className={['shrink-0 font-mono text-sm tabular-nums', isDiscount ? 'text-disc' : 'text-ink'].join(' ')}>
        {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
      </span>
      <button onClick={onRemove} aria-label="Remove" className="shrink-0 text-ink-3 opacity-0 transition hover:text-red-500 focus:outline-none group-hover:opacity-100">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

interface AddFormProps {
  onAdd: (name: string, price: number, type: 'item' | 'discount') => void
  onCancel: () => void
  hasBorder: boolean
}

function AddForm({ onAdd, onCancel, hasBorder }: AddFormProps) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [type, setType] = useState<'item' | 'discount'>('item')

  const priceNum = parseFloat(price)
  const nameErr = name.length > 100 ? 'Max 100 characters' : ''
  const priceErr = price && !isNaN(priceNum)
    ? (type === 'item' && (priceNum <= 0 || priceNum > 100000)) ? 'Must be 0.01 – 100,000'
    : (type === 'discount' && (priceNum <= 0 || priceNum > 100000)) ? 'Enter the positive amount'
    : ''
    : ''
  const canAdd = name.trim().length > 0 && name.length <= 100 && price !== '' && !isNaN(priceNum) && priceNum > 0 && priceNum <= 100000 && !nameErr

  function submit() {
    if (!canAdd) return
    const finalPrice = type === 'discount' ? -Math.abs(priceNum) : Math.abs(priceNum)
    onAdd(name.trim(), finalPrice, type)
  }

  return (
    <div className={['p-4 space-y-3', hasBorder ? 'border-t border-rule' : ''].join(' ')}>
      <div>
        <input autoFocus placeholder="Item name" value={name} maxLength={100}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full rounded-xs border border-rule bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent" />
        {nameErr && <p className="mt-1 text-xs text-red-500">{nameErr}</p>}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <input type="number" placeholder="0.00" step="0.01" min="0.01"
            value={price} onChange={e => setPrice(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full rounded-xs border border-rule bg-transparent px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent" />
          {priceErr && <p className="mt-1 text-xs text-red-500">{priceErr}</p>}
        </div>
        <div className="flex overflow-hidden rounded-xs border border-rule text-sm">
          {(['item', 'discount'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={['px-3 py-2 font-medium transition focus:outline-none', type === t ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'].join(' ')}>
              {t === 'item' ? 'Item' : 'Discount'}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel}
          className="flex-1 rounded-xs border border-rule-strong py-2 text-sm font-medium text-ink-2 transition hover:text-ink focus:outline-none">
          Cancel
        </button>
        <button onClick={submit} disabled={!canAdd}
          className="flex-1 rounded-xs bg-accent py-2 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
          Add
        </button>
      </div>
    </div>
  )
}

interface Props {
  receipt: ScannedReceipt
  items: ReceiptItem[]
  onItemsChange: (items: ReceiptItem[]) => void
  onStartSplitting: () => void
}

export default function ReviewPanel({ receipt, items, onItemsChange, onStartSplitting }: Props) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [showForm, setShowForm] = useState(false)

  const subtotal = items.filter(i => i.type === 'item').reduce((s, i) => s + i.price, 0)
  const discounts = items.filter(i => i.type === 'discount').reduce((s, i) => s + i.price, 0)
  const net = Math.round((subtotal + discounts) * 100) / 100

  function commitEdit(idx: number) {
    const trimmed = draft.trim()
    onItemsChange(items.map((it, i) => i === idx ? { ...it, name: trimmed || it.name } : it))
    setEditingIdx(null)
  }

  function remove(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx))
    if (editingIdx === idx) setEditingIdx(null)
  }

  function handleAdd(name: string, price: number, type: 'item' | 'discount') {
    onItemsChange([...items, { name, price, type }])
    setShowForm(false)
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-display text-lg font-semibold text-ink">{receipt.store}</span>
          {receipt.warnings.map((w, i) => (
            <span key={i} className="rounded-xs bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{w}</span>
          ))}
        </div>

        <div className="overflow-hidden rounded-md border border-rule bg-card shadow-card">
          {items.length === 0 && !showForm && (
            <div className="py-12 text-center text-sm text-ink-2">No items yet — add one below.</div>
          )}
          {items.map((item, idx) => (
            <ItemRow key={idx} item={item}
              isEditing={editingIdx === idx} draft={draft}
              onEditStart={() => { setEditingIdx(idx); setDraft(item.name) }}
              onDraftChange={setDraft}
              onEditCommit={() => commitEdit(idx)}
              onRemove={() => remove(idx)}
            />
          ))}

          {showForm
            ? <AddForm onAdd={handleAdd} onCancel={() => setShowForm(false)} hasBorder={items.length > 0} />
            : (
              <div className={items.length > 0 ? 'border-t border-rule' : ''}>
                <button onClick={() => setShowForm(true)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm text-ink-2 transition hover:bg-paper hover:text-ink focus:outline-none">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Add item manually
                </button>
              </div>
            )
          }
        </div>
      </div>

      <div className="lg:sticky lg:top-[calc(3.5rem+1.25rem)]">
        <div className="rounded-md border border-rule bg-card p-5 shadow-card">
          <h3 className="mb-4 font-display text-base font-semibold text-ink">Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-ink-2">
              <span>Items subtotal</span>
              <span className="font-mono">${subtotal.toFixed(2)}</span>
            </div>
            {discounts !== 0 && (
              <div className="flex justify-between text-disc">
                <span>Discounts</span>
                <span className="font-mono">-${Math.abs(discounts).toFixed(2)}</span>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-rule pt-2 font-semibold text-ink">
              <span>Net total</span>
              <span className="font-mono">${net.toFixed(2)}</span>
            </div>
          </div>
          <button onClick={onStartSplitting} disabled={items.length === 0}
            className="mt-5 w-full rounded-xs bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
            Start splitting
          </button>
        </div>
      </div>
    </div>
  )
}
