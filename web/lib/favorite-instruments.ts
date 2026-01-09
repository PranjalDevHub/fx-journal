import { normalizeSymbol } from "./instruments"

const KEY = "fxj.favoriteInstruments.v1"

export function loadFavoriteInstruments(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(arr)) return []
    return arr
      .map((x) => normalizeSymbol(String(x)))
      .filter(Boolean)
  } catch {
    return []
  }
}

export function saveFavoriteInstruments(favs: string[]) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(KEY, JSON.stringify(favs))
}

export function toggleFavoriteInstrument(symbol: string): string[] {
  const s = normalizeSymbol(symbol)
  const favs = loadFavoriteInstruments()
  const exists = favs.includes(s)

  const next = exists ? favs.filter((x) => x !== s) : [s, ...favs]
  saveFavoriteInstruments(next)
  return next
}