import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { DateStrip } from '../components/checkout/DateStrip'
import { StepHeader } from '../components/checkout/StepHeader'
import { SlotLegend, TimeGrid } from '../components/checkout/TimeGrid'
import { BottomBar } from '../components/ui/BottomBar'
import { Button } from '../components/ui/Button'
import { IconArrowRight, IconClock } from '../components/ui/icons'
import { capitalize, formatDuration, formatLongDate, formatTime12 } from '../lib/format'
import { spring } from '../lib/motion'
import type { OrderSummary } from '../lib/pricing'
import { buildAgenda } from '../lib/slots'
import { useOrder } from '../state/order'
import type { Catalog } from '../types'

interface AgendaViewProps {
  catalog: Catalog
  summary: OrderSummary
  onBack: () => void
  onContinue: () => void
}

export function AgendaView({ catalog, summary, onBack, onContinue }: AgendaViewProps) {
  const { state, dispatch } = useOrder()
  const days = useMemo(
    () => buildAgenda(catalog.config, catalog.citas, summary.duracionMin),
    [catalog.config, catalog.citas, summary.duracionMin],
  )

  const firstOpen = days.find((d) => d.libres > 0)?.fecha ?? null
  const [fecha, setFecha] = useState<string | null>(state.schedule?.fecha ?? firstOpen)
  const day = days.find((d) => d.fecha === fecha) ?? null
  const hora = state.schedule?.fecha === fecha ? state.schedule.hora : null

  // Si la ocupación cambió y el cupo guardado ya no está libre, se descarta.
  useEffect(() => {
    if (!state.schedule) return
    const d = days.find((x) => x.fecha === state.schedule!.fecha)
    const slot = d?.slots.find((s) => s.hora === state.schedule!.hora)
    if (!slot || slot.estado !== 'libre') dispatch({ type: 'setSchedule', schedule: null })
  }, [days, state.schedule, dispatch])

  useEffect(() => {
    if (fecha && days.some((d) => d.fecha === fecha && d.libres > 0)) return
    setFecha(firstOpen)
  }, [days, fecha, firstOpen])

  return (
    <div className="min-h-dvh pb-40">
      <StepHeader step={1} total={2} title="Fecha y hora" onBack={onBack} />

      <div className="px-5 pt-2">
        <p className="inline-flex items-center gap-2 rounded-full bg-sand/70 px-3 py-1.5 text-[13px] text-muted">
          <IconClock size={15} />
          {summary.count} {summary.count === 1 ? 'servicio' : 'servicios'} · {formatDuration(summary.duracionMin)}
        </p>

        <h2 className="mt-6 text-[13px] font-medium uppercase tracking-[0.08em] text-muted">Día</h2>
        <div className="mt-2">
          {days.length > 0 ? (
            <DateStrip days={days} selected={fecha} onSelect={setFecha} />
          ) : (
            <p className="text-[14px] text-muted">No hay días disponibles por ahora.</p>
          )}
        </div>

        <div className="mt-7 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-medium uppercase tracking-[0.08em] text-muted">
            {fecha ? capitalize(formatLongDate(fecha)) : 'Hora'}
          </h2>
        </div>
        <div className="mt-2">
          <SlotLegend />
        </div>

        <div className="mt-4">
          <AnimatePresence mode="wait" initial={false}>
            {day ? (
              <motion.div
                key={day.fecha}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <TimeGrid
                  slots={day.slots}
                  selected={hora}
                  onSelect={(h) => dispatch({ type: 'setSchedule', schedule: { fecha: day.fecha, hora: h } })}
                />
              </motion.div>
            ) : (
              <p className="rounded-2xl bg-sand/60 p-5 text-center text-[14px] text-muted">
                Escríbenos por WhatsApp y buscamos un espacio para ti.
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomBar>
        <AnimatePresence initial={false}>
          {state.schedule && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.gentle}
              className="overflow-hidden pb-2 text-center text-[14px]"
            >
              {capitalize(formatLongDate(state.schedule.fecha))} · <b className="font-semibold">{formatTime12(state.schedule.hora)}</b>
            </motion.p>
          )}
        </AnimatePresence>
        <Button block disabled={!state.schedule} onClick={onContinue}>
          Continuar al pago <IconArrowRight size={18} />
        </Button>
      </BottomBar>
    </div>
  )
}
