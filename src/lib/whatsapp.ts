import type { BusinessConfig, Coupon, Customer, Modalidad, Payment, Schedule, Tasa } from '../types'
import { BRAND, METODO_LABEL } from '../config'
import { capitalize, formatBs, formatEUR, formatLongDate, formatTime12 } from './format'
import type { OrderSummary } from './pricing'

export interface WhatsAppInput {
  negocio?: string
  customer: Customer
  schedule: Schedule
  summary: OrderSummary
  coupon: Coupon | null
  payment: Payment
  modalidad: Modalidad
  spa: BusinessConfig['spa']
  tasa: Tasa | null
  reservaId?: string
  comprobanteUrl?: string | null
}

/** Mensaje fijo que la clienta envía a Maria al terminar la reserva. */
export function buildWhatsAppMessage(input: WhatsAppInput): string {
  const { customer, schedule, summary, coupon, payment, modalidad, spa, tasa, reservaId, comprobanteUrl } = input
  const servicios = summary.lines.map((l) => l.nombre).join(', ')
  const lines: string[] = [
    `✨ Nueva reserva · ${input.negocio || BRAND}`,
    '',
    `👤 ${customer.nombre.trim()} · 📱 ${customer.telefono.trim()}`,
    `📅 ${capitalize(formatLongDate(schedule.fecha))} · ${formatTime12(schedule.hora)}`,
    `💅 ${summary.lines.length === 1 ? 'Servicio' : 'Servicios'}: ${servicios}`,
  ]

  if (modalidad === 'domicilio') {
    lines.push(`🏠 A domicilio: ${customer.direccion.trim()}`)
    if (summary.recargo > 0) lines.push(`   Recargo a domicilio (${summary.recargoPct} %): ${formatEUR(summary.recargo, true)}`)
  } else {
    lines.push(`📍 En el spa: ${spa.direccion ? `${spa.direccion} · ` : ''}${spa.mapsUrl}`)
  }

  if (coupon && summary.descuento > 0) lines.push(`🎟️ Cupón ${coupon.codigo}: −${formatEUR(summary.descuento, true)}`)

  if (payment.metodo === 'pago_movil') {
    const bs = summary.totalBs !== null ? formatBs(summary.totalBs) : null
    const tasaTxt = tasa ? ` · tasa BCV ${formatBs(tasa.valor)}` : ''
    lines.push(
      bs
        ? `💰 Monto pagado: ${bs} (${formatEUR(summary.total, true)}${tasaTxt})`
        : `💰 Monto pagado: ${formatEUR(summary.total, true)}`,
      `💳 ${METODO_LABEL.pago_movil}${comprobanteUrl ? ` · Capture: ${comprobanteUrl}` : ' · Capture adjunto en la reserva'}`,
    )
  } else {
    lines.push(`💰 Total a pagar en la cita: ${formatEUR(summary.total, true)}`, `💳 ${METODO_LABEL.lugar}`)
  }

  if (reservaId) lines.push('', `ID de reserva: ${reservaId.slice(0, 8).toUpperCase()}`)
  return lines.join('\n')
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
