import { useState } from 'react'
import type { ItemSplit, Person, ReceiptItem, ScannedReceipt, Settlement } from '@/types'
import { generateShareText, calculatePersonTotals } from '@/utils/balanceCalculator'
import PrintContent from './PrintContent'

interface Props {
  settlements: Settlement[]
  receipt: ScannedReceipt
  items: ReceiptItem[]
  splits: ItemSplit[]
  people: Person[]
  onBack: () => void
  onReset: () => void
}

export default function SettlementScreen({ settlements, receipt, items, splits, people, onBack, onReset }: Props) {
  const [copied, setCopied] = useState(false)
  const personById = Object.fromEntries(people.map(p => [p.id, p]))

  const rawTotals = calculatePersonTotals(items, splits, people, null, receipt.store)
  const billTotal = Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100

  function handleCopy() {
    const text = generateShareText(settlements, receipt.store, items, splits, people)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="mx-auto max-w-lg">
      <button onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink focus:outline-none">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to assignments
      </button>

      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">
          Here's who owes what
        </h1>
        <p className="mt-1 text-sm text-ink-2">{receipt.store}</p>
      </div>

      {/* Total + per-person breakdown */}
      <div className="mb-5 rounded-md border border-rule bg-card p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-display text-sm font-semibold text-ink">Bill total</span>
          <span className="font-mono text-xl font-bold text-ink">${billTotal.toFixed(2)}</span>
        </div>
        <div className="space-y-2 border-t border-rule pt-3">
          {people.map(person => {
            const share = rawTotals[person.id] ?? 0
            return (
              <div key={person.id} className="flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: person.color }}>
                  {person.initial}
                </div>
                <span className="flex-1 text-sm text-ink">{person.name}</span>
                <span className="font-mono text-sm font-medium tabular-nums text-ink">
                  ${share.toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Settlement transactions */}
      <p className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-ink-2">Settlements</p>
      {settlements.length === 0 ? (
        <div className="rounded-md border border-rule bg-card p-6 text-center text-sm text-ink-2">
          No settlements needed — everyone's even!
        </div>
      ) : (
        <div className="space-y-3">
          {settlements.map((s, idx) => {
            const from = personById[s.fromId]
            const to = personById[s.toId]
            return (
              <div key={idx} className="flex items-center gap-3 rounded-md border border-rule bg-card px-4 py-3 shadow-card">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: from?.color }}>{from?.initial}</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-ink-3">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ background: to?.color }}>{to?.initial}</div>
                <p className="flex-1 min-w-0 truncate text-sm font-medium text-ink">{from?.name} → {to?.name}</p>
                <span className="shrink-0 font-mono text-lg font-semibold text-ink">${s.amount.toFixed(2)}</span>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button onClick={handleCopy}
          className={['w-full rounded-xs py-2.5 text-sm font-semibold transition focus:outline-none',
            copied ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent-dark'].join(' ')}>
          {copied ? 'Copied! Paste into your group chat 📋' : 'Copy all to group chat'}
        </button>
        <button onClick={() => window.print()}
          className="w-full rounded-xs border border-accent py-2.5 text-sm font-semibold text-accent transition hover:bg-accent hover:text-white focus:outline-none">
          Download summary PDF
        </button>
        <button onClick={onReset}
          className="w-full rounded-xs border border-rule-strong py-2.5 text-sm font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none">
          Split another receipt
        </button>
      </div>

      <PrintContent receipt={receipt} items={items} splits={splits} people={people} settlements={settlements} />
    </div>
  )
}
