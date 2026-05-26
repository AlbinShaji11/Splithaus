import type { Balance, Person, Receipt, Settlement } from '@/types'

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export function calculateBalances(receipt: Receipt, people: Person[]): Balance[] {
  if (!people.length) return []

  const shares = new Map<string, number>()
  people.forEach(p => shares.set(p.id, 0))

  for (const item of receipt.items) {
    const { totalPrice, splitCode, assignedTo, customAmounts } = item

    if (splitCode === 'CUSTOM' && customAmounts) {
      for (const [personId, amount] of Object.entries(customAmounts)) {
        shares.set(personId, (shares.get(personId) ?? 0) + amount)
      }
    } else {
      const targets = assignedTo.length > 0 ? assignedTo : people.map(p => p.id)
      const perPerson = targets.length > 0 ? totalPrice / targets.length : 0
      for (const personId of targets) {
        shares.set(personId, (shares.get(personId) ?? 0) + perPerson)
      }
    }
  }

  return people.map(person => {
    const share = round(shares.get(person.id) ?? 0)
    const isPayer = person.id === receipt.paidBy

    if (isPayer) {
      const totalOwed = round(receipt.total - share)
      return {
        personId: person.id,
        name: person.name,
        color: person.color,
        totalOwes: 0,
        totalOwed,
        net: totalOwed,
      }
    }

    return {
      personId: person.id,
      name: person.name,
      color: person.color,
      totalOwes: share,
      totalOwed: 0,
      net: -share,
    }
  })
}

export function calculateSettlements(balances: Balance[]): Settlement[] {
  const settlements: Settlement[] = []

  const creditors = balances
    .filter(b => b.net > 0.005)
    .map(b => ({ ...b, remaining: b.net }))
    .sort((a, b) => b.remaining - a.remaining)

  const debtors = balances
    .filter(b => b.net < -0.005)
    .map(b => ({ ...b, remaining: Math.abs(b.net) }))
    .sort((a, b) => b.remaining - a.remaining)

  let ci = 0
  let di = 0

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci]
    const debtor = debtors[di]
    const amount = round(Math.min(creditor.remaining, debtor.remaining))

    settlements.push({
      from: debtor.personId,
      fromName: debtor.name,
      to: creditor.personId,
      toName: creditor.name,
      amount,
    })

    creditor.remaining = round(creditor.remaining - amount)
    debtor.remaining = round(debtor.remaining - amount)

    if (creditor.remaining < 0.005) ci++
    if (debtor.remaining < 0.005) di++
  }

  return settlements
}

export function generateShareText(settlements: Settlement[], storeName: string): string {
  const date = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
  const lines = [
    `\u{1F9FE} ${storeName} ${date}`,
    ...settlements.map(s => `${s.fromName} owes ${s.toName} $${s.amount.toFixed(2)}`),
  ]
  return lines.join('\n')
}
