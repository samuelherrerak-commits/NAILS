import { motion, useIsPresent } from 'framer-motion'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { spring } from '../../lib/motion'

/**
 * Barra de acción fija abajo. Va en un portal para que el `transform` de la
 * transición de página no la desplace, y sale/entra con la pantalla.
 */
export function BottomBar({ children }: { children: ReactNode }) {
  const isPresent = useIsPresent()
  return createPortal(
    <motion.div
      className="pb-safe fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-line/70 bg-bg/90 px-5 pt-3 backdrop-blur-md"
      initial={{ y: '100%' }}
      animate={{ y: isPresent ? 0 : '100%' }}
      transition={spring.sheet}
    >
      {children}
    </motion.div>,
    document.body,
  )
}
