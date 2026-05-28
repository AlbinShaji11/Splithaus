import type { ItemSplit, Person, ReceiptItem, Settlement } from '@/types'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calculatePersonTotals(
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
  paidById: string | null,
): Record<string, number> {
  const totals: Record<string, number> = {}
  people.forEach(p => { totals[p.id] = 0 })

  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))

  items.forEach((item, idx) => {
    const split = splitMap.get(idx)
    const price = item.price

    if (!split || split.mode === 'everyone') {
      const share = round(price / people.length)
      people.forEach(p => { totals[p.id] = round(totals[p.id] + share) })
    } else if (split.mode === 'individual') {
      const personId = split.assignedTo[0]
      if (personId) totals[personId] = round(totals[personId] + price)
    } else if (split.mode === 'subset') {
      const n = split.assignedTo.length
      if (n > 0) {
        const share = round(price / n)
        split.assignedTo.forEach(id => { totals[id] = round(totals[id] + share) })
      }
    } else if (split.mode === 'proportion' && split.proportions) {
      const totalRatio = split.proportions.reduce((s, p) => s + p.ratio, 0)
      if (totalRatio > 0) {
        split.proportions.forEach(({ personId, ratio }) => {
          totals[personId] = round(totals[personId] + round(price * (ratio / totalRatio)))
        })
      }
    }
  })

  if (paidById) {
    const receiptTotal = round(items.reduce((s, item) => s + item.price, 0))
    totals[paidById] = round(totals[paidById] - receiptTotal)
  }

  return totals
}

export function calculateSettlements(
  totals: Record<string, number>,
  people: Person[],
): Settlement[] {
  const settlements: Settlement[] = []

  const debtors = people
    .filter(p => (totals[p.id] ?? 0) > 0.005)
    .map(p => ({ ...p, remaining: totals[p.id] }))
    .sort((a, b) => b.remaining - a.remaining)

  const creditors = people
    .filter(p => (totals[p.id] ?? 0) < -0.005)
    .map(p => ({ ...p, remaining: Math.abs(totals[p.id]) }))
    .sort((a, b) => b.remaining - a.remaining)

  let di = 0
  let ci = 0

  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di]
    const creditor = creditors[ci]
    const amount = round(Math.min(debtor.remaining, creditor.remaining))

    settlements.push({
      fromId: debtor.id,
      fromName: debtor.name,
      toId: creditor.id,
      toName: creditor.name,
      amount,
    })

    debtor.remaining = round(debtor.remaining - amount)
    creditor.remaining = round(creditor.remaining - amount)

    if (debtor.remaining < 0.005) di++
    if (creditor.remaining < 0.005) ci++
  }

  return settlements
}

export function generateShareText(
  settlements: Settlement[],
  storeName: string,
): string {
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  return [
    `🧾 ${storeName} ${date}`,
    ...settlements.map(s => `${s.fromName} pays ${s.toName} $${s.amount.toFixed(2)}`),
  ].join('\n')
}
