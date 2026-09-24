import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { forwardRef, useEffect, useImperativeHandle, useRef, type KeyboardEvent, type ReactNode } from 'react'
import { METODO_LABEL } from '../../config'
import { spring, tap } from '../../lib/motion'
import type { Payment } from '../../types'
import { IconPhone, IconStore } from '../ui/icons'

export interface PaymentSelectorHandle {
  /** Sacude el selector y lo lleva a la vista cuando falta elegir método. */
  flag: () => void
}

interface PaymentSelectorProps {
  payment: Payment | null
  onSelect: (metodo: Payment['metodo']) => void
  error: string | null
  pagoMovilPanel: ReactNode
}

const OPTIONS = [
  {
    metodo: 'lugar' as const,
    title: METODO_LABEL.lugar,
    description: 'Pagas al llegar a tu cita. No necesitas hacer nada más.',
    Icon: IconStore,
  },
  {
    metodo: 'pago_movil' as const,
    title: METODO_LABEL.pago_movil,
    description: 'Transfiere ahora a tasa BCV y deja tu número de referencia.',
    Icon: IconPhone,
  },
]

export const PaymentSelector = forwardRef<PaymentSelectorHandle, PaymentSelectorProps>(function PaymentSelector(
  { payment, onSelect, error, pagoMovilPanel },
  ref,
) {
  const controls = useAnimationControls()
  const rootRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    flag: () => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      void controls.start({ x: [0, -10, 10, -6, 6, 0], transition: { duration: 0.45 } })
    },
  }))

  // Navegación con flechas dentro del radiogroup.
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([])
  useEffect(() => {
    buttonsRef.current = buttonsRef.current.slice(0, OPTIONS.length)
  }, [])
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return
    e.preventDefault()
    const next = (index + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + OPTIONS.length) % OPTIONS.length
    onSelect(OPTIONS[next].metodo)
    buttonsRef.current[next]?.focus()
  }

  return (
    <motion.div ref={rootRef} animate={controls}>
      <div role="radiogroup" aria-label="Método de pago" aria-required="true" aria-describedby="pago-error" className="space-y-3">
        {OPTIONS.map(({ metodo, title, description, Icon }, index) => {
          const selected = payment?.metodo === metodo
          const tabbable = selected || (!payment && index === 0)
          return (
            <div
              key={metodo}
              className={`overflow-hidden rounded-2xl ring-1 shadow-card transition-[background-color,box-shadow] duration-200 ${
                selected ? 'bg-rose-soft ring-2 ring-rose-deep/50' : error ? 'bg-surface ring-danger/50' : 'bg-surface ring-line'
              }`}
            >
              <motion.button
                ref={(el) => {
                  buttonsRef.current[index] = el
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={tabbable ? 0 : -1}
                onClick={() => onSelect(metodo)}
                onKeyDown={(e) => onKeyDown(e, index)}
                whileTap={tap}
                transition={spring.snappy}
                className="flex min-h-[84px] w-full items-center gap-4 p-4 text-left"
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl transition-colors duration-200 ${
                    selected ? 'bg-rose text-ink' : 'bg-sand text-muted'
                  }`}
                >
                  <Icon size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-medium">{title}</span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted">{description}</span>
                </span>
                <Radio checked={selected} />
              </motion.button>

              <AnimatePresence initial={false}>
                {metodo === 'pago_movil' && selected && (
                  <motion.div
                    key="panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={spring.gentle}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4">{pagoMovilPanel}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <p id="pago-error" className="min-h-[1.25rem] pt-2 text-[13px] text-danger" aria-live="assertive">
        {error}
      </p>
    </motion.div>
  )
})

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={`grid size-6 shrink-0 place-items-center rounded-full ring-[1.5px] transition-colors duration-200 ${
        checked ? 'ring-ink' : 'ring-line'
      }`}
    >
      <motion.span
        className="size-3 rounded-full bg-ink"
        initial={false}
        animate={{ scale: checked ? 1 : 0 }}
        transition={spring.snappy}
      />
    </span>
  )
}
