import { useState, useEffect } from 'react'
import type { ItemSplit, Person, ProportionShare, ReceiptItem, SplitMode } from '@/types'
import { calcSingleItemShares } from '@/utils/balanceCalculator'

function round(n: number): number {
  return Math.round(n * 100) / 100
}


interface CustomAmountInputProps {
  value: number
  onChange: (v: number) => void
  className?: string
  placeholder?: string
}

function CustomAmountInput({ value, onChange, className, placeholder }: CustomAmountInputProps) {
  const [raw, setRaw] = useState(() => value > 0 ? value.toFixed(2) : '')

  useEffect(() => {
    setRaw(value > 0 ? value.toFixed(2) : '')
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const nav = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']
    if (nav.includes(e.key) || /^\d$/.test(e.key)) return
    if (e.key === '.' && !e.currentTarget.value.includes('.')) return
    e.preventDefault()
  }

  function handleBlur() {
    const v = parseFloat(raw)
    const num = isNaN(v) || v < 0 ? 0 : v
    setRaw(num === 0 ? '0.00' : num.toFixed(2))
    onChange(num)
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      placeholder={placeholder}
      onChange={e => setRaw(e.target.value)}
      onKeyDown={handleKeyDown}
      onFocus={e => e.target.select()}
      onBlur={handleBlur}
      className={className}
    />
  )
}


const MODES: { mode: SplitMode; label: string }[] = [
  { mode: 'everyone', label: 'Everyone equally' },
  { mode: 'individual', label: 'One person' },
  { mode: 'subset', label: 'Multiple' },
  { mode: 'proportion', label: 'Proportion' },
  { mode: 'custom', label: 'Custom $' },
]

interface Props {
  item: ReceiptItem
  itemIndex: number
  people: Person[]
  split: ItemSplit
  onSplitChange: (idx: number, split: ItemSplit) => void
}

export default function SplitModePanel({ item, itemIndex, people, split, onSplitChange }: Props) {
  const shares = calcSingleItemShares(item.price, split, people)
  const allIds = people.map(p => p.id)
  const isDiscount = item.price < 0

  function setMode(mode: SplitMode) {
    const proportions: ProportionShare[] = people.map(p => ({ personId: p.id, ratio: 1 }))
    // "Multiple" starts with nobody — user taps to include people
    const assignedTo = mode === 'individual' ? [allIds[0]] : mode === 'subset' ? [] : allIds
    const customAmounts: Record<string, number> = mode === 'custom'
      ? Object.fromEntries(people.map(p => [p.id, 0]))
      : {}
    onSplitChange(itemIndex, {
      itemIndex, mode, assignedTo,
      proportions: mode === 'proportion' ? proportions : undefined,
      customAmounts: mode === 'custom' ? customAmounts : undefined,
    })
  }

  function toggleAssigned(personId: string) {
    const next = split.assignedTo.includes(personId)
      ? split.assignedTo.filter(id => id !== personId)
      : [...split.assignedTo, personId]
    // Allow empty selection — ItemSplitRow will block collapsing until ≥1 selected
    onSplitChange(itemIndex, { ...split, assignedTo: next })
  }

  function setRatio(personId: string, ratio: number) {
    const base = split.proportions ?? people.map(p => ({ personId: p.id, ratio: 1 }))
    onSplitChange(itemIndex, {
      ...split,
      proportions: base.map(p => p.personId === personId ? { ...p, ratio } : p),
    })
  }

  function setCustomAmount(personId: string, inputValue: number) {
    const stored = isDiscount ? -Math.abs(inputValue) : Math.abs(inputValue)
    const base = split.customAmounts ?? Object.fromEntries(people.map(p => [p.id, 0]))
    onSplitChange(itemIndex, { ...split, customAmounts: { ...base, [personId]: stored } })
  }

  const totalPrice = Math.abs(item.price)
  const assignedTotal = round(
    Object.values(split.customAmounts ?? {}).reduce((s, v) => s + Math.abs(v), 0)
  )
  const remaining = round(totalPrice - assignedTotal)
  const isFullyAssigned = Math.abs(remaining) < 0.005
  const isOver = remaining < -0.005

  return (
    <div className="border-t border-rule bg-paper px-4 py-3 space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setMode(mode)}
            className={[
              'rounded-xs px-3 py-1.5 text-xs font-medium transition focus:outline-none',
              split.mode === mode
                ? 'bg-accent text-white'
                : 'border border-rule-strong text-ink-2 hover:border-accent hover:text-accent',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {split.mode === 'everyone' && (
        <div className="flex flex-wrap gap-2">
          {people.map(p => (
            <span key={p.id} className="flex items-center gap-1 font-mono text-xs text-ink-3">
              <span style={{ color: p.color }}>{p.initial}</span>
              {(shares[p.id] ?? 0) < 0 ? '-' : ''}${Math.abs(shares[p.id] ?? 0).toFixed(2)}
            </span>
          ))}
        </div>
      )}

      {(split.mode === 'individual' || split.mode === 'subset') && (
        <div className="flex flex-wrap gap-2">
          {people.map(person => {
            const isOn = split.assignedTo.includes(person.id)
            return (
              <button
                key={person.id}
                onClick={() =>
                  split.mode === 'individual'
                    ? onSplitChange(itemIndex, { ...split, assignedTo: [person.id] })
                    : toggleAssigned(person.id)
                }
                className={[
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition focus:outline-none',
                  isOn ? 'text-white' : 'border border-rule-strong text-ink-2 hover:border-rule',
                ].join(' ')}
                style={isOn ? { background: person.color } : {}}
              >
                <span
                  className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ background: person.color }}
                >
                  {person.initial}
                </span>
                {person.name}
                {isOn && <span className="font-mono">{(shares[person.id] ?? 0) < 0 ? '-' : ''}${Math.abs(shares[person.id] ?? 0).toFixed(2)}</span>}
              </button>
            )
          })}
          {split.mode === 'subset' && split.assignedTo.length === 0 && (
            <p className="w-full text-xs text-amber-600">Select at least one person to continue.</p>
          )}
        </div>
      )}

      {split.mode === 'proportion' && (
        <div className="space-y-2">
          {people.map(person => {
            const ratio = split.proportions?.find(p => p.personId === person.id)?.ratio ?? 1
            return (
              <div key={person.id} className="flex items-center gap-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: person.color }}
                >
                  {person.initial}
                </span>
                <span className="w-20 truncate text-sm text-ink">{person.name}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={ratio}
                  onChange={e => setRatio(person.id, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                  className="w-16 rounded-xs border border-rule bg-transparent px-2 py-1 font-mono text-sm text-ink outline-none focus:border-accent"
                />
                <span className="font-mono text-sm text-ink-2">
                  {(shares[person.id] ?? 0) < 0 ? '-' : ''}${Math.abs(shares[person.id] ?? 0).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {split.mode === 'custom' && (
        <div className="space-y-2">
          {isDiscount && (
            <p className="text-xs text-ink-2">
              Discount total: ${totalPrice.toFixed(2)} - assign each person's share below.
            </p>
          )}
          {people.map(person => {
            const stored = Math.abs(split.customAmounts?.[person.id] ?? 0)
            return (
              <div key={person.id} className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: person.color }}
                >
                  {person.initial}
                </span>
                <span className="w-20 min-w-0 truncate text-sm text-ink">{person.name}</span>
                <span className="text-sm text-ink-3">$</span>
                <CustomAmountInput
                  value={stored}
                  onChange={v => setCustomAmount(person.id, v)}
                  placeholder="0.00"
                  className="w-24 rounded-xs border border-rule bg-transparent px-2 py-1 font-mono text-sm text-ink outline-none focus:border-accent"
                />
              </div>
            )
          })}

          <div className={[
            'rounded-xs px-3 py-2 text-xs font-mono font-medium',
            isFullyAssigned
              ? 'bg-green-50 text-green-700'
              : isOver
              ? 'bg-red-50 text-red-700'
              : 'bg-ink/5 text-ink-2',
          ].join(' ')}>
            {isFullyAssigned
              ? `Done - Fully assigned ($${totalPrice.toFixed(2)})`
              : isOver
              ? `Over by $${Math.abs(remaining).toFixed(2)} - reduce someone's amount`
              : `$${remaining.toFixed(2)} remaining to assign`}
          </div>

          {!isFullyAssigned && (
            <p className="text-xs text-red-500">
              All ${totalPrice.toFixed(2)} must be assigned before collapsing this item.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
