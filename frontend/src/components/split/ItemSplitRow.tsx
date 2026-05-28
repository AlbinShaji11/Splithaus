import { useState } from 'react'
import type { ItemSplit, Person, ReceiptItem, SplitMode } from '@/types'
import SplitModePanel from './SplitModePanel'

function togglePerson(personId: string, split: ItemSplit, people: Person[]): ItemSplit {
  if (split.mode === 'proportion') return split

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

  return { ...split, mode, assignedTo: assigned, proportions: undefined }
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

  return (
    <div className="border-b border-rule last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex shrink-0 gap-1">
          {people.map(person => (
            <button
              key={person.id}
              title={person.name}
              onClick={() => onSplitChange(itemIndex, togglePerson(person.id, split, people))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white transition-opacity focus:outline-none"
              style={{
                background: person.color,
                opacity: isAssigned(person.id, split) ? 1 : 0.25,
              }}
            >
              {person.initial}
            </button>
          ))}
        </div>

        <span className="flex-1 truncate text-sm text-ink" title={item.name}>
          {item.name}
        </span>

        {isDiscount && (
          <span className="shrink-0 rounded-xs bg-red-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-red-600">
            DISC
          </span>
        )}

        <span
          className={[
            'shrink-0 font-mono text-sm font-medium tabular-nums',
            isDiscount ? 'text-red-600' : 'text-ink',
          ].join(' ')}
        >
          {isDiscount && item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
        </span>

        <button
          onClick={() => setExpanded(e => !e)}
          aria-label="Toggle split detail"
          className="shrink-0 text-ink-3 transition hover:text-ink focus:outline-none"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {expanded && (
        <SplitModePanel
          item={item}
          itemIndex={itemIndex}
          people={people}
          split={split}
          onSplitChange={onSplitChange}
        />
      )}
    </div>
  )
}
