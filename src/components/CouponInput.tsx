import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { validateCoupon } from '../lib/api'
import { formatEUR } from '../lib/format'
import { haptic, spring, tap } from '../lib/motion'
import type { Coupon } from '../types'
import { Spinner } from './ui/Button'
import { IconTag, IconX } from './ui/icons'

interface CouponInputProps {
  coupon: Coupon | null
  descuento: number
  onApply: (coupon: Coupon | null) => void
}

export function CouponInput({ coupon, descuento, onApply }: CouponInputProps) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shake = useAnimationControls()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!code.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const valid = await validateCoupon(code)
      onApply(valid)
      setCode('')
      haptic(12)
      toast.success(`Cupón ${valid.codigo} aplicado`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cupón no válido')
      void shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5">
      <AnimatePresence mode="popLayout" initial={false}>
        {coupon ? (
          <motion.div
            key="applied"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={spring.snappy}
            className="flex h-14 items-center gap-3 rounded-2xl bg-rose-soft px-4 ring-1 ring-rose"
          >
            <IconTag size={18} className="text-rose-deep" />
            <div className="flex-1 text-[14px]">
              <span className="font-semibold tracking-wide">{coupon.codigo}</span>
              <span className="text-muted">
                {' · '}
                {coupon.porcentaje > 0 ? `−${coupon.porcentaje}%` : `−${formatEUR(coupon.monto)}`}
                {descuento > 0 && ` (${formatEUR(descuento, true)})`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onApply(null)}
              className="-mr-2 grid size-11 place-items-center rounded-full text-muted active:bg-rose/30"
              aria-label="Quitar cupón"
            >
              <IconX size={18} />
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            onSubmit={submit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <label htmlFor="cupon" className="mb-1.5 block text-[13px] font-medium text-muted">
              ¿Tienes un cupón?
            </label>
            <motion.div
              animate={shake}
              className={`flex h-14 items-center gap-2 rounded-2xl bg-surface pl-4 pr-1.5 ring-1 transition-shadow focus-within:ring-2 ${
                error ? 'ring-danger/60' : 'ring-line focus-within:ring-rose-deep/60'
              }`}
            >
              <IconTag size={18} className="shrink-0 text-muted" />
              <input
                id="cupon"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase())
                  if (error) setError(null)
                }}
                placeholder="CÓDIGO"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-invalid={error ? true : undefined}
                aria-describedby="cupon-error"
                className="h-full min-w-0 flex-1 bg-transparent font-medium uppercase tracking-wider placeholder:font-normal placeholder:tracking-wider placeholder:text-muted/50 focus:outline-none"
              />
              <motion.button
                type="submit"
                whileTap={tap}
                disabled={!code.trim() || loading}
                className="grid h-11 min-w-[84px] place-items-center rounded-xl bg-ink px-4 text-[14px] font-medium text-bg transition-opacity disabled:opacity-30"
              >
                {loading ? <Spinner className="size-4" /> : 'Aplicar'}
              </motion.button>
            </motion.div>
            <p id="cupon-error" className="min-h-[1.25rem] pt-1.5 text-[13px] text-danger" aria-live="polite">
              {error}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  )
}
