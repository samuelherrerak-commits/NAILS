import { AnimatePresence, motion } from 'framer-motion'
import { formatEUR } from '../lib/format'
import { spring, tap } from '../lib/motion'
import { AnimatedNumber } from './ui/AnimatedNumber'

interface CartBarProps {
  count: number
  total: number
  onOpen: () => void
}

const fmt = (n: number) => formatEUR(n, true)

export function CartBar({ count, total, onOpen }: CartBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={spring.sheet}
        >
          <motion.button
            type="button"
            onClick={onOpen}
            whileTap={tap}
            transition={spring.snappy}
            className="pointer-events-auto flex h-16 w-full items-center gap-3 rounded-full bg-ink pl-2.5 pr-6 text-bg shadow-float"
            aria-label={`Ver mi orden: ${count} ${count === 1 ? 'servicio' : 'servicios'}, total ${fmt(total)}`}
          >
            <span className="relative grid size-11 place-items-center overflow-hidden rounded-full bg-rose text-[15px] font-semibold text-ink">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={count}
                  initial={{ y: 14, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -14, opacity: 0 }}
                  transition={spring.snappy}
                  className="tabular-nums"
                >
                  {count}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="text-[15px] font-medium">Ver mi orden</span>
            <AnimatedNumber value={total} format={fmt} className="ml-auto text-[16px] font-semibold" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
