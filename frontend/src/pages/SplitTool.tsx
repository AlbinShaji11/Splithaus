import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { ItemSplit, Person, ReceiptItem, ScannedReceipt, Settlement } from '@/types'
import { calculatePersonTotals, calculateSettlements } from '@/utils/balanceCalculator'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import UploadZone from '@/components/receipt/UploadZone'
import ReviewPanel from '@/components/split/ReviewPanel'
import PeopleSetupModal from '@/components/split/PeopleSetupModal'
import AssigningPanel from '@/components/split/AssigningPanel'
import SettlementScreen from '@/components/split/SettlementScreen'

type PageState = 'upload' | 'scanning' | 'review' | 'people-setup' | 'assigning' | 'settlement'

const EMPTY_RECEIPT: ScannedReceipt = {
  store: 'Manual', items: [], subtotal: 0, gst: 0, total: 0, line_count: 0, warnings: [],
}

function defaultSplits(items: ReceiptItem[]): ItemSplit[] {
  return items.map((_, idx) => ({ itemIndex: idx, mode: 'everyone', assignedTo: [] }))
}

interface Session {
  receipt: ScannedReceipt | null; items: ReceiptItem[]
  people: Person[]; splits: ItemSplit[]
  paidById: string | null; pageState: PageState
}

function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem('splithaus_current_session')
    return raw ? JSON.parse(raw) as Session : null
  } catch { return null }
}

export default function SplitTool() {
  const saved = loadSession()
  const safeState = (s: PageState) => s === 'people-setup' ? 'review' : s

  const [pageState, setPageState] = useState<PageState>(saved ? safeState(saved.pageState) : 'upload')
  const [receipt, setReceipt] = useState<ScannedReceipt | null>(saved?.receipt ?? null)
  const [items, setItems] = useState<ReceiptItem[]>(saved?.items ?? [])
  const [people, setPeople] = useState<Person[]>(saved?.people ?? [])
  const [splits, setSplits] = useState<ItemSplit[]>(saved?.splits ?? [])
  const [paidById, setPaidById] = useState<string | null>(saved?.paidById ?? null)
  const [settlements, setSettlements] = useState<Settlement[]>([])

  const [savedPeople, setSavedPeople] = useLocalStorage<Person[]>('splithaus_people', [])

  useEffect(() => {
    if (pageState === 'upload' || pageState === 'scanning') return
    const session: Session = { receipt, items, people, splits, paidById, pageState }
    try { localStorage.setItem('splithaus_current_session', JSON.stringify(session)) } catch { /* ignore */ }
  }, [pageState, receipt, items, people, splits, paidById])

  function handleScanSuccess(data: ScannedReceipt) {
    setReceipt(data); setItems(data.items); setPageState('review')
  }

  function handlePeopleConfirm(newPeople: Person[]) {
    setPeople(newPeople)
    setSavedPeople(newPeople)
    setSplits(defaultSplits(items))
    setPaidById(null)
    setPageState('assigning')
  }

  function handleCalculate() {
    const totals = calculatePersonTotals(items, splits, people, paidById, receipt?.store ?? '')
    setSettlements(calculateSettlements(totals, people))
    setPageState('settlement')
  }

  function handleReset() {
    try { localStorage.removeItem('splithaus_current_session') } catch { /* ignore */ }
    setReceipt(null); setItems([]); setPeople([]); setSplits([])
    setPaidById(null); setSettlements([]); setPageState('upload')
  }

  const allAssigned = splits.length > 0 &&
    splits.every(s => s.mode === 'everyone' || s.assignedTo.length > 0)
  const canCalculate = allAssigned && paidById !== null

  const liveRawTotals = pageState === 'assigning'
    ? calculatePersonTotals(items, splits, people, null, receipt?.store ?? '')
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
            <ReviewPanel receipt={receipt} items={items} onItemsChange={setItems}
              onStartSplitting={() => setPageState('people-setup')} />
            {pageState === 'people-setup' && (
              <PeopleSetupModal onConfirm={handlePeopleConfirm}
                onClose={() => setPageState('review')}
                savedPeople={savedPeople.length >= 2 ? savedPeople : undefined} />
            )}
          </>
        )}

        {pageState === 'assigning' && (
          <>
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">Assign items</h1>
              <p className="mt-1 text-sm text-ink-2">Tap avatars to assign each item, then mark who paid.</p>
            </div>
            <AssigningPanel items={items} people={people} splits={splits}
              paidById={paidById} liveRawTotals={liveRawTotals}
              canCalculate={canCalculate}
              onSplitChange={(idx, s) => setSplits(prev => prev.map((x, i) => i === idx ? s : x))}
              onPaidByChange={setPaidById}
              onCalculate={handleCalculate} />
          </>
        )}

        {pageState === 'settlement' && receipt && (
          <SettlementScreen settlements={settlements} receipt={receipt}
            items={items} splits={splits} people={people}
            onBack={() => setPageState('assigning')}
            onReset={handleReset} />
        )}
      </div>
    </div>
  )
}
