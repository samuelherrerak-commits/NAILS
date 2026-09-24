import { AnimatePresence, motion } from 'framer-motion'
import { formatDuration, formatEUR } from '../lib/format'
import { spring } from '../lib/motion'
import type { OrderLine, OrderSummary as Summary } from '../lib/pricing'
import { useOrder } from '../state/order'
import { CouponInput } from './CouponInput'
import { OrderSummary } from './OrderSummary'
import { BottomSheet } from './ui/BottomSheet'
import { Button } from './ui/Button'
import { IconArrowRight, IconX } from './ui/icons'

interface CartSheetProps {
  open: boolean
  onClose: () => void
  summary: Summary
  onContinue: () => void
}

export function CartSheet({ open, onClose, summary, onContinue }: CartSheetProps) {
  const { state, dispatch } = useOrder()

  const remove = (line: OrderLine) =>
    dispatch(line.kind === 'promo' ? { type: 'togglePromo', id: line.id } : { type: 'toggleService', id: line.id })

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Tu orden"
      footer={
        <div className="pb-1">
          <AnimatePresence initial={false}>
            {summary.count > 0 && !summary.hasBase && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pb-2 text-center text-[13px] text-rose-deep"
              >
                Los adicionales se suman a un servicio base. Agrega uno para continuar.
              </motion.p>
            )}
          </AnimatePresence>
          <Button block onClick={onContinue} disabled={!summary.hasBase}>
            Elegir fecha y hora <IconArrowRight size={18} />
          </Button>
        </div>
      }
    >
      {summary.count === 0 ? (
        <div className="py-12 text-center">
          <p className="font-display text-2xl">Tu orden está vacía</p>
          <p className="mt-2 text-[14px] text-muted">Agrega un servicio o una promoción para empezar.</p>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line/80">
            <AnimatePresence initial={false}>
              {summary.lines.map((line) => (
                <motion.li
                  key={line.key}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring.gentle}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[15px] font-medium leading-snug">
                        {line.nombre}
                        {line.tipo === 'promo' && (
                          <span className="rounded-full bg-rose px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink">
                            Promo
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[13px] text-muted">
                        {line.detalle ? `${line.detalle} · ` : line.tipo === 'adicional' ? 'Adicional · ' : ''}
                        {formatDuration(line.duracionMin)}
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      {line.precioRegular !== undefined && line.precioRegular > line.precio && (
                        <p className="text-[12px] text-muted line-through">{formatEUR(line.precioRegular)}</p>
                      )}
                      <p className="text-[15px] font-medium">{formatEUR(line.precio, true)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(line)}
                      className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors active:bg-sand"
                      aria-label={`Quitar ${line.nombre}`}
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>

          <CouponInput
            coupon={state.coupon}
            descuento={summary.descuento}
            onApply={(coupon) => dispatch({ type: 'setCoupon', coupon })}
          />

          <div className="mt-3">
            <OrderSummary summary={summary} />
          </div>
        </>
      )}
    </BottomSheet>
  )
}
