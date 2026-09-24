import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { formatBs, formatDuration, formatEUR } from '../lib/format'
import { spring } from '../lib/motion'
import type { OrderSummary as Summary } from '../lib/pricing'
import { AnimatedNumber } from './ui/AnimatedNumber'

const fmt = (n: number) => formatEUR(n, true)

export function OrderSummary({ summary, showBs = false }: { summary: Summary; showBs?: boolean }) {
  return (
    <dl className="space-y-2 rounded-2xl bg-sand/60 p-4 text-[14px]">
      <Row label="Subtotal">
        <AnimatedNumber value={summary.subtotal} format={fmt} />
      </Row>
      <AnimatePresence initial={false}>
        {summary.recargo > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <Row label={`A domicilio (+${summary.recargoPct} %)`}>
              +<AnimatedNumber value={summary.recargo} format={fmt} />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {summary.descuento > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={spring.gentle}
            className="overflow-hidden"
          >
            <Row label="Descuento" className="text-rose-deep">
              −<AnimatedNumber value={summary.descuento} format={fmt} />
            </Row>
          </motion.div>
        )}
      </AnimatePresence>
      <Row label="Duración aprox." className="text-muted">
        {formatDuration(summary.duracionMin)}
      </Row>
      <div className="!mt-3 flex items-baseline justify-between border-t border-line pt-3">
        <dt className="font-medium">Total</dt>
        <dd className="text-right">
          <AnimatedNumber value={summary.total} format={fmt} className="text-[20px] font-semibold tracking-[-0.02em]" />
          {showBs && summary.totalBs !== null && (
            <span className="block text-[12px] text-muted tabular-nums">≈ {formatBs(summary.totalBs)}</span>
          )}
        </dd>
      </div>
    </dl>
  )
}

function Row({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}
