import type { Person } from '@/types'

interface Props {
  people: Person[]
  totals: Record<string, number>
  paidById: string | null
  onPaidByChange: (personId: string) => void
}

export default function PersonTotalBar({ people, totals, paidById, onPaidByChange }: Props) {
  return (
    <div className="rounded-md border border-rule bg-card shadow-card">
      <div className="px-4 pt-4 pb-3">
        <h3 className="mb-3 font-display text-sm font-semibold text-ink">Running totals</h3>
        <div className="space-y-2">
          {people.map(person => {
            const amount = totals[person.id] ?? 0
            const isPaid = paidById === person.id
            return (
              <div key={person.id} className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: person.color }}
                >
                  {person.initial}
                </div>
                <span className="flex-1 truncate text-sm text-ink">{person.name}</span>
                {isPaid && (
                  <span className="shrink-0 rounded-xs bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                    paid
                  </span>
                )}
                <span className={['shrink-0 font-mono text-sm tabular-nums', amount < 0 ? 'text-green-700' : 'text-ink'].join(' ')}>
                  {amount < 0 ? '-' : ''}${Math.abs(amount).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-rule px-4 py-3">
        <p className="mb-2 text-xs font-medium text-ink-2">Who paid the receipt?</p>
        <div className="flex flex-wrap gap-2">
          {people.map(person => (
            <button
              key={person.id}
              onClick={() => onPaidByChange(person.id)}
              title={`${person.name} paid`}
              className={[
                'flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white transition focus:outline-none',
                paidById === person.id
                  ? 'ring-2 ring-offset-2 ring-ink/30'
                  : 'opacity-60 hover:opacity-100',
              ].join(' ')}
              style={{ background: person.color }}
            >
              {person.initial}
            </button>
          ))}
        </div>
        {paidById === null && (
          <p className="mt-2 text-xs text-amber-600">Select who paid to calculate settlements</p>
        )}
      </div>
    </div>
  )
}
