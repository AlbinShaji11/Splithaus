import { useState } from 'react'
import type { ItemSplit, Person, ReceiptItem, SplitMode } from '@/types'
import SplitModePanel from './SplitModePanel'

const AVATAR_SIZE = 28   // px
const AVATAR_GAP = 4     // px between avatars

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

  // Avatar group width: each avatar is AVATAR_SIZE px, with AVATAR_GAP px between them
  const avatarGroupWidth = people.length * AVATAR_SIZE + Math.max(0, people.length - 1) * AVATAR_GAP

  return (
    <div className="border-b border-rule last:border-b-0">
      {/* CSS grid row: name (1fr) | avatars (fixed) | price (64px) | chevron (24px) */}
      <div
        className="cursor-pointer px-4 py-3 transition hover:bg-paper"
        style={{
          display: 'grid',
          gridTemplateColumns: `1fr ${avatarGroupWidth}px 64px 24px`,
          columnGap: '8px',
          alignItems: 'center',
        }}
        onClick={handleRowClick}
        role="button"
        aria-expanded={expanded}
      >
        {/* Name — DISC badge inline before the text so it never clips the badge */}
        <span className="flex min-w-0 items-center gap-1.5" title={item.name}>
          {isDiscount && (
            <span className="shrink-0 rounded-xs bg-disc/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-disc">
              DISC
            </span>
          )}
          <span className="truncate text-sm text-ink">{item.name}</span>
        </span>

        {/* Avatar group — no overlap, uniform gap, individually tappable */}
        <div
          className="flex items-center"
          style={{ gap: `${AVATAR_GAP}px` }}
          onClick={e => e.stopPropagation()}
        >
          {people.map(person => (
            <button
              key={person.id}
              title={person.name}
              onClick={() => onSplitChange(itemIndex, togglePerson(person.id, split, people))}
              className="shrink-0 items-center justify-center rounded-full font-bold text-white focus:outline-none"
              style={{
                display: 'flex',
                width: `${AVATAR_SIZE}px`,
                height: `${AVATAR_SIZE}px`,
                fontSize: '11px',
                background: person.color,
                opacity: isAssigned(person.id, split) ? 1 : 0.25,
              }}
            >
              {person.initial}
            </button>
          ))}
        </div>

        {/* Price */}
        <span className={[
          'text-right font-mono text-sm font-medium tabular-nums',
          isDiscount ? 'text-disc' : 'text-ink',
        ].join(' ')}>
          {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
        </span>

        {/* Chevron */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          className={['text-ink-3', isCustomIncomplete ? 'text-amber-500' : ''].join(' ')}
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
