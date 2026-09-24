import { AnimatePresence, motion } from 'framer-motion'
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  error?: string | null
  trailing?: ReactNode
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, className = '', id, ...props },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const describedBy = `${inputId}-desc`
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-muted">
        {label}
      </label>
      <div
        className={`flex h-14 items-center rounded-2xl bg-surface px-4 ring-1 transition-shadow duration-200 focus-within:ring-2 ${
          error ? 'ring-danger/60 focus-within:ring-danger/70' : 'ring-line focus-within:ring-rose-deep/60'
        }`}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/60 focus:outline-none focus-visible:outline-none"
          {...props}
        />
        {trailing}
      </div>
      <div id={describedBy} className="min-h-0 text-[13px]">
        <AnimatePresence initial={false} mode="wait">
          {error ? (
            <motion.p
              key="error"
              className="pt-1.5 text-danger"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {error}
            </motion.p>
          ) : hint ? (
            <motion.p key="hint" className="pt-1.5 text-muted" initial={false}>
              {hint}
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
})
