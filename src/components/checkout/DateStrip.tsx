import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import { formatMonthShort, formatWeekdayShort } from '../../lib/format'
import { spring, tap } from '../../lib/motion'
import type { DayOption } from '../../lib/slots'

interface DateStripProps {
  days: DayOption[]
  selected: string | null
  onSelect: (fecha: string) => void
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  const selectedRef = useRef<HTMLButtonElement>(null)

  // Mantiene el día elegido a la vista (p. ej. al volver del paso de pago).
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [selected])

  return (
    <div
      role="radiogroup"
      aria-label="Día de la cita"
      className="no-scrollbar -mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 py-1"
    >
      {days.map((day) => {
        const isSelected = day.fecha === selected
        const full = day.libres === 0
        const [, , dd] = day.fecha.split('-')
        return (
          <motion.button
            key={day.fecha}
            ref={isSelected ? selectedRef : undefined}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${formatWeekdayShort(day.fecha)} ${Number(dd)} ${formatMonthShort(day.fecha)}${full ? ', completo' : `, ${day.libres} horarios libres`}`}
            disabled={full}
            onClick={() => onSelect(day.fecha)}
            whileTap={full ? undefined : tap}
            transition={spring.snappy}
            className={`relative flex h-[86px] w-[62px] shrink-0 snap-start flex-col items-center justify-center rounded-2xl ring-1 transition-colors duration-200 ${
              isSelected ? 'text-bg ring-transparent' : full ? 'bg-sand/50 text-muted/60 ring-transparent' : 'bg-surface text-ink ring-line'
            }`}
          >
            {isSelected && (
              <motion.span
                layoutId="day-highlight"
                className="absolute inset-0 rounded-2xl bg-ink"
                transition={spring.snappy}
              />
            )}
            <span className="relative text-[11px] font-medium uppercase tracking-wider opacity-70">
              {formatWeekdayShort(day.fecha)}
            </span>
            <span className="relative mt-0.5 text-[22px] font-semibold tabular-nums leading-none">{Number(dd)}</span>
            <span className="relative mt-1.5 text-[10px] leading-none">
              {full ? (
                'Completo'
              ) : (
                <span
                  className={`inline-block size-1.5 rounded-full ${isSelected ? 'bg-rose' : 'bg-rose-deep'}`}
                  aria-hidden
                />
              )}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
