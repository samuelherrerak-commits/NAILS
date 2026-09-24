import { motion } from 'framer-motion'
import { formatDuration, formatEUR } from '../lib/format'
import { spring, tap } from '../lib/motion'
import type { Service } from '../types'
import { CheckCircle } from './ui/CheckCircle'

interface ServiceCardProps {
  service: Service
  selected: boolean
  onToggle: () => void
}

export function ServiceCard({ service, selected, onToggle }: ServiceCardProps) {
  const extra = service.tipo === 'adicional'
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      whileTap={tap}
      transition={spring.snappy}
      className={`flex min-h-[76px] w-full items-center gap-4 rounded-2xl p-4 text-left shadow-card ring-1 transition-[background-color,box-shadow] duration-200 ${
        selected ? 'bg-rose-soft ring-rose' : 'bg-surface ring-line'
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug tracking-[-0.01em]">{service.nombre}</p>
        <p className="mt-0.5 text-[13px] text-muted">
          {extra ? `+${formatDuration(service.duracionMin)}` : formatDuration(service.duracionMin)}
        </p>
      </div>
      <span className="text-[15px] font-medium tabular-nums">
        {extra ? '+' : ''}
        {formatEUR(service.precio)}
      </span>
      <CheckCircle checked={selected} />
    </motion.button>
  )
}
