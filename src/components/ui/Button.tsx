import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'
import { spring, tap } from '../../lib/motion'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  loading?: boolean
  block?: boolean
  children?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-bg shadow-float disabled:bg-ink/35 disabled:shadow-none',
  secondary: 'bg-surface text-ink ring-1 ring-line shadow-card disabled:text-muted',
  ghost: 'bg-transparent text-ink hover:bg-sand/60 disabled:text-muted',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', loading = false, block = false, className = '', disabled, children, ...props },
  ref,
) {
  const isDisabled = disabled || loading
  return (
    <motion.button
      ref={ref}
      type="button"
      whileTap={isDisabled ? undefined : tap}
      transition={spring.snappy}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={`relative inline-flex h-14 select-none items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium tracking-[-0.01em] transition-colors duration-200 ${variants[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <span className={`inline-flex items-center gap-2 transition-opacity duration-150 ${loading ? 'opacity-0' : ''}`}>
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <Spinner />
        </span>
      )}
    </motion.button>
  )
})

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`size-5 animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
