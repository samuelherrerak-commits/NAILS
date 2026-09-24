import type { Transition } from 'framer-motion'

/** Resortes críticamente amortiguados: rápidos, sin rebote "de juguete". */
export const spring = {
  /** Taps, checks, chips. */
  snappy: { type: 'spring', duration: 0.3, bounce: 0.15 },
  /** Bottom sheets y barras que entran desde abajo. */
  sheet: { type: 'spring', duration: 0.5, bounce: 0.08 },
  /** Transiciones entre pantallas. */
  page: { type: 'spring', duration: 0.45, bounce: 0 },
  /** Elementos que aparecen (listas, alturas). */
  gentle: { type: 'spring', duration: 0.5, bounce: 0.12 },
} satisfies Record<string, Transition>

export const tap = { scale: 0.97 }

/** Vibración corta en Android; en iOS no hace nada. */
export function haptic(ms = 8) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* sin soporte */
  }
}
