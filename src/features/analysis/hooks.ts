import { useMemo } from 'react'
import { toDayKey } from '../../domain/dates'
import { pairCorrelations, strongestPairs } from '../../domain/patterns'
import { evolutionSeries, symptomsWithData, type EvolutionMode } from '../../domain/stats'
import { useDiary } from '../../state/DiaryProvider'
import { useNow } from '../../state/ClockProvider'

/** The graph's buckets and series for `mode`, recomputed when the diary or the day changes. */
export function useEvolutionSeries(mode: EvolutionMode) {
  const { diary } = useDiary()
  const today = toDayKey(useNow())
  return useMemo(() => evolutionSeries(diary, mode, today), [diary, mode, today])
}

/** Symptoms with data (archived included), most logged first, and the strength of every pair of them, and the strongest pairs. */
export function usePatterns() {
  const { diary } = useDiary()
  return useMemo(() => {
    const symptoms = symptomsWithData(diary)
    const pairs = pairCorrelations(diary, symptoms)
    return { diary, symptoms, pairs, strongest: strongestPairs(pairs) }
  }, [diary])
}
