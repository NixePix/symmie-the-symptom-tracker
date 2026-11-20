/** Time is an input (design §2.5): only this file may default to the real clock. Tests pass a fixed `now`. */
import { createContext, useContext, type ReactNode } from 'react'

const ClockContext = createContext<() => Date>(() => new Date())

export function ClockProvider({ now, children }: { now: () => Date; children: ReactNode }) {
  return <ClockContext value={now}>{children}</ClockContext>
}

/** The current time, read each render. A screen left open past midnight keeps the old day until it re-renders. */
export function useNow(): Date {
  return useContext(ClockContext)()
}
