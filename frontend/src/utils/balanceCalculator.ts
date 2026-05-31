import type { ItemSplit, Person, ReceiptItem, Settlement } from '@/types'

// --- Cent helpers ---

function toCents(dollars: number): number {
  return Math.round(dollars * 100)
}

// Split totalCents exactly into n shares; extra pennies go to the first persons.
function splitIntoCents(totalCents: number, n: number): number[] {
  if (n <= 0) return []
  const base = Math.floor(totalCents / n)
  const extra = totalCents - base * n
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0))
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

// Per-person shares in cents — internal arithmetic kernel.
function calcSharesCents(
  priceCents: number,
  split: ItemSplit | undefined,
  people: Person[],
): Record<string, number> {
  const result: Record<string, number> = {}
  people.forEach(p => { result[p.id] = 0 })

  const absCents = Math.abs(priceCents)
  const sign = priceCents < 0 ? -1 : 1

  if (!split || split.mode === 'everyone') {
    const shares = splitIntoCents(absCents, people.length)
    people.forEach((p, i) => { result[p.id] = sign * shares[i] })
  } else if (split.mode === 'individual') {
    const id = split.assignedTo[0]
    if (id) result[id] = priceCents
  } else if (split.mode === 'subset') {
    const ids = split.assignedTo
    if (ids.length > 0) {
      const shares = splitIntoCents(absCents, ids.length)
      ids.forEach((id, i) => { result[id] = sign * shares[i] })
    }
  } else if (split.mode === 'proportion' && split.proportions) {
    const totalRatio = split.proportions.reduce((s, p) => s + p.ratio, 0)
    if (totalRatio > 0) {
      const exact = split.proportions.map(p => absCents * p.ratio / totalRatio)
      const floors = exact.map(Math.floor)
      const rem = absCents - floors.reduce((s, v) => s + v, 0)
      split.proportions.forEach(({ personId }, i) => {
        result[personId] = sign * (floors[i] + (i < rem ? 1 : 0))
      })
    }
  } else if (split.mode === 'custom' && split.customAmounts) {
    Object.entries(split.customAmounts).forEach(([id, amount]) => {
      result[id] = toCents(amount)
    })
  }
  return result
}

// Per-person shares in dollars — used by SplitModePanel display and getItemShares.
export function calcSingleItemShares(
  price: number,
  split: ItemSplit | undefined,
  people: Person[],
): Record<string, number> {
  const cents = calcSharesCents(toCents(price), split, people)
  const result: Record<string, number> = {}
  Object.entries(cents).forEach(([id, c]) => { result[id] = c / 100 })
  return result
}

// Positive item contributions in cents (for pro-rata discount distribution).
function calcPositiveContribsCents(
  items: ReceiptItem[],
  splits: ItemSplit[],
  people: Person[],
): Record<string, number> {
  const contribs: Record<string, number> = {}
  people.forEach(p => { contribs[p.id] = 0 })
  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))

  items.forEach((item, idx) => {
    if (item.type !== 'item') return
    const shares = calcSharesCents(toCents(item.price), splitMap.get(idx), people)
    Object.entries(shares).forEach(([id, c]) => { if (c > 0) contribs[id] += c })
  })
  return contribs
}

// WW-brand item contributions in cents.
function calcWWContribsCents(
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
    const shares = calcSharesCents(toCents(item.price), splitMap.get(idx), people)
    Object.entries(shares).forEach(([id, c]) => { if (c > 0) contribs[id] += c })
  })
  return contribs
}

