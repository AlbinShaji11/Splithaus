import type { ItemSplit, Person, ReceiptItem, Settlement } from '@/types'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function detectDiscountType(
  itemName: string,
  store: string,
): 'ww_brand' | 'team' | 'generic' {
  if (/woolworths/i.test(store)) {
    if (/ww\s*brand/i.test(itemName)) return 'ww_brand'
    if (/team\s*discount/i.test(itemName)) return 'team'
  }
  return 'generic'
}

function calcSingleItemShares(
  price: number,
  split: ItemSplit | undefined,
  people: Person[],
): Record<string, number> {
  const result: Record<string, number> = {}
  people.forEach(p => { result[p.id] = 0 })

  if (!split || split.mode === 'everyone') {
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
    const totalRatio = split.proportions.reduce((s, p) => s + p.ratio, 0)
    if (totalRatio > 0) {
      split.proportions.forEach(({ personId, ratio }) => {
        result[personId] = round(price * (ratio / totalRatio))
      })
    }
  } else if (split.mode === 'custom' && split.customAmounts) {
    Object.entries(split.customAmounts).forEach(([id, amount]) => {
      result[id] = round(amount)
    })
  }
  return result
}

function calcPositiveContribs(
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
): Record<string, number> {
  const contribs: Record<string, number> = {}
  people.forEach(p => { contribs[p.id] = 0 })
  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))

  items.forEach((item, idx) => {
    if (item.type !== 'item') return
    const shares = calcSingleItemShares(item.price, splitMap.get(idx), people)
    Object.entries(shares).forEach(([id, v]) => { contribs[id] = round(contribs[id] + v) })
  })
  return contribs
}

function calcWWContribs(
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
): Record<string, number> {
  const contribs: Record<string, number> = {}
  people.forEach(p => { contribs[p.id] = 0 })
  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))

  items.forEach((item, idx) => {
    if (item.type !== 'item') return
    if (!/\bww\b|woolworths/i.test(item.name)) return
    const shares = calcSingleItemShares(item.price, splitMap.get(idx), people)
    Object.entries(shares).forEach(([id, v]) => { contribs[id] = round(contribs[id] + v) })
  })
  return contribs
}

function distributeDiscount(
  price: number,
  contribs: Record<string, number>,
  people: Person[],
): Record<string, number> {
  const result: Record<string, number> = {}
  people.forEach(p => { result[p.id] = 0 })
  const total = Object.values(contribs).reduce((s, v) => s + v, 0)

  if (total <= 0) {
    const share = round(price / people.length)
    people.forEach(p => { result[p.id] = share })
    return result
  }
  people.forEach(p => {
    if ((contribs[p.id] ?? 0) > 0) {
      result[p.id] = round(price * (contribs[p.id] / total))
    }
  })
  return result
}

export function getItemShares(
  item: ReceiptItem,
  itemIdx: number,
  allItems: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
  storeName: string,
): Record<string, number> {
  const split = splits.find(s => s.itemIndex === itemIdx)
  if (item.type === 'discount' && (!split || split.mode === 'everyone')) {
    const positiveContribs = calcPositiveContribs(allItems, splits, people)
    const discType = detectDiscountType(item.name, storeName)
    let contribs = positiveContribs
    if (discType === 'ww_brand') {
      const wwContribs = calcWWContribs(allItems, splits, people)
      if (Object.values(wwContribs).some(v => v > 0)) contribs = wwContribs
    }
    return distributeDiscount(item.price, contribs, people)
  }
  return calcSingleItemShares(item.price, split, people)
}

export function calculatePersonTotals(
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
  paidById: string | null,
  storeName = '',
): Record<string, number> {
  const totals: Record<string, number> = {}
  people.forEach(p => { totals[p.id] = 0 })

  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))
  const positiveContribs = calcPositiveContribs(items, splits, people)

  items.forEach((item, idx) => {
    const split = splitMap.get(idx)
    const price = item.price

    if (item.type === 'discount' && (!split || split.mode === 'everyone')) {
      const discType = detectDiscountType(item.name, storeName)
      let contribs = positiveContribs
      if (discType === 'ww_brand') {
        const wwContribs = calcWWContribs(items, splits, people)
        if (Object.values(wwContribs).some(v => v > 0)) contribs = wwContribs
      }
      const shares = distributeDiscount(price, contribs, people)
      Object.entries(shares).forEach(([id, v]) => { totals[id] = round(totals[id] + v) })
    } else if (!split || split.mode === 'everyone') {
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
    } else if (split.mode === 'custom' && split.customAmounts) {
      Object.entries(split.customAmounts).forEach(([id, amount]) => {
        totals[id] = round(totals[id] + amount)
      })
    }
  })

  if (paidById) {
    const receiptTotal = round(items.reduce((s, i) => s + i.price, 0))
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

  let di = 0; let ci = 0
  while (di < debtors.length && ci < creditors.length) {
    const debtor = debtors[di]; const creditor = creditors[ci]
    const amount = round(Math.min(debtor.remaining, creditor.remaining))
    settlements.push({ fromId: debtor.id, fromName: debtor.name, toId: creditor.id, toName: creditor.name, amount })
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
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
): string {
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
  const itemLines = items.map((item, idx) => {
    const shares = getItemShares(item, idx, items, splits, people, storeName)
    const parts = people
      .filter(p => Math.abs(shares[p.id] ?? 0) >= 0.01)
      .map(p => `${p.name} ${shares[p.id] < 0 ? '-' : ''}$${Math.abs(shares[p.id]).toFixed(2)}`)
    return `${item.name}: ${parts.join(', ')}`
  })
  return [
    `🧾 ${storeName} · ${date}`,
    '',
    ...itemLines,
    '─────────────────',
    ...settlements.map(s => `${s.fromName} pays ${s.toName} $${s.amount.toFixed(2)}`),
    '',
    'Split with SplitHaus (no signup needed)',
  ].join('\n')
}
