import { useState } from 'react'
import type { ReceiptItem, ScannedReceipt } from '@/types'
import ReceiptPreviewPanel from './ReceiptPreviewPanel'

interface ItemFormProps {
  mode: 'add' | 'edit'
  initialName?: string
  initialPrice?: string
  initialType?: 'item' | 'discount'
  onSubmit: (name: string, price: number, type: 'item' | 'discount') => void
  onCancel: () => void
  hasBorder?: boolean
}

function filterPriceKey(e: React.KeyboardEvent<HTMLInputElement>) {
  const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End', 'Enter']
  if (nav.includes(e.key) || /^\d$/.test(e.key)) return
  if (e.key === '.' && !e.currentTarget.value.includes('.')) return
  e.preventDefault()
}

function formatPriceOnBlur(raw: string): string {
  const v = parseFloat(raw)
  return isNaN(v) ? '0.00' : v.toFixed(2)
}

function ItemForm({
  mode, initialName = '', initialPrice = '', initialType = 'item',
  onSubmit, onCancel, hasBorder,
}: ItemFormProps) {
  const [name, setName] = useState(initialName)
  const [price, setPrice] = useState(initialPrice)
  const [type, setType] = useState<'item' | 'discount'>(initialType)

  const priceNum = parseFloat(price)
  const nameErr = name.length > 100 ? 'Max 100 characters' : ''
  const priceErr = price && !isNaN(priceNum)
    ? (priceNum <= 0 || priceNum > 100000) ? 'Must be 0.01 – 100,000' : ''
    : ''
  const canSubmit = name.trim().length > 0 && name.length <= 100
    && price !== '' && !isNaN(priceNum) && priceNum > 0 && priceNum <= 100000 && !nameErr

  function submit() {
    if (!canSubmit) return
    const finalPrice = type === 'discount' ? -Math.abs(priceNum) : Math.abs(priceNum)
    onSubmit(name.trim(), finalPrice, type)
  }

  return (
    <div className={['p-4 space-y-3', hasBorder ? 'border-t border-rule' : ''].join(' ')}>
      <div>
        <input
          autoFocus placeholder="Item name" value={name} maxLength={100}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          className="w-full rounded-xs border border-rule bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent"
        />
        {nameErr && <p className="mt-1 text-xs text-red-500">{nameErr}</p>}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="text" inputMode="decimal" placeholder="0.00"
            value={price}
            onChange={e => setPrice(e.target.value)}
            onKeyDown={e => { filterPriceKey(e); if (e.key === 'Enter') submit() }}
            onFocus={e => e.target.select()}
            onBlur={e => setPrice(formatPriceOnBlur(e.target.value))}
            className="w-full rounded-xs border border-rule bg-transparent px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent"
          />
          {priceErr && <p className="mt-1 text-xs text-red-500">{priceErr}</p>}
        </div>
        <div className="flex overflow-hidden rounded-xs border border-rule text-sm">
          {(['item', 'discount'] as const).map(t => (
            <button key={t} onClick={() => setType(t)}
              className={['px-3 py-2 font-medium transition focus:outline-none',
                type === t ? 'bg-accent text-white' : 'text-ink-2 hover:text-ink'].join(' ')}>
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
        <button onClick={submit} disabled={!canSubmit}
          className="flex-1 rounded-xs bg-accent py-2 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
          {mode === 'edit' ? 'Save' : 'Add'}
        </button>
      </div>
    </div>
  )
}

interface ItemRowProps {
  item: ReceiptItem
  onEditOpen: () => void
  onRemove: () => void
}

function ItemRow({ item, onEditOpen, onRemove }: ItemRowProps) {
  const isDiscount = item.type === 'discount'
  return (
    <div className="group grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 border-b border-rule px-4 py-3 last:border-b-0">
      <div className="min-w-0 truncate text-sm text-ink" title={item.name}>{item.name}</div>
      {isDiscount
        ? <span className="shrink-0 rounded-xs bg-disc/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-disc">DISC</span>
        : <span />}
      <span className={['shrink-0 font-mono text-sm tabular-nums', isDiscount ? 'text-disc' : 'text-ink'].join(' ')}>
        {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
      </span>
      <button onClick={onEditOpen} aria-label="Edit item"
        className="shrink-0 text-ink-3 opacity-0 transition hover:text-accent focus:outline-none group-hover:opacity-100">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button onClick={onRemove} aria-label="Remove item"
        className="shrink-0 text-ink-3 opacity-0 transition hover:text-red-500 focus:outline-none group-hover:opacity-100">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  )
}

interface Props {
  receipt: ScannedReceipt
  items: ReceiptItem[]
  onItemsChange: (items: ReceiptItem[]) => void
  onStartSplitting: () => void
  uploadedFile?: File | null
  previewText?: string | null
}

export default function ReviewPanel({ receipt, items, onItemsChange, onStartSplitting, uploadedFile, previewText }: Props) {
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const subtotal = items.filter(i => i.type === 'item').reduce((s, i) => s + i.price, 0)
  const discounts = items.filter(i => i.type === 'discount').reduce((s, i) => s + i.price, 0)
  const net = Math.round((subtotal + discounts) * 100) / 100

  function handleEditOpen(idx: number) {
    setEditingItemIdx(idx)
    setShowAddForm(false)
  }

  function handleEditSave(idx: number, name: string, price: number, type: 'item' | 'discount') {
    onItemsChange(items.map((it, i) => i === idx ? { name, price, type } : it))
    setEditingItemIdx(null)
  }

  function remove(idx: number) {
    onItemsChange(items.filter((_, i) => i !== idx))
    setEditingItemIdx(null)
  }

  function handleAdd(name: string, price: number, type: 'item' | 'discount') {
    onItemsChange([...items, { name, price, type }])
    setShowAddForm(false)
  }

  function handleShowAddForm() {
    setShowAddForm(true)
    setEditingItemIdx(null)
  }

  const hasPreview = !!(uploadedFile || previewText)
  const fileName = uploadedFile?.name ?? ''

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] lg:items-start">
      <div>
        {/* Mobile-only: collapsible preview above the items list */}
        {hasPreview && (
          <div className="mb-4 lg:hidden">
            <ReceiptPreviewPanel
              file={uploadedFile ?? null}
              previewText={previewText ?? null}
              store={receipt.store}
              fileName={fileName}
              collapsible
            />
          </div>
        )}

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="font-display text-lg font-semibold text-ink">{receipt.store}</span>
          {receipt.warnings.map((w, i) => (
            <span key={i} className="rounded-xs bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{w}</span>
          ))}
        </div>

        <div className="overflow-hidden rounded-md border border-rule bg-card shadow-card">
          {items.length === 0 && !showAddForm && (
            <div className="py-12 text-center text-sm text-ink-2">No items yet — add one below.</div>
          )}
          {items.map((item, idx) =>
            editingItemIdx === idx ? (
              <div key={idx} className="border-b border-rule last:border-b-0">
                <ItemForm
                  mode="edit"
                  initialName={item.name}
                  initialPrice={Math.abs(item.price).toFixed(2)}
                  initialType={item.type}
                  onSubmit={(name, price, type) => handleEditSave(idx, name, price, type)}
                  onCancel={() => setEditingItemIdx(null)}
                />
              </div>
            ) : (
              <ItemRow key={idx} item={item}
                onEditOpen={() => handleEditOpen(idx)}
                onRemove={() => remove(idx)}
              />
            )
          )}

          {showAddForm
            ? (
              <ItemForm
                mode="add"
                onSubmit={handleAdd}
                onCancel={() => setShowAddForm(false)}
                hasBorder={items.length > 0}
              />
            ) : (
              <div className={items.length > 0 ? 'border-t border-rule' : ''}>
                <button onClick={handleShowAddForm}
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

      <div className="lg:sticky lg:top-[calc(3.5rem+1.25rem)] flex flex-col gap-4">
        {/* Desktop-only: preview panel above summary */}
        {hasPreview && (
          <div className="hidden lg:block">
            <ReceiptPreviewPanel
              file={uploadedFile ?? null}
              previewText={previewText ?? null}
              store={receipt.store}
              fileName={fileName}
            />
          </div>
        )}

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
