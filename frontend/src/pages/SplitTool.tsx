import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { ItemSplit, Person, ReceiptItem, ScannedReceipt, Settlement } from '@/types'
import { calculatePersonTotals, calculateSettlements } from '@/utils/balanceCalculator'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import LogoMark from '@/components/layout/LogoMark'
import AppFooter from '@/components/layout/AppFooter'
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

function MoonIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
}
function SunIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
}
function BackBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-5 flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-ink focus:outline-none">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
      {label}
    </button>
  )
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

  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('sh-theme') === 'dark' } catch { return false }
  })

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : ''
  }, [dark])

  useEffect(() => {
    if (pageState === 'upload' || pageState === 'scanning') return
    const session: Session = { receipt, items, people, splits, paidById, pageState }
    try { localStorage.setItem('splithaus_current_session', JSON.stringify(session)) } catch { /* ignore */ }
  }, [pageState, receipt, items, people, splits, paidById])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.dataset.theme = next ? 'dark' : ''
    try { localStorage.setItem('sh-theme', next ? 'dark' : 'light') } catch { /* ignore */ }
  }

  function handleScanSuccess(data: ScannedReceipt) { setReceipt(data); setItems(data.items); setPageState('review') }

  function handlePeopleConfirm(newPeople: Person[]) {
    setPeople(newPeople); setSavedPeople(newPeople)
    setSplits(defaultSplits(items)); setPaidById(null); setPageState('assigning')
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

  const allAssigned = splits.length > 0 && splits.every(s => s.mode === 'everyone' || s.assignedTo.length > 0)
  const canCalculate = allAssigned && paidById !== null
  const liveRawTotals = pageState === 'assigning'
    ? calculatePersonTotals(items, splits, people, null, receipt?.store ?? '')
    : {}
  const isReview = pageState === 'review' || pageState === 'people-setup'

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <nav className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-rule bg-paper/90 px-4 backdrop-blur-md sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-semibold text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <LogoMark />
          SplitHaus
        </Link>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex h-8 w-8 items-center justify-center rounded-xs text-ink-2 transition hover:bg-paper-2 hover:text-ink focus:outline-none">
            {dark ? <SunIcon /> : <MoonIcon />}
          </button>
          {pageState !== 'upload' && pageState !== 'scanning' && (
            <button onClick={handleReset} className="rounded-xs border border-rule-strong px-3 py-1.5 text-xs font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none">
              New receipt
            </button>
          )}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
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
            <BackBtn label="Back" onClick={() => setPageState('upload')} />
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
            <BackBtn label="Back to review" onClick={() => setPageState('review')} />
            <div className="mb-6">
              <h1 className="font-display text-2xl font-semibold tracking-heading text-ink sm:text-3xl">Assign items</h1>
              <p className="mt-1 text-sm text-ink-2">Tap avatars to assign each item, then mark who paid.</p>
            </div>
            <AssigningPanel items={items} people={people} splits={splits}
              paidById={paidById} liveRawTotals={liveRawTotals} canCalculate={canCalculate}
              onSplitChange={(idx, s) => setSplits(prev => prev.map((x, i) => i === idx ? s : x))}
              onPaidByChange={setPaidById} onCalculate={handleCalculate} />
          </>
        )}

        {pageState === 'settlement' && receipt && (
          <SettlementScreen settlements={settlements} receipt={receipt}
            items={items} splits={splits} people={people}
            onBack={() => setPageState('assigning')} onReset={handleReset} />
        )}
      </div>

      <AppFooter />
    </div>
  )
}
