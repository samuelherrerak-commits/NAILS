import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CustomerForm, validateCustomer } from '../components/checkout/CustomerForm'
import { PagoMovilDetails } from '../components/checkout/PagoMovilDetails'
import { PaymentSelector, type PaymentSelectorHandle } from '../components/checkout/PaymentSelector'
import { StepHeader } from '../components/checkout/StepHeader'
import { OrderSummary } from '../components/OrderSummary'
import { BottomBar } from '../components/ui/BottomBar'
import { Button } from '../components/ui/Button'
import { IconCalendar, IconWhatsApp } from '../components/ui/icons'
import { METODO_LABEL } from '../config'
import { ApiError, submitReservation } from '../lib/api'
import { capitalize, formatEUR, formatLongDate, formatTime12 } from '../lib/format'
import { servicesText, type OrderSummary as Summary } from '../lib/pricing'
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../lib/whatsapp'
import { useOrder } from '../state/order'
import type { Catalog, ReservationPayload } from '../types'

interface PaymentViewProps {
  catalog: Catalog
  summary: Summary
  onBack: () => void
  /** El cupo se ocupó mientras la clienta llenaba el formulario. */
  onSlotTaken: () => void
  onSuccess: (whatsappUrl: string) => void
}

const REFERENCIA_RE = /^\d{4,20}$/

export function PaymentView({ catalog, summary, onBack, onSlotTaken, onSuccess }: PaymentViewProps) {
  const { state, dispatch } = useOrder()
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const selectorRef = useRef<PaymentSelectorHandle>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const telefonoRef = useRef<HTMLInputElement>(null)
  const referenciaRef = useRef<HTMLInputElement>(null)

  const { customer, payment, schedule, coupon } = state
  const customerErrors = validateCustomer(customer)
  const paymentError = attempted && !payment ? 'Elige cómo vas a pagar para continuar.' : null
  const referenciaError =
    attempted && payment?.metodo === 'pago_movil' && !REFERENCIA_RE.test(payment.referencia)
      ? 'Escribe al menos 4 dígitos de la referencia.'
      : null

  const confirm = async () => {
    if (submitting) return
    setAttempted(true)

    if (!schedule) return onBack()
    if (customerErrors.nombre) return nombreRef.current?.focus()
    if (customerErrors.telefono) return telefonoRef.current?.focus()
    if (!payment) return selectorRef.current?.flag()
    if (payment.metodo === 'pago_movil' && !REFERENCIA_RE.test(payment.referencia)) {
      referenciaRef.current?.focus()
      referenciaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    const payload: ReservationPayload = {
      cliente: customer.nombre.trim(),
      telefono: customer.telefono.trim(),
      servicios: servicesText(summary.lines),
      items: state.cart,
      total: summary.total,
      fechaCita: schedule.fecha,
      horaCita: schedule.hora,
      duracionTotalMin: summary.duracionMin,
      metodoPago: METODO_LABEL[payment.metodo],
      referencia: payment.metodo === 'pago_movil' ? payment.referencia : '',
      cupon: coupon?.codigo ?? '',
    }

    setSubmitting(true)
    try {
      const result = await submitReservation(payload)
      // El servidor recalcula el total: el mensaje usa sus cifras si vienen.
      const finalSummary: Summary = {
        ...summary,
        total: result.total,
        totalBs: result.totalBs ?? summary.totalBs,
      }
      const tasa = result.tasa ? { valor: result.tasa, fecha: catalog.tasa?.fecha ?? null, fuente: 'BCV' } : catalog.tasa
      const message = buildWhatsAppMessage({
        negocio: catalog.config.nombreNegocio,
        customer,
        schedule,
        summary: finalSummary,
        coupon,
        payment,
        tasa,
        reservaId: result.id,
      })
      onSuccess(buildWhatsAppUrl(catalog.config.whatsapp, message))
    } catch (err) {
      setSubmitting(false)
      if (err instanceof ApiError && err.code === 'cupo_ocupado') {
        toast.error('Ese horario acaba de ocuparse. Elige otro, por favor.')
        onSlotTaken()
      } else if (err instanceof ApiError && err.code === 'cupon_invalido') {
        dispatch({ type: 'setCoupon', coupon: null })
        toast.error('El cupón ya no es válido. Actualizamos tu total.')
      } else {
        toast.error(err instanceof Error ? err.message : 'No se pudo completar la reserva.')
      }
    }
  }

  return (
    <div className="min-h-dvh pb-44">
      <StepHeader step={2} total={2} title="Confirma y paga" onBack={onBack} />

      <div className="space-y-8 px-5 pt-2">
        {/* Resumen de la cita */}
        <section aria-labelledby="resumen-title" className="rounded-3xl bg-surface p-4 shadow-card ring-1 ring-line">
          <h2 id="resumen-title" className="sr-only">
            Resumen
          </h2>
          {schedule && (
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-rose-soft text-rose-deep">
                <IconCalendar size={20} />
              </span>
              <div className="flex-1">
                <p className="text-[15px] font-medium">{capitalize(formatLongDate(schedule.fecha))}</p>
                <p className="text-[13px] text-muted">{formatTime12(schedule.hora)}</p>
              </div>
              <button
                type="button"
                onClick={onBack}
                className="h-11 rounded-full px-3 text-[14px] font-medium text-rose-deep active:bg-rose-soft"
              >
                Cambiar
              </button>
            </div>
          )}
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4 text-[14px]">
            {summary.lines.map((l) => (
              <li key={l.key} className="flex justify-between gap-3">
                <span className="text-ink/90">{l.nombre}</span>
                <span className="tabular-nums text-muted">{formatEUR(l.precio, true)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4">
            <OrderSummary summary={summary} showBs={payment?.metodo === 'pago_movil'} />
          </div>
        </section>

        <section aria-labelledby="datos-title">
          <h2 id="datos-title" className="mb-3 font-display text-[24px]">
            Tus datos
          </h2>
          <CustomerForm
            customer={customer}
            onChange={(patch) => dispatch({ type: 'setCustomer', customer: patch })}
            errors={customerErrors}
            showErrors={attempted}
            nombreRef={nombreRef}
            telefonoRef={telefonoRef}
          />
        </section>

        <section aria-labelledby="pago-title">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="pago-title" className="font-display text-[24px]">
              Método de pago
            </h2>
            <span className="text-[12px] font-medium uppercase tracking-[0.08em] text-rose-deep">Obligatorio</span>
          </div>
          <PaymentSelector
            ref={selectorRef}
            payment={payment}
            onSelect={(metodo) => dispatch({ type: 'setPaymentMethod', metodo })}
            error={paymentError}
            pagoMovilPanel={
              payment?.metodo === 'pago_movil' && (
                <PagoMovilDetails
                  ref={referenciaRef}
                  data={catalog.config.pagoMovil}
                  totalBs={summary.totalBs}
                  tasa={catalog.tasa}
                  referencia={payment.referencia}
                  onReferencia={(referencia) => dispatch({ type: 'setReferencia', referencia })}
                  error={referenciaError}
                />
              )
            }
          />
        </section>
      </div>

      <BottomBar>
        <Button block loading={submitting} onClick={confirm}>
          <IconWhatsApp size={19} /> Reservar · {formatEUR(summary.total, true)}
        </Button>
        <p className="pt-2 text-center text-[12px] text-muted">
          Guardamos tu cita y te llevamos a WhatsApp con el resumen.
        </p>
      </BottomBar>
    </div>
  )
}
