import { useState } from 'react'
import { nanoid } from 'nanoid'
import type { Person } from '@/types'
import { PERSON_COLORS } from '@/constants/colors'

const DEFAULT_NAMES = ['Albin', 'Sebastian', 'Emmanuel', 'Megha', 'Sidharth']

function getDefaultName(index: number): string {
  return DEFAULT_NAMES[index] ?? `Person ${index + 1}`
}

function getInitial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase()
}

function makePerson(index: number, overrideName?: string): Person {
  const name = overrideName ?? getDefaultName(index)
  return { id: nanoid(), name, color: PERSON_COLORS[index % PERSON_COLORS.length], initial: getInitial(name) }
}

interface Props {
  onConfirm: (people: Person[]) => void
  onClose: () => void
  savedPeople?: Person[]
}

export default function PeopleSetupModal({ onConfirm, onClose, savedPeople }: Props) {
  const [people, setPeople] = useState<Person[]>(() => {
    if (savedPeople && savedPeople.length >= 2) {
      return savedPeople.map((p, i) => ({
        ...p,
        id: nanoid(),
        color: PERSON_COLORS[i % PERSON_COLORS.length],
        initial: getInitial(p.name),
      }))
    }
    return Array.from({ length: 4 }, (_, i) => makePerson(i))
  })

  function setCount(n: number) {
    setPeople(prev =>
      Array.from({ length: n }, (_, i) =>
        i < prev.length
          ? { ...prev[i], color: PERSON_COLORS[i % PERSON_COLORS.length] }
          : makePerson(i),
      ),
    )
  }

  function updateName(id: string, name: string) {
    setPeople(prev =>
      prev.map(p => p.id === id ? { ...p, name, initial: getInitial(name) } : p),
    )
  }

  function removePerson(id: string) {
    setPeople(prev => prev.filter(p => p.id !== id))
  }

  function addPerson() {
    if (people.length >= 8) return
    setPeople(prev => [...prev, makePerson(prev.length)])
  }

  const allFilled = people.every(p => p.name.trim().length > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-t-xl bg-card p-6 shadow-lg sm:rounded-xl"
        onClick={e => e.stopPropagation()}>
        <h2 className="font-display text-xl font-semibold tracking-heading text-ink">Who's splitting this?</h2>
        <p className="mt-1 text-sm text-ink-2">Choose how many people are splitting.</p>

        <div className="mt-4">
          <select
            value={people.length}
            onChange={e => setCount(parseInt(e.target.value))}
            className="rounded-xs border border-rule bg-card px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={n}>{n} people</option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2">
          {people.map((person, idx) => (
            <div key={person.id} className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: person.color }}>
                {getInitial(person.name)}
              </div>
              <input value={person.name}
                onChange={e => updateName(person.id, e.target.value)}
                placeholder={getDefaultName(idx)}
                className="flex-1 rounded-xs border border-rule bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-3 outline-none focus:border-accent" />
              {people.length > 2 && (
                <button onClick={() => removePerson(person.id)}
                  className="shrink-0 text-ink-3 transition hover:text-red-500 focus:outline-none" aria-label="Remove person">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        {people.length < 8 && (
          <button onClick={addPerson}
            className="mt-3 flex items-center gap-1.5 text-sm text-ink-2 transition hover:text-accent focus:outline-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add person
          </button>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-xs border border-rule-strong py-2.5 text-sm font-medium text-ink-2 transition hover:border-ink-2 hover:text-ink focus:outline-none">
            Cancel
          </button>
          <button onClick={() => allFilled && onConfirm(people)} disabled={!allFilled}
            className="flex-1 rounded-xs bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-dark focus:outline-none disabled:opacity-40">
            Start assigning →
          </button>
        </div>
      </div>
    </div>
  )
}
