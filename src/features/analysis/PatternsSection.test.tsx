import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatternsSection } from './PatternsSection'
import { ClockProvider } from '../../state/ClockProvider'
import { DiaryProvider } from '../../state/DiaryProvider'
import { memoryRepository } from '../../data/memoryRepository'
import { addDays } from '../../domain/dates'
import type { Diary, Symptom } from '../../domain/types'

const NOW = new Date(2026, 10, 11, 21, 0)
const head: Symptom = { id: 'h', name: 'Headache', type: 'strength' }
const tired: Symptom = { id: 't', name: 'Tiredness', type: 'strength' }
const fever: Symptom = { id: 'f', name: 'Fever', type: 'yesno' }

/** `n` days ending 2026-11-11, Headache = i % 5 + 1 and Tiredness following it (or `tired`), Fever = i % 2. */
function diaryOf(n: number, symptoms = [head, tired, fever], tiredOf = (i: number) => (i % 5) + 1): Diary {
  const entries: Diary['entries'] = {}
  for (let i = 0; i < n; i++) entries[addDays('2026-11-11', -i)] = { h: (i % 5) + 1, t: tiredOf(i), f: i % 2 }
  return { symptoms, entries, notes: {} }
}

async function setup(diary: Diary) {
  render(
    <ClockProvider now={() => NOW}>
      <DiaryProvider repository={memoryRepository(diary)}>
        <PatternsSection />
      </DiaryProvider>
    </ClockProvider>,
  )
  await screen.findByRole('radiogroup', { name: 'Symptom' })
}

const card = (name: string) => screen.getByRole('region', { name })

