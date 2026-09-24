import { motion } from 'framer-motion'
import { spring, tap } from '../../lib/motion'
import { IconChevronLeft } from '../ui/icons'

interface StepHeaderProps {
  step: number
  total: number
  title: string
  onBack: () => void
}

export function StepHeader({ step, total, title, onBack }: StepHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-bg/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="flex items-center gap-1">
        <motion.button
          type="button"
          onClick={onBack}
          whileTap={tap}
          className="grid size-11 place-items-center rounded-full text-ink active:bg-sand"
          aria-label="Volver"
        >
          <IconChevronLeft size={22} />
        </motion.button>
        <div className="flex-1">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">
            Paso {step} de {total}
          </p>
          <h1 className="font-display text-[26px] leading-tight tracking-[-0.01em]">{title}</h1>
        </div>
      </div>
      <div className="mx-2 mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <motion.div
              className="h-full rounded-full bg-rose-deep"
              initial={false}
              animate={{ width: i < step ? '100%' : '0%' }}
              transition={spring.gentle}
            />
          </div>
        ))}
      </div>
    </header>
  )
}
