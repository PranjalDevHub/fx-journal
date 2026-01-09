"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { INSTRUMENTS, getInstrumentLabel, normalizeSymbol } from "@/lib/instruments"
import {
  loadFavoriteInstruments,
  toggleFavoriteInstrument,
} from "@/lib/favorite-instruments"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

type Props = {
  value: string
  onChange: (value: string) => void
}

export function InstrumentSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(() => loadFavoriteInstruments())

  const current = normalizeSymbol(value)

  const favoritesSet = useMemo(() => new Set(favorites), [favorites])

  const sorted = useMemo(() => {
    const fav = INSTRUMENTS.filter((x) => favoritesSet.has(x.symbol))
    const nonFav = INSTRUMENTS.filter((x) => !favoritesSet.has(x.symbol))

    const byCategoryThenName = (a: typeof INSTRUMENTS[number], b: typeof INSTRUMENTS[number]) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return a.symbol.localeCompare(b.symbol)
    }

    fav.sort(byCategoryThenName)
    nonFav.sort(byCategoryThenName)

    return { fav, nonFav }
  }, [favoritesSet])

  function toggle(symbol: string) {
    const next = toggleFavoriteInstrument(symbol)
    setFavorites(next)
  }

  const isCurrentFav = favoritesSet.has(current)

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">
              {current ? getInstrumentLabel(current) : "Select instrument"}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[340px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search instruments (EURUSD, XAUUSD…)" />
            <CommandList>
              <CommandEmpty>No instrument found.</CommandEmpty>

              {sorted.fav.length > 0 ? (
                <CommandGroup heading="Favorites">
                  {sorted.fav.map((item) => (
                    <CommandItem
                      key={item.symbol}
                      value={`${item.symbol} ${item.name} ${item.category}`}
                      onSelect={() => {
                        onChange(item.symbol)
                        setOpen(false)
                      }}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            current === item.symbol ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{item.symbol}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.name} • {item.category}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="p-1"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          toggle(item.symbol)
                        }}
                        aria-label="Toggle favorite"
                      >
                        <Star className={cn("h-4 w-4", "fill-foreground")} />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ) : null}

              <CommandGroup heading="All instruments">
                {sorted.nonFav.map((item) => (
                  <CommandItem
                    key={item.symbol}
                    value={`${item.symbol} ${item.name} ${item.category}`}
                    onSelect={() => {
                      onChange(item.symbol)
                      setOpen(false)
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Check
                        className={cn(
                          "h-4 w-4",
                          current === item.symbol ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{item.symbol}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.name} • {item.category}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-1 opacity-70 hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        toggle(item.symbol)
                      }}
                      aria-label="Toggle favorite"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Star button next to the field (favorite current instrument) */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => toggle(current || "EURUSD")}
        aria-label="Favorite instrument"
        title="Favorite instrument"
      >
        <Star className={cn("h-5 w-5", isCurrentFav ? "fill-foreground" : "")} />
      </Button>
    </div>
  )
}