import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Button } from '../components/ui/Button'
import { IconCalendar, IconWhatsApp } from '../components/ui/icons'
import type { Modalidad } from '../types'
import { spring } from '../lib/motion'

interface SuccessViewProps {
  whatsappUrl: string
  calendarUrl: string
  modalidad: Modalidad
  onNew: () => void
}

// A domicilio se espera un poco más para que alcance a leer el recordatorio de la ubicación.
const REDIRECT_MS = { spa: 1600, domicilio: 3200 } as const

export function SuccessView({ whatsappUrl, calendarUrl, modalidad, onNew }: SuccessViewProps) {
  // Redirección automática; el botón queda como respaldo si el navegador la bloquea.
  useEffect(() => {
    const t = setTimeout(() => window.location.assign(whatsappUrl), REDIRECT_MS[modalidad])
    return () => clearTimeout(t)
  }, [whatsappUrl, modalidad])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-8 text-center">
      <motion.div
        className="grid size-24 place-items-center rounded-full bg-rose"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }}
      >
        <svg viewBox="0 0 24 24" className="size-11" fill="none" aria-hidden>
          <motion.path
            d="M5 12.5l4.5 4.5L19 7.5"
            stroke="var(--color-ink)"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.25, type: 'spring', duration: 0.5, bounce: 0 }}
          />
        </svg>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring.gentle, delay: 0.15 }}>
        <h1 className="mt-8 font-display text-[38px] leading-tight tracking-[-0.01em]">¡Tu cita está reservada!</h1>
        <p className="mx-auto mt-3 max-w-[30ch] text-[15px] text-muted" role="status">
          Te estamos llevando a WhatsApp para enviar el resumen…
        </p>
        {modalidad === 'domicilio' && (
          <p className="mx-auto mt-4 max-w-[32ch] rounded-2xl bg-rose-soft px-4 py-3 text-[14px] text-ink">
            📍 No olvides enviar tu <b className="font-semibold">ubicación</b> en el chat para llegar a tu casa.
          </p>
        )}
      </motion.div>

      <motion.div
        className="mt-10 w-full max-w-xs space-y-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Button block onClick={() => window.location.assign(whatsappUrl)}>
          <IconWhatsApp size={19} /> Abrir WhatsApp
        </Button>
        <Button block variant="secondary" onClick={() => window.open(calendarUrl, '_blank', 'noopener')}>
          <IconCalendar size={19} /> Agregar a mi calendario
        </Button>
        <Button block variant="ghost" onClick={onNew}>
          Hacer otra reserva
        </Button>
      </motion.div>
    </div>
  )
}
