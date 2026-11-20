import { useState } from 'react'
import type { DayKey } from '../../domain/types'

/**
 * Which day is open and which step of it is shown (0 the overview, 1..n the symptoms in order). Both
 * stay in component state, not the URL (design §9). Changing the day resets the step to the overview.
 */
export function useLogFlow(today: DayKey) {
  const [day, setDay] = useState(today)
  const [step, setStep] = useState(0)
  return {
    day,
    step,
    selectDay(next: DayKey) {
      setDay(next)
      setStep(0)
    },
    goTo: setStep,
  }
}