describe('PatternsSection', () => {
  it('lets the user choose which symptom the weekday and season cards show, starting with the most logged', async () => {
    await setup(diaryOf(30))
    const group = screen.getByRole('radiogroup', { name: 'Symptom' })
    expect(within(group).getAllByRole('radio').map((r) => r.textContent)).toEqual(['Headache', 'Tiredness', 'Fever'])
    expect(within(group).getByRole('radio', { name: 'Headache' })).toBeChecked()
    expect(card('Average by weekday')).toHaveTextContent('Headache')
    await userEvent.click(within(group).getByRole('radio', { name: 'Tiredness' }))
    expect(card('Average by weekday')).toHaveTextContent('Tiredness')
    expect(card('Average by season')).toHaveTextContent('Tiredness')
  })

  it('shows the average value per weekday, Monday first', async () => {
    // 2026-11-09 (Mon) = i 2 → headache 3; 2026-11-02 (Mon) = i 9 → 5; both in 30 days; more Mondays: i 16 → 2, i 23 → 4.
    await setup(diaryOf(30))
    const rows = within(card('Average by weekday')).getAllByRole('row')
    const monday = rows.find((r) => r.textContent?.startsWith('Mon'))!
    expect(monday).toHaveTextContent('3.5') // (3 + 5 + 2 + 4) / 4
    expect(within(card('Average by weekday')).getAllByRole('row').map((r) => r.textContent?.slice(0, 3))).toEqual(
      ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    )
  })

  it('shows the average per season (time of year) and says what months each covers', async () => {
    await setup(diaryOf(30))
    const seasons = card('Average by season')
    expect(within(seasons).getAllByRole('row').map((r) => r.textContent?.match(/^[A-Za-z]+/)?.[0])).toEqual(['Winter', 'Spring', 'Summer', 'Autumn'])
    expect(within(seasons).getByRole('row', { name: /Autumn/ })).toHaveTextContent('Sep–Nov')
    // No winter day is logged: the value cell is a dash, not 0.
    expect(within(within(seasons).getByRole('row', { name: /Winter/ })).getByRole('cell')).toHaveTextContent(/^–$/)
    expect(seasons).toHaveTextContent(/time of year/i)
  })

  it('shows a yes/no symptom as a share of yes days and says so', async () => {
    await setup(diaryOf(30))
    await userEvent.click(screen.getByRole('radio', { name: 'Fever' }))
    const weekday = card('Average by weekday')
    expect(weekday).toHaveTextContent(/share of days answered yes/i)
    expect(within(weekday).getAllByRole('row').some((r) => /\d+%/.test(r.textContent ?? ''))).toBe(true)
  })

  it('labels a pattern with fewer than 14 days "not enough data" instead of showing weekday and season figures', async () => {
    await setup(diaryOf(13))
    expect(card('Average by weekday')).toHaveTextContent('Not enough data')
    expect(card('Average by weekday')).toHaveTextContent('13 of 14 days')
    expect(within(card('Average by weekday')).queryByRole('row')).not.toBeInTheDocument()
    expect(card('Average by season')).toHaveTextContent('Not enough data')
    expect(within(card('Average by season')).queryByRole('row')).not.toBeInTheDocument()
  })

  it('shows the figures at exactly 14 days', async () => {
    await setup(diaryOf(14))
    expect(card('Average by weekday')).not.toHaveTextContent('Not enough data')
    expect(within(card('Average by weekday')).getAllByRole('row')).toHaveLength(7)
  })

  it('shows how strongly pairs move together and names the strongest pairs with their figure', async () => {
    await setup(diaryOf(30))
    const strongest = within(card('What moves together')).getByRole('list', { name: 'Strongest pairs' })
    expect(within(strongest).getAllByRole('listitem')[0]).toHaveTextContent('Headache and Tiredness')
    expect(strongest).toHaveTextContent('r = 1.00 over 30 days')
  })

  it('names a strong pair even when it involves a sixth or later symptom, not only the five most tracked', async () => {
    const symptoms: Symptom[] = ['s0', 's1', 's2', 's3', 's4', 's5', 's6'].map((id, k) => ({ id, name: `Sym${k}`, type: 'strength' }))
    const entries: Diary['entries'] = {}
    for (let i = 0; i < 30; i++) {
      const day: Record<string, number> = { s0: 4, s1: 4, s2: 4, s3: 4, s4: 4 } // logged most often, never change
      if (i < 14) {
        day.s5 = (i % 5) + 1 // the 6th and 7th most logged: 14 days each, rising and falling together
        day.s6 = (i % 5) + 1
      }
      entries[addDays('2026-11-11', -i)] = day
    }
    await setup({ symptoms, entries, notes: {} })
    expect(within(card('What moves together')).getByRole('list', { name: 'Strongest pairs' })).toHaveTextContent('Sym5 and Sym6')
  })

  it('names no strongest pair when none is strong', async () => {
    await setup(diaryOf(30, [head, tired], (i) => ((i * 3) % 7) + 1))
    // weak or no link: either way, no pair reaches |r| 0.5 in this data
    const r = within(card('What moves together'))
    expect(r.queryByRole('list', { name: 'Strongest pairs' })).not.toBeInTheDocument()
    expect(r.getByText(/no strong link/i)).toBeInTheDocument()
  })

  it('counts the pairs logged together on fewer than 14 days as "not enough data" instead of listing them', async () => {
    const d = diaryOf(30)
    for (let i = 0; i < 30; i++) if (i % 3 !== 0) delete d.entries[addDays('2026-11-11', -i)].t // Tiredness on 10 days
    await setup(d)
    const pairs = card('What moves together')
    // Headache–Tiredness and Tiredness–Fever have 10 shared days; Headache–Fever has 30.
    expect(pairs).toHaveTextContent('2 pairs have not enough data')
    expect(pairs).not.toHaveTextContent('Tiredness ↔')
  })

  it('says nothing about missing data when every pair has enough', async () => {
    await setup(diaryOf(30))
    expect(card('What moves together')).not.toHaveTextContent(/not enough data/i)
  })

  it('counts archived symptoms', async () => {
    const d = diaryOf(30)
    d.symptoms = [{ ...head, archived: true }, tired, fever]
    await setup(d)
    expect(within(screen.getByRole('radiogroup', { name: 'Symptom' })).getByRole('radio', { name: 'Headache' })).toBeInTheDocument()
    expect(within(card('What moves together')).getByRole('list', { name: 'Strongest pairs' })).toHaveTextContent('Headache and Tiredness')
  })

  it('describes symptoms that move in opposite directions as that, not as moving together', async () => {
    await setup(diaryOf(30, [head, tired], (i) => 6 - ((i % 5) + 1)))
    const item = within(within(card('What moves together')).getByRole('list', { name: 'Strongest pairs' })).getAllByRole('listitem')[0]
    expect(item).toHaveTextContent('r = -1.00')
    expect(item).toHaveTextContent('opposite directions')
    expect(item).not.toHaveTextContent('move together')
  })

  it('says correlation is not cause', async () => {
    await setup(diaryOf(30))
    expect(card('What moves together')).toHaveTextContent(/not .*cause/i)
  })

  it('tells the user when nothing is logged yet', async () => {
    render(
      <ClockProvider now={() => NOW}>
        <DiaryProvider repository={memoryRepository({ symptoms: [head], entries: {}, notes: {} })}>
          <PatternsSection />
        </DiaryProvider>
      </ClockProvider>,
    )
    expect(await screen.findByText(/no patterns yet/i)).toBeInTheDocument()
  })
})
