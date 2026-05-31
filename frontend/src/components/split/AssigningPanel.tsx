import type { ItemSplit, Person, ReceiptItem } from '@/types'
import ItemSplitRow from './ItemSplitRow'
import PersonTotalBar from './PersonTotalBar'

interface Props {
  items: ReceiptItem[]
  people: Person[]
  splits: ItemSplit[]
  paidById: string | null
  liveRawTotals: Record<string, number>
  canCalculate: boolean
  onSplitChange: (itemIndex: number, split: ItemSplit) => void
  onPaidByChange: (personId: string) => void
  onCalculate: () => void
}

export default function AssigningPanel({
  items, people, splits, paidById, liveRawTotals,
  canCalculate, onSplitChange, onPaidByChange, onCalculate,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="min-w-0 overflow-hidden rounded-md border border-rule bg-card shadow-card">
        {items.map((item, idx) => (
          <ItemSplitRow key={idx} item={item} itemIndex={idx} people={people}
            split={splits[idx] ?? { itemIndex: idx, mode: 'everyone', assignedTo: [] }}
            onSplitChange={onSplitChange}
          />
        ))}
      </div>
      <div className="space-y-4 lg:sticky lg:top-[calc(3.5rem+1.25rem)]">
        <PersonTotalBar people={people} totals={liveRawTotals} paidById={paidById} onPaidByChange={onPaidByChange} />
        <button onClick={onCalculate} disabled={!canCalculate}
          className="w-full rounded-xs bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
          Calculate settlements
        </button>
      </div>
    </div>
  )
}
