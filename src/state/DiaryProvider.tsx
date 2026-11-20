/**
 * Holds the diary in memory (design §5.7, §5.8). Loads it once from the repository, applies each edit to
 * the reducer at once and starts the repository write without awaiting it; if a write rejects, the value
 * stays on screen and `saveFailed` becomes true. Two contexts: `useDiary` changes on every edit,
 * `useDiaryActions` returns the same object for the life of the provider.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import type { DiaryRepository } from '../data/DiaryRepository'
import { diaryReducer } from '../domain/diary'
import { emptyDiary, isValidValue, type DayKey, type Diary, type SymptomId, type SymptomType } from '../domain/types'

export interface DiaryState {
  status: 'loading' | 'ready' | 'error'
  diary: Diary
  /** True once any write has been rejected; the value is still shown, but may be lost when the app closes. */
  saveFailed: boolean
  /** Starts at 0 and goes up by one on each `restore`. A component that copies stored text into local state (a draft) mounts with `key={revision}` so it picks up the restored text. */
  revision: number
}

export interface DiaryActions {
  /** Adds a symptom named `name` (trimmed). Callers check `symptomNameError` first; a blank name is ignored here. */
  addSymptom(name: string, type: SymptomType): void
  /** Renames the symptom to `name` (trimmed); its type never changes. Callers check `symptomNameError` first; a blank name or unknown id is ignored. */
  renameSymptom(id: SymptomId, name: string): void
  /** Hides the symptom from the log screen. Its entries stay stored. An unknown id is ignored. */
  archiveSymptom(id: SymptomId): void
  /** Shows an archived symptom on the log screen again. Callers check `symptomNameError` first. */
  unarchiveSymptom(id: SymptomId): void
  /** Deletes the value for (day, symptom); nothing happens if there is none. */
  clearValue(day: DayKey, id: SymptomId): void
  /** Sets the one value for (day, symptom), replacing any earlier. A value invalid for the symptom's type is ignored. */
  setValue(day: DayKey, id: SymptomId, value: number): void
  /** Sets the one note for `day`, replacing any earlier. Empty or blank text deletes the note. */
  setNote(day: DayKey, text: string): void
  /** Replaces the whole diary, on screen and in storage. Callers pass a diary that `parseBackup` accepted. */
  restore(diary: Diary): void
}

const StateContext = createContext<DiaryState | null>(null)
const ActionsContext = createContext<DiaryActions | null>(null)

interface Props {
  repository: DiaryRepository
  /** Generates symptom ids. Tests pass a counter. */
  newId?: () => string
  children: ReactNode
}

type Loaded = { type: 'loaded'; diary: Diary }

export function DiaryProvider({ repository, newId = () => crypto.randomUUID(), children }: Props) {
  const [status, setStatus] = useState<DiaryState['status']>('loading')
  const [saveFailed, setSaveFailed] = useState(false)
  const [revision, setRevision] = useState(0)
  const [diary, dispatch] = useReducer(
    (d: Diary, a: Parameters<typeof diaryReducer>[1] | Loaded) => (a.type === 'loaded' ? a.diary : diaryReducer(d, a)),
    undefined,
    emptyDiary,
  )
  // Actions read the latest diary through a ref so that they can stay the same object across edits.
  const diaryRef = useRef(diary)
  useEffect(() => {
    diaryRef.current = diary
  })

  useEffect(() => {
    let cancelled = false
    repository.load().then(
      (loaded) => {
        if (cancelled) return
        dispatch({ type: 'loaded', diary: loaded })
        setStatus('ready')
      },
      () => {
        if (!cancelled) setStatus('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [repository])

  const actions = useMemo<DiaryActions>(() => {
    const failed = () => setSaveFailed(true)
    return {
      addSymptom(name, type) {
        const trimmed = name.trim()
        if (!trimmed) return
        const id = newId()
        dispatch({ type: 'addSymptom', id, name: trimmed, symptomType: type })
        repository.putSymptom({ id, name: trimmed, type }).catch(failed)
      },
      renameSymptom(id, name) {
        const symptom = diaryRef.current.symptoms.find((s) => s.id === id)
        const trimmed = name.trim()
        if (!symptom || !trimmed) return
        dispatch({ type: 'renameSymptom', id, name: trimmed })
        repository.putSymptom({ ...symptom, name: trimmed }).catch(failed)
      },
      archiveSymptom(id) {
        const symptom = diaryRef.current.symptoms.find((s) => s.id === id)
        if (!symptom) return
        dispatch({ type: 'archiveSymptom', id })
        repository.putSymptom({ ...symptom, archived: true }).catch(failed)
      },
      unarchiveSymptom(id) {
        const symptom = diaryRef.current.symptoms.find((s) => s.id === id)
        if (!symptom) return
        dispatch({ type: 'unarchiveSymptom', id })
        const { archived: _archived, ...active } = symptom
        void _archived
        repository.putSymptom(active).catch(failed)
      },
      clearValue(day, id) {
        if (diaryRef.current.entries[day]?.[id] === undefined) return
        dispatch({ type: 'clearValue', day, id })
        repository.putEntry(day, id).catch(failed)
      },
      setValue(day, id, value) {
        const symptom = diaryRef.current.symptoms.find((s) => s.id === id)
        if (!symptom || !isValidValue(symptom.type, value)) return
        dispatch({ type: 'setValue', day, id, value })
        repository.putEntry(day, id, value).catch(failed)
      },
      setNote(day, text) {
        const stored = text.trim() === '' ? '' : text
        dispatch({ type: 'setNote', day, text: stored })
        repository.putNote(day, stored).catch(failed)
      },
      restore(next) {
        dispatch({ type: 'restore', diary: next })
        setRevision((r) => r + 1)
        repository.replaceAll(next).catch(failed)
      },
    }
    // newId is a fixed function for the life of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repository])

  const state = useMemo<DiaryState>(() => ({ status, diary, saveFailed, revision }), [status, diary, saveFailed, revision])
  return (
    <ActionsContext value={actions}>
      <StateContext value={state}>{children}</StateContext>
    </ActionsContext>
  )
}

export function useDiary(): DiaryState {
  const state = useContext(StateContext)
  if (!state) throw new Error('useDiary must be used inside DiaryProvider')
  return state
}

export function useDiaryActions(): DiaryActions {
  const actions = useContext(ActionsContext)
  if (!actions) throw new Error('useDiaryActions must be used inside DiaryProvider')
  return actions
}
