import { useState } from 'react'
import type { ItemSplit, Person, ReceiptItem, SplitMode } from '@/types'
import SplitModePanel from './SplitModePanel'

const AVATAR_SIZE = 28  // px
const AVATAR_GAP = 3    // px between avatars
const WRAP_AT = 7       // people count at which avatars wrap to two rows
const ROW_SIZE = 8      // max avatars per row in two-row mode

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

  const isTwoRow = people.length >= WRAP_AT
  // Width fits min(n, ROW_SIZE) avatars in a row; avatars wrap naturally at container boundary
  const avatarGroupWidth = Math.min(people.length, ROW_SIZE) * (AVATAR_SIZE + AVATAR_GAP) - AVATAR_GAP

  return (
    <div className="border-b border-rule last:border-b-0">
      {/* CSS grid: name (1fr) | avatars (auto) | price (64px) | chevron (24px) */}
      <div
        className={[
          'group cursor-pointer px-4 py-3 transition-all duration-150 ease-in-out',
          'hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
          expanded ? 'bg-paper' : 'hover:bg-paper',
        ].join(' ')}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(200px, 1fr) auto 64px 24px',
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

        {/* Avatar group — single row for ≤6, two-row wrap for 7–15 */}
        <div
          style={{
            display: 'flex',
            flexWrap: isTwoRow ? 'wrap' : 'nowrap',
            gap: `${AVATAR_GAP}px`,
            width: isTwoRow ? `${avatarGroupWidth}px` : undefined,
            height: isTwoRow ? '64px' : undefined,
            alignContent: isTwoRow ? 'flex-start' : undefined,
            overflow: 'visible',
          }}
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
                fontSize: '10px',
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

        {/* Chevron — rotates on expand, translates right on row hover */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
          className={[
            'transition-all duration-150',
            expanded ? 'rotate-180' : '',
            'group-hover:translate-x-0.5',
            isCustomIncomplete ? 'text-amber-500' : 'text-ink-3 group-hover:opacity-80',
          ].join(' ')}
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
