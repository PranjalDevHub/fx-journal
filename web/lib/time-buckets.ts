export type Session = "Asia" | "London" | "Overlap" | "New York"

export const WEEKDAYS_MON_FIRST = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

// Convert JS getUTCDay() (Sun=0..Sat=6) to Monday-first index (Mon=0..Sun=6)
export function utcDayToMonFirstIndex(utcDay: number) {
  // Sun(0) -> 6, Mon(1)->0, Tue(2)->1, ... Sat(6)->5
  return (utcDay + 6) % 7
}

export function getUtcHour(iso: string) {
  return new Date(iso).getUTCHours() // 0..23
}

export function getUtcWeekdayMonFirstIndex(iso: string) {
  const d = new Date(iso)
  return utcDayToMonFirstIndex(d.getUTCDay())
}

// Simple session model in UTC (MVP).
// We also include "Overlap" because it is often a distinct performance window.
export function getSessionFromUtcHour(hour: number): Session {
  // Asia: 22–06
  if (hour >= 22 || hour <= 6) return "Asia"

  // London: 07–12
  if (hour >= 7 && hour <= 12) return "London"

  // Overlap: 13–16
  if (hour >= 13 && hour <= 16) return "Overlap"

  // New York: 17–21
  return "New York"
}