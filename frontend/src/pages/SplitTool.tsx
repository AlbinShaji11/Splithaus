import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ItemSplit, Person, ReceiptItem, ScannedReceipt, Settlement } from '@/types'
import { calculatePersonTotals, calculateSettlements } from '@/utils/balanceCalculator'
import UploadZone from '@/components/receipt/UploadZone'
import ReviewPanel from '@/components/split/ReviewPanel'
import PeopleSetupModal from '@/components/split/PeopleSetupModal'
import ItemSplitRow from '@/components/split/ItemSplitRow'
import PersonTotalBar from '@/components/split/PersonTotalBar'
import SettlementScreen from '@/components/split/SettlementScreen'

type PageState = 'upload' | 'scanning' | 'review' | 'people-setup' | 'assigning' | 'settlement'

const EMPTY_RECEIPT: ScannedReceipt = {
  store: 'Manual', items: [], subtotal: 0, gst: 0, total: 0, line_count: 0, warnings: [],
}

function defaultSplits(items: ReceiptItem[]): ItemSplit[] {
  return items.map((_, idx) => ({ itemIndex: idx, mode: 'everyone', assignedTo: [] }))
}

export default function SplitTool() {
  const [pageState, setPageState] = useState<PageState>('upload')
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(null)
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [splits, setSplits] = useState<ItemSplit[]>([])
  const [paidById, setPaidById] = useState<string | null>(null)
  const [settlements, setSettlements] = useState<Settlement[]>([])

  function handleScanSuccess(data: ScannedReceipt) {
    setReceipt(data)
    setItems(data.items)
    setPageState('review')
  }

  function handlePeopleConfirm(newPeople: Person[]) {
    setPeople(newPeople)
    setSplits(defaultSplits(items))
    setPaidById(null)
    setPageState('assigning')
  }

  function handleSplitChange(itemIndex: number, split: ItemSplit) {
    setSplits(prev => prev.map((s, i) => i === itemIndex ? split : s))
  }

  function handleCalculate() {
    const totals = calculatePersonTotals(items, splits, people, paidById)
    setSettlements(calculateSettlements(totals, people))
    setPageState('settlement')
  }

  function handleReset() {
    setReceipt(null); setItems([]); setPeople([])
    setSplits([]); setPaidById(null); setSettlements([])
    setPageState('upload')
  }

  const allAssigned = splits.length > 0 &&
    splits.every(s => s.mode === 'everyone' || s.assignedTo.length > 0)
  const canCalculate = allAssigned && paidById !== null

  const liveRawTotals = pageState === 'assigning'
    ? calculatePersonTotals(items, splits, people, null)
    : {}

  const isReview = pageState === 'review' || pageState === 'people-setup'

  return (
    <div className="min-h-screen bg-paper">
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur-md sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">S</span>
          SplitHaus
        </Link>
        {pageState !== 'upload' && pageState !== 'scanning' && (
          <button onClick={handleReset} className="rounded-xs border border-rule-strong px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none">
            New receipt
          </button>
        )}
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {(pageState === 'upload' || pageState === 'scanning') && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">Split a receipt</h1>
              <p className="mt-1 text-sm text-ink-2">Upload a receipt, tag who got what, share the result.</p>
            </div>
            <div className="mx-auto max-w-lg">
              <UploadZone onSuccess={handleScanSuccess} />
              <p className="mt-4 text-center text-sm text-ink-2">
                Or{' '}
                <button onClick={() => { setReceipt(EMPTY_RECEIPT); setItems([]); setPageState('review') }}
                  className="font-medium text-accent underline underline-offset-2 transition hover:no-underline focus:outline-none">
                  add expenses manually
                </button>
              </p>
            </div>
          </>
        )}

        {isReview && receipt && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">Review items</h1>
              <p className="mt-1 text-sm text-ink-2">Check everything looks right, then start splitting.</p>
            </div>
            <ReviewPanel receipt={receipt} items={items} onItemsChange={setItems} onStartSplitting={() => setPageState('people-setup')} />
            {pageState === 'people-setup' && (
              <PeopleSetupModal onConfirm={handlePeopleConfirm} onClose={() => setPageState('review')} />
            )}
          </>
        )}

        {pageState === 'assigning' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">Assign items</h1>
              <p className="mt-1 text-sm text-ink-2">Tap avatars to assign each item, then mark who paid.</p>
            </div>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:items-start">
              <div className="overflow-hidden rounded-md border border-rule bg-card shadow-card">
                {items.map((item, idx) => (
                  <ItemSplitRow key={idx} item={item} itemIndex={idx} people={people}
                    split={splits[idx] ?? { itemIndex: idx, mode: 'everyone', assignedTo: [] }}
                    onSplitChange={handleSplitChange}
                  />
                ))}
              </div>
              <div className="space-y-4 lg:sticky lg:top-[calc(3.5rem+1.25rem)]">
                <PersonTotalBar people={people} totals={liveRawTotals} paidById={paidById} onPaidByChange={setPaidById} />
                <button onClick={handleCalculate} disabled={!canCalculate}
                  className="w-full rounded-xs bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
                  Calculate settlements
                </button>
              </div>
            </div>
          </>
        )}

        {pageState === 'settlement' && (
          <SettlementScreen settlements={settlements} storeName={receipt?.store ?? ''} people={people} onReset={handleReset} />
        )}
      </div>
    </div>
  )
}
