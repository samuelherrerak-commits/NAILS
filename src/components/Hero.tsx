import { motion } from 'framer-motion'
import { DEMO_MODE } from '../config'
import { toHHMM } from '../lib/format'
import { spring } from '../lib/motion'
import type { BusinessConfig } from '../types'
import { IconClock, IconSparkle } from './ui/icons'

const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** "Lun–Vie 09:00–19:00 · Sáb 09:00–14:00": agrupa días consecutivos con el mismo horario. */
export function scheduleLabel(horario: Array<Array<[number, number]>>): string {
  const order = [1, 2, 3, 4, 5, 6, 0]
  const key = (d: number) => horario[d].map(([a, b]) => `${toHHMM(a)}–${toHHMM(b)}`).join(', ')
  const groups: Array<{ days: number[]; hours: string }> = []
  for (const d of order) {
    if (!horario[d]?.length) continue
    const last = groups[groups.length - 1]
    const prevDay = last?.days[last.days.length - 1]
    if (last && last.hours === key(d) && order.indexOf(d) === order.indexOf(prevDay) + 1) last.days.push(d)
    else groups.push({ days: [d], hours: key(d) })
  }
  return groups
    .map((g) => {
      const days =
        g.days.length > 2
          ? `${DAY_SHORT[g.days[0]]}–${DAY_SHORT[g.days[g.days.length - 1]]}`
          : g.days.map((d) => DAY_SHORT[d]).join(' y ')
      return `${days} ${g.hours}`
    })
    .join(' · ')
}

export function Hero({ config }: { config: BusinessConfig | null }) {
  return (
    <header className="relative overflow-hidden px-5 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))]">
      {/* Halo rosado muy sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-rose/35 blur-3xl"
      />
      <div aria-hidden className="pointer-events-none absolute -left-20 top-24 size-56 rounded-full bg-sand blur-3xl" />

      <div className="relative flex items-center justify-between">
        <span className="font-display text-[30px] tracking-tight">
          <span className="text-muted">By</span>Maria<span className="italic text-rose-deep">Nails</span>
        </span>
        {DEMO_MODE && (
          <span className="rounded-full bg-sand px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            Demo
          </span>
        )}
      </div>

      <motion.div
        className="relative mt-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring.gentle}
      >
        <p className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-rose-deep">
          <IconSparkle size={16} /> Reserva en un minuto
        </p>
        <h1 className="font-display text-[44px] leading-[1.02] tracking-[-0.02em] text-balance">
          Uñas hechas con calma y detalle.
        </h1>
        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-muted text-pretty">
          Elige tus servicios, aparta tu horario y confirma por WhatsApp.
        </p>
        {config && (
          <p className="mt-5 inline-flex max-w-full items-center gap-2 rounded-2xl bg-surface/80 px-3.5 py-2 text-[13px] text-ink shadow-card ring-1 ring-line backdrop-blur">
            <IconClock size={16} className="text-rose-deep" />
            {scheduleLabel(config.horario)}
          </p>
        )}
      </motion.div>
    </header>
  )
}
