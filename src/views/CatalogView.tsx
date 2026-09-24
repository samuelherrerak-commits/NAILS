import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { Hero } from '../components/Hero'
import { PromoCarousel } from '../components/PromoCarousel'
import { ServiceCard } from '../components/ServiceCard'
import { Button } from '../components/ui/Button'
import { IconWhatsApp } from '../components/ui/icons'
import { CatalogSkeleton } from '../components/ui/Skeleton'
import { haptic, spring } from '../lib/motion'
import type { OrderSummary } from '../lib/pricing'
import { useOrder } from '../state/order'
import type { Catalog, Service } from '../types'

interface CatalogViewProps {
  catalog: Catalog | null
  status: 'loading' | 'ready' | 'error'
  error: string | null
  onRetry: () => void
  summary: OrderSummary
}

export function CatalogView({ catalog, status, error, onRetry, summary }: CatalogViewProps) {
  const { state, dispatch } = useOrder()

  const toggleService = (id: string) => {
    haptic()
    dispatch({ type: 'toggleService', id })
  }
  const togglePromo = (id: string) => {
    haptic()
    dispatch({ type: 'togglePromo', id })
  }

  const base = catalog?.servicios.filter((s) => s.tipo === 'base') ?? []
  const extras = catalog?.servicios.filter((s) => s.tipo === 'adicional') ?? []

  return (
    <div className="pb-36">
      <Hero config={catalog?.config ?? null} />

      {status === 'loading' && (
        <div className="px-5">
          <CatalogSkeleton />
        </div>
      )}

      {status === 'error' && (
        <div className="mx-5 rounded-3xl bg-surface p-6 text-center shadow-card ring-1 ring-line">
          <p className="font-display text-2xl">No pudimos cargar los servicios</p>
          <p className="mt-2 text-[14px] text-muted">{error}</p>
          <Button className="mt-5" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      )}

      {status === 'ready' && catalog && (
        <motion.div
          className="space-y-10"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        >
          <Reveal>
            <PromoCarousel
              promos={catalog.promociones}
              servicios={catalog.servicios}
              selected={state.cart.promos}
              onToggle={togglePromo}
            />
          </Reveal>

          <Reveal>
            <ServiceSection
              id="base"
              title="Servicios"
              subtitle="Elige uno o más."
              services={base}
              selected={state.cart.servicios}
              onToggle={toggleService}
            />
          </Reveal>

          <Reveal>
            <ServiceSection
              id="adicionales"
              title="Adicionales"
              subtitle={
                summary.hasBase ? 'Se suman a tu servicio.' : 'Se suman a un servicio base o promoción.'
              }
              services={extras}
              selected={state.cart.servicios}
              onToggle={toggleService}
            />
          </Reveal>

          <footer className="px-5 pt-4 text-center text-[13px] text-muted">
            <a
              href={`https://wa.me/${catalog.config.whatsapp}`}
              className="inline-flex h-11 items-center gap-2 rounded-full px-4 text-ink ring-1 ring-line"
            >
              <IconWhatsApp size={18} className="text-[#25D366]" /> ¿Dudas? Escríbenos
            </a>
            <p className="mt-6">© {new Date().getFullYear()} Mariana Nails</p>
          </footer>
        </motion.div>
      )}

    </div>
  )
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: spring.gentle } }}
    >
      {children}
    </motion.div>
  )
}

function ServiceSection({
  id,
  title,
  subtitle,
  services,
  selected,
  onToggle,
}: {
  id: string
  title: string
  subtitle: string
  services: Service[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  if (services.length === 0) return null
  return (
    <section aria-labelledby={`${id}-title`} className="px-5">
      <h2 id={`${id}-title`} className="font-display text-[26px] tracking-[-0.01em]">
        {title}
      </h2>
      <p className="mt-0.5 text-[14px] text-muted">{subtitle}</p>
      <div className="mt-4 space-y-2.5">
        {services.map((s) => (
          <ServiceCard key={s.id} service={s} selected={selected.includes(s.id)} onToggle={() => onToggle(s.id)} />
        ))}
      </div>
    </section>
  )
}
