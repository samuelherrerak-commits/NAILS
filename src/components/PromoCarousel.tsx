import { AnimatePresence, motion } from 'framer-motion'
import { formatDuration, formatEUR } from '../lib/format'
import { spring, tap } from '../lib/motion'
import { promoDuration, promoRegularPrice, promoServices, round2 } from '../lib/pricing'
import type { Promo, Service } from '../types'
import { IconTag } from './ui/icons'

interface PromoCarouselProps {
  promos: Promo[]
  servicios: Service[]
  selected: string[]
  onToggle: (id: string) => void
}

export function PromoCarousel({ promos, servicios, selected, onToggle }: PromoCarouselProps) {
  if (promos.length === 0) return null
  return (
    <section aria-labelledby="promos-title">
      <div className="flex items-baseline justify-between px-5">
        <h2 id="promos-title" className="font-display text-[26px] tracking-[-0.01em]">
          Promociones
        </h2>
        <span className="text-[13px] text-muted">Desliza →</span>
      </div>
      <div className="no-scrollbar mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-5 px-5 pb-2">
        {promos.map((promo) => (
          <PromoCard
            key={promo.id}
            promo={promo}
            servicios={servicios}
            selected={selected.includes(promo.id)}
            onToggle={() => onToggle(promo.id)}
          />
        ))}
      </div>
    </section>
  )
}

function PromoCard({
  promo,
  servicios,
  selected,
  onToggle,
}: {
  promo: Promo
  servicios: Service[]
  selected: boolean
  onToggle: () => void
}) {
  const regular = promoRegularPrice(promo, servicios)
  const ahorro = round2(regular - promo.precio)
  const incluidos = promoServices(promo, servicios)

  return (
    <motion.article
      className={`relative flex w-[78%] max-w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-3xl p-5 ring-1 transition-colors duration-300 ${
        selected ? 'bg-rose-soft ring-rose' : 'bg-surface ring-line'
      } shadow-card`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-rose/30 blur-2xl"
      />
      <div className="relative flex items-center justify-between">
        {ahorro > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium text-bg">
            <IconTag size={13} /> Ahorras {formatEUR(ahorro)}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[12px] text-muted">{formatDuration(promoDuration(promo, servicios))}</span>
      </div>

      <h3 className="relative mt-4 font-display text-[24px] leading-tight">{promo.nombre}</h3>
      <ul className="relative mt-2 space-y-0.5 text-[13px] text-muted">
        {incluidos.map((s) => (
          <li key={s.id}>· {s.nombre}</li>
        ))}
      </ul>

      <div className="relative mt-auto flex items-end justify-between pt-5">
        <div className="tabular-nums">
          {ahorro > 0 && <p className="text-[13px] text-muted line-through">{formatEUR(regular)}</p>}
          <p className="text-[22px] font-semibold tracking-[-0.02em]">{formatEUR(promo.precio)}</p>
        </div>
        <motion.button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          aria-label={`${selected ? 'Quitar' : 'Agregar'} ${promo.nombre}`}
          whileTap={tap}
          transition={spring.snappy}
          className={`relative h-11 overflow-hidden rounded-full px-5 text-[14px] font-medium transition-colors duration-200 ${
            selected ? 'bg-ink text-bg' : 'bg-rose text-ink'
          }`}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={selected ? 'on' : 'off'}
              className="block"
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={spring.snappy}
            >
              {selected ? 'Agregada ✓' : 'Agregar'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.article>
  )
}
