import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { CustomerForm, validateCustomer } from '../components/checkout/CustomerForm'
import { PagoMovilDetails } from '../components/checkout/PagoMovilDetails'
import { PaymentSelector, type PaymentSelectorHandle } from '../components/checkout/PaymentSelector'
import { StepHeader } from '../components/checkout/StepHeader'
import { OrderSummary } from '../components/OrderSummary'
import { BottomBar } from '../components/ui/BottomBar'
import { Button } from '../components/ui/Button'
import { IconCalendar, IconHome, IconMapPin, IconWhatsApp } from '../components/ui/icons'
import { METODO_LABEL, MODALIDAD_LABEL } from '../config'
import { ApiError, submitReservation } from '../lib/api'
import { capitalize, formatEUR, formatLongDate, formatTime12 } from '../lib/format'
import { servicesText, type OrderSummary as Summary } from '../lib/pricing'
import { buildGoogleCalendarUrl } from '../lib/calendar'
import { splitDataUrl } from '../lib/image'
import { buildWhatsAppMessage, buildWhatsAppUrl } from '../lib/whatsapp'
import { useOrder } from '../state/order'
import type { Catalog, Modalidad, ReservationPayload } from '../types'

interface PaymentViewProps {
  catalog: Catalog
  summary: Summary
  onBack: () => void
  /** El cupo se ocupó mientras la clienta llenaba el formulario. */
  onSlotTaken: () => void
  onSuccess: (result: { whatsappUrl: string; calendarUrl: string; modalidad: Modalidad }) => void
}

const UBICACION_WHATSAPP = 'Ubicación por WhatsApp'

export function PaymentView({ catalog, summary, onBack, onSlotTaken, onSuccess }: PaymentViewProps) {
  const { state, dispatch } = useOrder()
  const [attempted, setAttempted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const selectorRef = useRef<PaymentSelectorHandle>(null)
  const nombreRef = useRef<HTMLInputElement>(null)
  const telefonoRef = useRef<HTMLInputElement>(null)
  const comprobanteRef = useRef<HTMLDivElement>(null)

  const { customer, payment, schedule, coupon, modalidad } = state
  const customerErrors = validateCustomer(customer)
  const paymentError = attempted && !payment ? 'Elige cómo vas a pagar para continuar.' : null
  const comprobanteError =
    attempted && payment?.metodo === 'pago_movil' && !payment.comprobante
      ? payment.pagado
        ? 'Sube el capture de tu pago para continuar.'
        : 'Haz el Pago Móvil, toca "Ya pagué" y sube el capture.'
      : null

  const confirm = async () => {
    if (submitting) return
    setAttempted(true)

    if (!schedule || !modalidad) return onBack()
    if (customerErrors.nombre) return nombreRef.current?.focus()
    if (customerErrors.telefono) return telefonoRef.current?.focus()
    if (!payment) return selectorRef.current?.flag()
    if (payment.metodo === 'pago_movil' && !payment.comprobante) {
      comprobanteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
      cupon: coupon?.codigo ?? '',
      modalidad,
      // La clienta envía su ubicación por WhatsApp (texto compatible con el Apps Script).
      direccion: modalidad === 'domicilio' ? UBICACION_WHATSAPP : '',
      comprobante:
        payment.metodo === 'pago_movil' && payment.comprobante
          ? { ...splitDataUrl(payment.comprobante.dataUrl), nombre: payment.comprobante.nombre }
          : null,
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
      // Enlace corto: el lugar va en "location" y los detalles son mínimos.
      const calendarUrl = buildGoogleCalendarUrl({
        titulo: `Cita ${catalog.config.nombreNegocio} · ${servicesText(summary.lines)}`,
        fecha: schedule.fecha,
        hora: schedule.hora,
        duracionMin: summary.duracionMin,
        ubicacion: modalidad === 'domicilio' ? 'A domicilio' : catalog.config.spa.direccion || catalog.config.spa.mapsUrl,
        detalles: `Total: ${formatEUR(finalSummary.total, true)}\nWhatsApp: https://wa.me/${catalog.config.whatsapp}`,
        zonaHoraria: catalog.config.zonaHoraria,
      })
      const message = buildWhatsAppMessage({
        negocio: catalog.config.nombreNegocio,
        customer,
        schedule,
        summary: finalSummary,
        coupon,
        payment,
        modalidad,
        spa: catalog.config.spa,
        tasa,
        reservaId: result.id,
        comprobanteUrl: result.comprobanteUrl,
        calendarUrl,
      })
      onSuccess({ whatsappUrl: buildWhatsAppUrl(catalog.config.whatsapp, message), calendarUrl, modalidad })
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
          {modalidad && (
            <div className="mt-3 flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-rose-soft text-rose-deep">
                {modalidad === 'domicilio' ? <IconHome size={20} /> : <IconMapPin size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-medium">{MODALIDAD_LABEL[modalidad]}</p>
                {modalidad === 'spa' ? (
                  <a
                    href={catalog.config.spa.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-[13px] font-medium text-rose-deep underline-offset-2 hover:underline"
                  >
                    {catalog.config.spa.direccion || 'Ver ubicación en Google Maps'}
                  </a>
                ) : (
                  <p className="text-[13px] text-muted">
                    +{summary.recargoPct} % por traslado · al terminar, envíanos tu ubicación 📍 por WhatsApp
                  </p>
                )}
              </div>
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
                  ref={comprobanteRef}
                  data={catalog.config.pagoMovil}
                  totalBs={summary.totalBs}
                  tasa={catalog.tasa}
                  pagado={payment.pagado}
                  comprobante={payment.comprobante}
                  onPagado={() => dispatch({ type: 'setPagado', pagado: true })}
                  onComprobante={(comprobante) => dispatch({ type: 'setComprobante', comprobante })}
                  error={comprobanteError}
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
