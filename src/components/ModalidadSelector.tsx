import { motion } from 'framer-motion'
import { formatDuration } from '../lib/format'
import { spring, tap } from '../lib/motion'
import type { BusinessConfig, Modalidad } from '../types'
import { IconHome, IconMapPin, IconSparkle } from './ui/icons'

interface ModalidadSelectorProps {
  value: Modalidad | null
  onChange: (m: Modalidad) => void
  config: Pick<BusinessConfig, 'domicilio' | 'spa'>
}

/** Dónde será la cita: en el spa o a domicilio (con recargo y tiempo extra). */
export function ModalidadSelector({ value, onChange, config }: ModalidadSelectorProps) {
  const options = [
    {
      id: 'spa' as const,
      title: 'En el spa',
      detail: config.spa.direccion || 'Sin recargo',
      Icon: IconSparkle,
    },
    {
      id: 'domicilio' as const,
      title: 'A domicilio',
      detail: `+${config.domicilio.recargoPct} % · +${formatDuration(config.domicilio.minutosExtra)}`,
      Icon: IconHome,
    },
  ]

  return (
    <div className="mt-5">
      <p id="modalidad-label" className="mb-1.5 text-[13px] font-medium text-muted">
        ¿Dónde será tu cita?
      </p>
      <div role="radiogroup" aria-labelledby="modalidad-label" className="grid grid-cols-2 gap-2.5">
        {options.map(({ id, title, detail, Icon }) => {
          const selected = value === id
          return (
            <motion.button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(id)}
              whileTap={tap}
              transition={spring.snappy}
              className={`relative flex min-h-[96px] flex-col items-start justify-between rounded-2xl p-3.5 text-left ring-1 transition-colors duration-200 ${
                selected ? 'text-bg ring-transparent' : 'bg-surface text-ink ring-line shadow-card'
              }`}
            >
              {selected && (
                <motion.span layoutId="modalidad-highlight" className="absolute inset-0 rounded-2xl bg-ink" transition={spring.snappy} />
              )}
              <Icon size={20} className={`relative ${selected ? 'text-rose' : 'text-rose-deep'}`} />
              <span className="relative mt-3 block">
                <span className="block text-[15px] font-medium">{title}</span>
                <span className={`block text-[12px] ${selected ? 'text-bg/70' : 'text-muted'}`}>{detail}</span>
              </span>
            </motion.button>
          )
        })}
      </div>
      <a
        href={config.spa.mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex h-11 items-center gap-1.5 text-[13px] font-medium text-rose-deep"
      >
        <IconMapPin size={16} /> Ver ubicación del spa
      </a>
    </div>
  )
}
