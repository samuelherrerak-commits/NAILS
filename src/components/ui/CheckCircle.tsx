import { AnimatePresence, motion } from 'framer-motion'
import { spring } from '../../lib/motion'

/** Círculo que se rellena y dibuja un check al seleccionarse. */
export function CheckCircle({ checked, size = 28 }: { checked: boolean; size?: number }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full ring-1 transition-colors duration-200 ${
        checked ? 'ring-transparent' : 'ring-line'
      }`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <AnimatePresence initial={false}>
        {checked && (
          <motion.span
            className="absolute inset-0 rounded-full bg-rose"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={spring.snappy}
          />
        )}
      </AnimatePresence>
      <svg viewBox="0 0 24 24" className="relative size-[60%]" fill="none">
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="var(--color-ink)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ pathLength: { type: 'spring', duration: 0.35, bounce: 0 }, opacity: { duration: 0.1 } }}
        />
      </svg>
    </span>
  )
}
