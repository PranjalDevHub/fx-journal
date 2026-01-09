export type InstrumentCategory = "Major FX" | "Minor FX" | "Metals" | "Crypto" | "Indices"

export type InstrumentItem = {
  symbol: string
  name: string
  category: InstrumentCategory
}

export function normalizeSymbol(s: string) {
  return (s ?? "").trim().toUpperCase()
}

export const INSTRUMENTS: InstrumentItem[] = [
  // Major FX
  { symbol: "EURUSD", name: "EUR/USD", category: "Major FX" },
  { symbol: "GBPUSD", name: "GBP/USD", category: "Major FX" },
  { symbol: "USDJPY", name: "USD/JPY", category: "Major FX" },
  { symbol: "USDCHF", name: "USD/CHF", category: "Major FX" },
  { symbol: "USDCAD", name: "USD/CAD", category: "Major FX" },
  { symbol: "AUDUSD", name: "AUD/USD", category: "Major FX" },
  { symbol: "NZDUSD", name: "NZD/USD", category: "Major FX" },

  // Minor FX (popular)
  { symbol: "EURGBP", name: "EUR/GBP", category: "Minor FX" },
  { symbol: "EURJPY", name: "EUR/JPY", category: "Minor FX" },
  { symbol: "GBPJPY", name: "GBP/JPY", category: "Minor FX" },
  { symbol: "AUDJPY", name: "AUD/JPY", category: "Minor FX" },
  { symbol: "CADJPY", name: "CAD/JPY", category: "Minor FX" },
  { symbol: "CHFJPY", name: "CHF/JPY", category: "Minor FX" },
  { symbol: "NZDJPY", name: "NZD/JPY", category: "Minor FX" },

  { symbol: "EURAUD", name: "EUR/AUD", category: "Minor FX" },
  { symbol: "EURCAD", name: "EUR/CAD", category: "Minor FX" },
  { symbol: "EURCHF", name: "EUR/CHF", category: "Minor FX" },
  { symbol: "EURNZD", name: "EUR/NZD", category: "Minor FX" },

  { symbol: "GBPAUD", name: "GBP/AUD", category: "Minor FX" },
  { symbol: "GBPCAD", name: "GBP/CAD", category: "Minor FX" },
  { symbol: "GBPCHF", name: "GBP/CHF", category: "Minor FX" },
  { symbol: "GBPNZD", name: "GBP/NZD", category: "Minor FX" },

  { symbol: "AUDCAD", name: "AUD/CAD", category: "Minor FX" },
  { symbol: "AUDCHF", name: "AUD/CHF", category: "Minor FX" },
  { symbol: "AUDNZD", name: "AUD/NZD", category: "Minor FX" },

  { symbol: "NZDCAD", name: "NZD/CAD", category: "Minor FX" },
  { symbol: "NZDCHF", name: "NZD/CHF", category: "Minor FX" },

  // Metals
  { symbol: "XAUUSD", name: "Gold (XAU/USD)", category: "Metals" },
  { symbol: "XAGUSD", name: "Silver (XAG/USD)", category: "Metals" },

  // Crypto (optional, common CFDs)
  { symbol: "BTCUSD", name: "Bitcoin (BTC/USD)", category: "Crypto" },
  { symbol: "ETHUSD", name: "Ethereum (ETH/USD)", category: "Crypto" },

  // Indices (optional CFD symbols, vary by broker)
  { symbol: "NAS100", name: "Nasdaq 100 (NAS100)", category: "Indices" },
  { symbol: "US30", name: "Dow Jones (US30)", category: "Indices" },
  { symbol: "SPX500", name: "S&P 500 (SPX500)", category: "Indices" },
]

export function getInstrumentLabel(symbol: string) {
  const s = normalizeSymbol(symbol)
  const found = INSTRUMENTS.find((x) => x.symbol === s)
  return found ? found.name : s
}