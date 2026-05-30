import { useState } from 'react'
import type { ItemSplit, Person, ReceiptItem, SplitMode } from '@/types'
import SplitModePanel from './SplitModePanel'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function togglePerson(personId: string, split: ItemSplit, people: Person[]): ItemSplit {
  if (split.mode === 'proportion' || split.mode === 'custom') return split
  const allIds = people.map(p => p.id)
  let assigned: string[]

  if (split.mode === 'everyone') {
    assigned = allIds.filter(id => id !== personId)
  } else {
    const has = split.assignedTo.includes(personId)
    assigned = has
      ? split.assignedTo.filter(id => id !== personId)
      : [...split.assignedTo, personId]
    if (assigned.length === 0) return { ...split, mode: 'everyone', assignedTo: allIds }
  }

  const mode: SplitMode =
    assigned.length === allIds.length ? 'everyone'
    : assigned.length === 1 ? 'individual'
    : 'subset'
  return { ...split, mode, assignedTo: assigned, proportions: undefined, customAmounts: undefined }
}

function isAssigned(personId: string, split: ItemSplit): boolean {
  return split.mode === 'everyone' || split.assignedTo.includes(personId)
}

interface Props {
  item: ReceiptItem
  itemIndex: number
  people: Person[]
  split: ItemSplit
  onSplitChange: (itemIndex: number, split: ItemSplit) => void
}

export default function ItemSplitRow({ item, itemIndex, people, split, onSplitChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isDiscount = item.type === 'discount'

  const isCustomIncomplete = split.mode === 'custom' && (() => {
    const totalPrice = Math.abs(item.price)
    const assignedTotal = round(
      Object.values(split.customAmounts ?? {}).reduce((s, v) => s + Math.abs(v), 0)
    )
    return Math.abs(totalPrice - assignedTotal) >= 0.005
  })()

  function handleRowClick() {
    if (expanded && isCustomIncomplete) return
    setExpanded(e => !e)
  }

  return (
    <div className="border-b border-rule last:border-b-0">
      <div
        className="flex cursor-pointer items-center gap-2 px-4 py-3 transition hover:bg-paper"
        onClick={handleRowClick}
        role="button"
        aria-expanded={expanded}
      >
        {/* CHANGE 4: name first, then avatars, then price, then chevron */}
        <span className="min-w-0 flex-1 truncate text-sm text-ink" title={item.name}>
          {item.name}
        </span>

        {isDiscount && (
          <span className="shrink-0 rounded-xs bg-disc/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-disc">
            DISC
          </span>
        )}

        {/* Avatar group — right of name, overlapping rings */}
        <div className="flex shrink-0" onClick={e => e.stopPropagation()}>
          {people.map((person, idx) => (
            <button
              key={person.id}
              title={person.name}
              onClick={() => onSplitChange(itemIndex, togglePerson(person.id, split, people))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ring-1 ring-card transition-opacity focus:outline-none"
              style={{
                background: person.color,
                opacity: isAssigned(person.id, split) ? 1 : 0.25,
                marginLeft: idx > 0 ? '-4px' : undefined,
                zIndex: idx,
                position: 'relative',
              }}
            >
              {person.initial}
            </button>
          ))}
        </div>

        <span className={['shrink-0 font-mono text-sm font-medium tabular-nums', isDiscount ? 'text-disc' : 'text-ink'].join(' ')}>
          {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
        </span>

        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          className={['shrink-0 text-ink-3 transition-transform', isCustomIncomplete ? 'text-amber-500' : ''].join(' ')}
          style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {expanded && (
        <SplitModePanel
          item={item} itemIndex={itemIndex} people={people}
          split={split} onSplitChange={onSplitChange}
        />
      )}
    </div>
  )
}
