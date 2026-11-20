/**
 * The diary as CSV text for a spreadsheet. One row per day and symptom value, plus one row per day
 * note (type `note`, text in the value column). Pure: the caller picks the range and does the download.
 */
import type { DayKey, Diary } from './types'

/** U+FEFF. Excel reads a CSV as the local ANSI code page unless the file starts with the UTF-8 byte order mark. */
export const CSV_BOM = '﻿'

const HEADER = ['date', 'symptom', 'type', 'value']

/** Text a spreadsheet would evaluate as a formula when it starts with one of these characters. */
const FORMULA_START = /^[=+\-@\t\r]/

function cell(text: string): string {
  const safe = FORMULA_START.test(text) ? `'${text}` : text
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

const line = (cells: string[]) => cells.map(cell).join(',')

/** The days from `from` to `to`, both included, that have a value or a note, oldest first. */
export function daysWithData(diary: Diary, from: DayKey, to: DayKey): DayKey[] {
  const inRange = (day: DayKey) => day >= from && day <= to
  return [...new Set([...Object.keys(diary.entries), ...Object.keys(diary.notes)])].filter(inRange).sort()
}

/**
 * CSV for the days from `from` to `to`, both included, oldest first. Within a day, values follow the
 * symptom order and the note comes last. Entries of archived symptoms are included. Lines end in CRLF
 * (RFC 4180); a note's own line breaks stay inside its quoted cell.
 */
export function diaryToCsv(diary: Diary, from: DayKey, to: DayKey): string {
  const lines = [line(HEADER)]
  for (const day of daysWithData(diary, from, to)) {
    const values = diary.entries[day] ?? {}
    for (const s of diary.symptoms) {
      const v = values[s.id]
      if (v === undefined) continue
      lines.push(line([day, s.name, s.type, s.type === 'yesno' ? (v === 1 ? 'yes' : 'no') : String(v)]))
    }
    const note = diary.notes[day]
    if (note) lines.push(line([day, '', 'note', note]))
  }
  return CSV_BOM + lines.join('\r\n') + '\r\n'
}
