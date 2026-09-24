import { motion } from 'framer-motion'
import { formatTime12 } from '../../lib/format'
import { spring, tap } from '../../lib/motion'
import type { Slot } from '../../lib/slots'

interface TimeGridProps {
  slots: Slot[]
  selected: string | null
  onSelect: (hora: string) => void
}

export function TimeGrid({ slots, selected, onSelect }: TimeGridProps) {
  // Los horarios que ya pasaron no se muestran; los reservados sí, bloqueados.
  const visible = slots.filter((s) => s.estado !== 'pasado')
  const groups = [
    { label: 'Mañana', items: visible.filter((s) => s.minutos < 12 * 60) },
    { label: 'Tarde', items: visible.filter((s) => s.minutos >= 12 * 60) },
  ].filter((g) => g.items.length > 0)

  if (visible.length === 0) {
    return (
      <p className="rounded-2xl bg-sand/60 p-5 text-center text-[14px] text-muted">
        No quedan horarios para este día. Prueba con otra fecha.
      </p>
    )
  }

  return (
    <div className="space-y-5" role="radiogroup" aria-label="Hora de la cita">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="mb-2 text-[12px] font-medium uppercase tracking-[0.08em] text-muted">{group.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {group.items.map((slot) => {
              const reserved = slot.estado === 'reservado'
              const isSelected = slot.hora === selected
              return (
                <motion.button
                  key={slot.hora}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${formatTime12(slot.hora)}${reserved ? ', reservado' : ''}`}
                  disabled={reserved}
                  onClick={() => onSelect(slot.hora)}
                  whileTap={reserved ? undefined : tap}
                  transition={spring.snappy}
                  className={`relative h-12 rounded-xl text-[14px] font-medium tabular-nums transition-colors duration-200 ${
                    reserved
                      ? 'bg-sand/60 text-muted/50 line-through decoration-muted/40'
                      : isSelected
                        ? 'text-bg'
                        : 'bg-surface text-ink ring-1 ring-rose shadow-card'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="slot-highlight"
                      className="absolute inset-0 rounded-xl bg-ink"
                      transition={spring.snappy}
                    />
                  )}
                  <span className="relative">{formatTime12(slot.hora)}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SlotLegend() {
  return (
    <div className="flex items-center gap-4 text-[12px] text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-surface ring-1 ring-rose" aria-hidden /> Disponible
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-3 rounded-[4px] bg-sand" aria-hidden /> <span className="line-through">Reservado</span>
      </span>
    </div>
  )
}
