import type { Coupon, Customer, Payment, Schedule, Tasa } from '../types'
import { METODO_LABEL } from '../config'
import { capitalize, formatBs, formatEUR, formatLongDate, formatTime12 } from './format'
import type { OrderSummary } from './pricing'

export interface WhatsAppInput {
  negocio: string
  customer: Customer
  schedule: Schedule
  summary: OrderSummary
  coupon: Coupon | null
  payment: Payment
  tasa: Tasa | null
  reservaId?: string
}

export function buildWhatsAppMessage(input: WhatsAppInput): string {
  const { customer, schedule, summary, coupon, payment, tasa, reservaId } = input
  const lines: string[] = [
    `Hola ${input.negocio} ✨ Acabo de reservar una cita:`,
    '',
    `👤 ${customer.nombre.trim()}`,
    `📱 ${customer.telefono.trim()}`,
    `📅 ${capitalize(formatLongDate(schedule.fecha))} · ${formatTime12(schedule.hora)}`,
    '',
    '💅 Servicios:',
    ...summary.lines.map((l) => `• ${l.nombre} — ${formatEUR(l.precio, true)}`),
  ]

  if (coupon && summary.descuento > 0) {
    lines.push('', `🎟️ Cupón ${coupon.codigo}: −${formatEUR(summary.descuento, true)}`)
  }

  lines.push('', `💰 Total: ${formatEUR(summary.total, true)}`)

  if (payment.metodo === 'pago_movil') {
    if (summary.totalBs !== null && tasa) {
      lines.push(`   (${formatBs(summary.totalBs)} a tasa BCV ${formatBs(tasa.valor)}/€)`)
    }
    lines.push(`💳 Pago: ${METODO_LABEL.pago_movil}`, `🔢 Referencia: ${payment.referencia}`)
  } else {
    lines.push(`💳 Pago: ${METODO_LABEL.lugar}`)
  }

  if (reservaId) lines.push('', `ID de reserva: ${reservaId.slice(0, 8).toUpperCase()}`)
  return lines.join('\n')
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
