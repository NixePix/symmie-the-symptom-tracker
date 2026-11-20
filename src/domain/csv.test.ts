import { CSV_BOM, diaryToCsv } from './csv'
import type { Diary } from './types'

const diary: Diary = {
  symptoms: [
    { id: 'a', name: 'Headache', type: 'strength' },
    { id: 'b', name: 'Nausea', type: 'yesno' },
    { id: 'c', name: 'Hovedpine, øm "nakke"', type: 'strength', archived: true },
  ],
  entries: {
    '2026-11-09': { a: 7 },
    '2026-11-10': { b: 1, a: 3, c: 5 },
    '2026-11-11': { b: 0 },
    '2026-11-20': { a: 9 },
  },
  notes: { '2026-11-10': 'Slept badly,\nrain', '2026-11-12': 'Only a note' },
}

const lines = (csv: string) => csv.replace(CSV_BOM, '').split('\r\n').filter(Boolean)

describe('diaryToCsv', () => {
  it('starts with a header and has one row per day and symptom, in date then symptom order', () => {
    const out = lines(diaryToCsv(diary, '2026-11-09', '2026-11-11'))
    expect(out[0]).toBe('date,symptom,type,value')
    expect(out.slice(1, 4)).toEqual([
      '2026-11-09,Headache,strength,7',
      '2026-11-10,Headache,strength,3',
      '2026-11-10,Nausea,yesno,yes',
    ])
  })

  it('writes yes/no values as the words yes and no', () => {
    expect(lines(diaryToCsv(diary, '2026-11-11', '2026-11-11'))).toContain('2026-11-11,Nausea,yesno,no')
  })

  it('includes both end dates and nothing outside the range', () => {
    const csv = diaryToCsv(diary, '2026-11-10', '2026-11-11')
    expect(csv).not.toContain('2026-11-09')
    expect(csv).not.toContain('2026-11-20')
    expect(csv).toContain('2026-11-10,Headache')
    expect(csv).toContain('2026-11-11,Nausea')
  })

  it('writes each day note once, as a row of type note with the text in the value column', () => {
    const csv = diaryToCsv(diary, '2026-11-09', '2026-11-12')
    expect(csv.match(/,note,/g)).toHaveLength(2)
    expect(csv).toContain('2026-11-10,,note,"Slept badly,\nrain"\r\n')
    expect(csv).toContain('2026-11-12,,note,Only a note\r\n')
  })

  it('puts a day note after that day’s values', () => {
    const out = lines(diaryToCsv(diary, '2026-11-10', '2026-11-10'))
    expect(out[out.length - 2]).toContain('Hovedpine')
    expect(out[out.length - 1]).toContain('note')
  })

  it('quotes cells holding commas, quotes or line breaks, and doubles the quotes', () => {
    expect(diaryToCsv(diary, '2026-11-10', '2026-11-10')).toContain('2026-11-10,"Hovedpine, øm ""nakke""",strength,5')
  })

  it('includes entries of archived symptoms', () => {
    expect(diaryToCsv(diary, '2026-11-10', '2026-11-10')).toContain('Hovedpine')
  })

  it('starts with a UTF-8 byte order mark so a spreadsheet reads non-English names correctly', () => {
    expect(diaryToCsv(diary, '2026-11-09', '2026-11-09').startsWith('﻿')).toBe(true)
  })

  it('keeps non-English characters unchanged', () => {
    const d: Diary = { symptoms: [{ id: 'x', name: 'Mağ ağrısı 頭痛', type: 'yesno' }], entries: { '2026-01-01': { x: 1 } }, notes: {} }
    expect(diaryToCsv(d, '2026-01-01', '2026-01-01')).toContain('2026-01-01,Mağ ağrısı 頭痛,yesno,yes')
  })

  it('prefixes a cell that a spreadsheet would run as a formula with an apostrophe', () => {
    const d: Diary = {
      symptoms: [{ id: 'x', name: '=SUM(A1)', type: 'yesno' }],
      entries: { '2026-01-01': { x: 1 } },
      notes: { '2026-01-01': '-2+3' },
    }
    const csv = diaryToCsv(d, '2026-01-01', '2026-01-01')
    expect(csv).toContain("'=SUM(A1)")
    expect(csv).toContain(",note,'-2+3")
  })

  it('has only the header when nothing falls in the range', () => {
    expect(lines(diaryToCsv(diary, '2030-01-01', '2030-01-02'))).toEqual(['date,symptom,type,value'])
  })
})
