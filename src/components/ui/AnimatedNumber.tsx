import { motion, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface AnimatedNumberProps {
  value: number
  format: (n: number) => string
  className?: string
}

/** Número que "rueda" hacia su nuevo valor con un resorte sin rebote. */
export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const reduce = useReducedMotion()
  const mv = useSpring(value, { bounce: 0, duration: 450 })
  const text = useTransform(mv, (v) => format(Math.round(v * 100) / 100))

  useEffect(() => {
    if (reduce) mv.jump(value)
    else mv.set(value)
  }, [value, mv, reduce])

  return (
    <motion.span className={`tabular-nums ${className ?? ''}`} aria-label={format(value)}>
      {text}
    </motion.span>
  )
}
