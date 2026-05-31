import { createPortal } from 'react-dom'
import type { ItemSplit, Person, ReceiptItem, ScannedReceipt, Settlement } from '@/types'
import { getItemShares, calculatePersonTotals } from '@/utils/balanceCalculator'

interface Props {
  receipt: ScannedReceipt
  items: ReceiptItem[]
  splits: ItemSplit[]
  people: Person[]
  settlements: Settlement[]
}

const cell: React.CSSProperties = { padding: '8px 12px', verticalAlign: 'middle' }
const cellR: React.CSSProperties = { ...cell, textAlign: 'right', fontFamily: 'monospace' }
const headerCell: React.CSSProperties = { ...cell, fontWeight: 700, borderBottom: '2px solid #ccc', background: '#f3f3f3' }
const headerCellR: React.CSSProperties = { ...headerCell, textAlign: 'right', fontFamily: 'monospace' }

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#666', margin: '20px 0 6px' }}>
      {children}
    </p>
  )
}

export default function PrintContent({ receipt, items, splits, people, settlements }: Props) {
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const rawTotals = calculatePersonTotals(items, splits, people, null, receipt.store)
  const billTotal = items.reduce((s, i) => s + i.price, 0)

  // Per-person discount shares
  const discSharesById: Record<string, number> = {}
  people.forEach(p => { discSharesById[p.id] = 0 })
  items.forEach((item, idx) => {
    if (item.type !== 'discount') return
    const shares = getItemShares(item, idx, items, splits, people, receipt.store)
    Object.entries(shares).forEach(([id, v]) => { discSharesById[id] = (discSharesById[id] ?? 0) + v })
  })
  const hasDiscounts = items.some(i => i.type === 'discount')

  const totalItemsShares = people.reduce((s, p) => s + Math.max(0, (rawTotals[p.id] ?? 0) - (discSharesById[p.id] ?? 0)), 0)
  const totalDiscountShares = people.reduce((s, p) => s + (discSharesById[p.id] ?? 0), 0)

  function rowBg(i: number): React.CSSProperties {
    return { background: i % 2 === 0 ? '#ffffff' : '#f9f9f9' }
  }

  const content = (
    <div id="print-content" style={{ fontFamily: 'system-ui, sans-serif', fontSize: 13, lineHeight: 1.5, color: '#111' }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 8, marginBottom: 4 }}>
        <p style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>SPLITHAUS</p>
        <p style={{ color: '#555', margin: '2px 0 0', fontSize: 13 }}>{receipt.store} · {date}</p>
      </div>

      {/* 1 — Settlements */}
      <SectionHeading>Settlements</SectionHeading>
      {settlements.length === 0 ? (
        <p style={{ color: '#666' }}>No settlements needed — everyone's even!</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...headerCell, textAlign: 'left' }}>From</th>
              <th style={{ ...headerCell, textAlign: 'left' }}>To</th>
              <th style={headerCellR}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s, i) => (
              <tr key={i} style={rowBg(i)}>
                <td style={cell}>{s.fromName}</td>
                <td style={cell}>{s.toName}</td>
                <td style={cellR}>${s.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 2 — Person summary */}
      <SectionHeading>Person Summary</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, textAlign: 'left' }}>Name</th>
            <th style={headerCellR}>Items</th>
            {hasDiscounts && <th style={headerCellR}>Discount</th>}
            <th style={headerCellR}>Total Owed</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p, i) => {
            const net = rawTotals[p.id] ?? 0
            const discShare = discSharesById[p.id] ?? 0
            const itemsShare = net - discShare
            return (
              <tr key={p.id} style={rowBg(i)}>
                <td style={cell}>{p.name}</td>
                <td style={cellR}>${Math.max(0, itemsShare).toFixed(2)}</td>
                {hasDiscounts && <td style={{ ...cellR, color: discShare < 0 ? '#C84B31' : '#111' }}>
                  {discShare < 0 ? `-$${Math.abs(discShare).toFixed(2)}` : '—'}
                </td>}
                <td style={{ ...cellR, fontWeight: 600 }}>${net.toFixed(2)}</td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #ccc', fontWeight: 700 }}>
            <td style={cell}>TOTAL</td>
            <td style={cellR}>${totalItemsShares.toFixed(2)}</td>
            {hasDiscounts && <td style={{ ...cellR, color: '#C84B31' }}>
              {totalDiscountShares < 0 ? `-$${Math.abs(totalDiscountShares).toFixed(2)}` : '—'}
            </td>}
            <td style={cellR}>${billTotal.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* 3 — Item breakdown */}
      <SectionHeading>Item Breakdown</SectionHeading>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...headerCell, textAlign: 'left' }}>Item</th>
            <th style={headerCellR}>Price</th>
            <th style={{ ...headerCell, textAlign: 'left' }}>Split</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const shares = getItemShares(item, idx, items, splits, people, receipt.store)
            const assignments = people
              .filter(p => Math.abs(shares[p.id] ?? 0) >= 0.01)
              .map(p => `${p.name}: ${shares[p.id] < 0 ? '-' : ''}$${Math.abs(shares[p.id]).toFixed(2)}`)
              .join(' · ')
            return (
              <tr key={idx} style={{ ...rowBg(idx), pageBreakInside: 'avoid' }}>
                <td style={cell}>{item.name}</td>
                <td style={{ ...cellR, color: item.price < 0 ? '#C84B31' : '#111' }}>
                  {item.price < 0 ? '-' : ''}${Math.abs(item.price).toFixed(2)}
                </td>
                <td style={{ ...cell, color: '#555', fontSize: 11 }}>{assignments || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: 16, borderTop: '1px solid #ddd', paddingTop: 8, color: '#888', fontSize: 11 }}>
        <p style={{ margin: 0 }}>Bill total: ${billTotal.toFixed(2)}{receipt.gst > 0 ? ` · GST: $${receipt.gst.toFixed(2)}` : ''}</p>
        <p style={{ margin: '2px 0 0' }}>Generated by SplitHaus</p>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
