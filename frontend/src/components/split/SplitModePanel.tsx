import type { ItemSplit, Person, ProportionShare, ReceiptItem, SplitMode } from '@/types'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

function calcShares(price: number, split: ItemSplit, people: Person[]): Record<string, number> {
  const result: Record<string, number> = {}
  people.forEach(p => { result[p.id] = 0 })

  if (split.mode === 'everyone') {
    const share = round(price / people.length)
    people.forEach(p => { result[p.id] = share })
  } else if (split.mode === 'individual') {
    const id = split.assignedTo[0]
    if (id) result[id] = round(price)
  } else if (split.mode === 'subset') {
    const n = split.assignedTo.length
    if (n > 0) {
      const share = round(price / n)
      split.assignedTo.forEach(id => { result[id] = share })
    }
  } else if (split.mode === 'proportion' && split.proportions) {
    const total = split.proportions.reduce((s, p) => s + p.ratio, 0)
    if (total > 0) {
      split.proportions.forEach(({ personId, ratio }) => {
        result[personId] = round(price * (ratio / total))
      })
    }
  }
  return result
}

const MODES: { mode: SplitMode; label: string }[] = [
  { mode: 'everyone', label: 'Everyone equally' },
  { mode: 'individual', label: 'One person' },
  { mode: 'subset', label: 'Multiple' },
  { mode: 'proportion', label: 'Proportion' },
]

interface Props {
  item: ReceiptItem
  itemIndex: number
  people: Person[]
  split: ItemSplit
  onSplitChange: (idx: number, split: ItemSplit) => void
}

export default function SplitModePanel({ item, itemIndex, people, split, onSplitChange }: Props) {
  const shares = calcShares(item.price, split, people)
  const allIds = people.map(p => p.id)

  function setMode(mode: SplitMode) {
    const proportions: ProportionShare[] = people.map(p => ({ personId: p.id, ratio: 1 }))
    const assignedTo = mode === 'individual' ? [allIds[0]] : allIds
    onSplitChange(itemIndex, {
      itemIndex, mode, assignedTo,
      proportions: mode === 'proportion' ? proportions : undefined,
    })
  }

  function toggleAssigned(personId: string) {
    const next = split.assignedTo.includes(personId)
      ? split.assignedTo.filter(id => id !== personId)
      : [...split.assignedTo, personId]
    onSplitChange(itemIndex, { ...split, assignedTo: next.length === 0 ? [personId] : next })
  }

  function setRatio(personId: string, ratio: number) {
    const base = split.proportions ?? people.map(p => ({ personId: p.id, ratio: 1 }))
    onSplitChange(itemIndex, {
      ...split,
      proportions: base.map(p => p.personId === personId ? { ...p, ratio } : p),
    })
  }

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
              ${(shares[p.id] ?? 0).toFixed(2)}
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
                {isOn && <span className="font-mono">${(shares[person.id] ?? 0).toFixed(2)}</span>}
              </button>
            )
          })}
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
    </div>
  )
}