// Pro-rata distribution of a discount (negative cents) using cent arithmetic.
function distributeDiscountCents(
  discountCents: number,
  contribsCents: Record<string, number>,
  people: Person[],
): Record<string, number> {
  const result: Record<string, number> = {}
  people.forEach(p => { result[p.id] = 0 })
  const absCents = Math.abs(discountCents)
  const totalContrib = Object.values(contribsCents).reduce((s, v) => s + v, 0)

  if (totalContrib <= 0) {
    const shares = splitIntoCents(absCents, people.length)
    people.forEach((p, i) => { result[p.id] = -shares[i] })
    return result
  }

  const exact = people.map(p => absCents * (contribsCents[p.id] ?? 0) / totalContrib)
  const floors = exact.map(Math.floor)
  const rem = absCents - floors.reduce((s, v) => s + v, 0)
  people.forEach((p, i) => {
    result[p.id] = -(floors[i] + (i < rem ? 1 : 0))
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
    // Costco: use linked item's split to distribute the discount proportionally
    if (/costco/i.test(storeName) && item.linkedItemIndex != null) {
      const linkedSplit = splits.find(s => s.itemIndex === item.linkedItemIndex)
      if (linkedSplit) {
        return calcSingleItemShares(item.price, linkedSplit, people)
      }
    }

    const contribsCents = calcPositiveContribsCents(allItems, splits, people)
    const discType = detectDiscountType(item.name, storeName)
    let contribs = contribsCents
    if (discType === 'ww_brand') {
      const wwContribs = calcWWContribsCents(allItems, splits, people)
      if (Object.values(wwContribs).some(v => v > 0)) contribs = wwContribs
    }
    const cents = distributeDiscountCents(toCents(item.price), contribs, people)
    const result: Record<string, number> = {}
    Object.entries(cents).forEach(([id, c]) => { result[id] = c / 100 })
    return result
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
  const totalsCents: Record<string, number> = {}
  people.forEach(p => { totalsCents[p.id] = 0 })

  const splitMap = new Map(splits.map(s => [s.itemIndex, s]))
  const positiveContribsCents = calcPositiveContribsCents(items, splits, people)

  // Accumulate all "everyone equally" items (positive + generic discounts) into one
  // batch and split the sum once — prevents per-item cent-remainder compounding
  // (e.g. $61.00 ÷ 4 → $15.25 each, not $15.26/$15.24).
  let everyoneBatchCents = 0

  items.forEach((item, idx) => {
    const split = splitMap.get(idx)
    const priceCents = toCents(item.price)
    const isEveryone = !split || split.mode === 'everyone'

    if (!isEveryone) {
      // Non-"everyone" items: compute per-item as usual
      const shares = calcSharesCents(priceCents, split, people)
      Object.entries(shares).forEach(([id, c]) => { totalsCents[id] += c })
      return
    }

    if (item.type === 'discount') {
      // WW-brand discounts: pro-rata to WW item contributors (not batched)
      if (detectDiscountType(item.name, storeName) === 'ww_brand') {
        const wwContribs = calcWWContribsCents(items, splits, people)
        const contribs = Object.values(wwContribs).some(v => v > 0) ? wwContribs : positiveContribsCents
        const shares = distributeDiscountCents(priceCents, contribs, people)
        Object.entries(shares).forEach(([id, c]) => { totalsCents[id] += c })
        return
      }

      // Costco linked discount: if linked item is non-"everyone", use that split
      if (/costco/i.test(storeName) && item.linkedItemIndex != null) {
        const linkedSplit = splitMap.get(item.linkedItemIndex)
        if (linkedSplit && linkedSplit.mode !== 'everyone') {
          const shares = calcSharesCents(priceCents, linkedSplit, people)
          Object.entries(shares).forEach(([id, c]) => { totalsCents[id] += c })
          return
        }
        // If linked item is also "everyone", fall through to batch
      }
    }

    // Everything else in "everyone" mode: batch (positive items + generic discounts)
    everyoneBatchCents += priceCents
  })

  // Split the batched "everyone" total once — guarantees equal totals for equal splits
  if (everyoneBatchCents !== 0) {
    const absCents = Math.abs(everyoneBatchCents)
    const sign = everyoneBatchCents < 0 ? -1 : 1
    const batchShares = splitIntoCents(absCents, people.length)
    people.forEach((p, i) => { totalsCents[p.id] += sign * batchShares[i] })
  }

  const totals: Record<string, number> = {}
  people.forEach(p => { totals[p.id] = totalsCents[p.id] / 100 })

  if (paidById) {
    const receiptTotalCents = items.reduce((s, i) => s + toCents(i.price), 0)
    totals[paidById] = (totalsCents[paidById] - receiptTotalCents) / 100
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
    const amount = Math.round(Math.min(debtor.remaining, creditor.remaining) * 100) / 100
    settlements.push({ fromId: debtor.id, fromName: debtor.name, toId: creditor.id, toName: creditor.name, amount })
    debtor.remaining = Math.round((debtor.remaining - amount) * 100) / 100
    creditor.remaining = Math.round((creditor.remaining - amount) * 100) / 100
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
