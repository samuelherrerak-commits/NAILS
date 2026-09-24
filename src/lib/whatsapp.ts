import type { BusinessConfig, Coupon, Customer, Modalidad, Payment, Schedule, Tasa } from '../types'
import { BRAND } from '../config'
import { capitalize, formatBs, formatDuration, formatEUR, formatLongDate, formatTime12 } from './format'
import type { OrderSummary } from './pricing'

export interface WhatsAppInput {
  negocio?: string
  customer: Pick<Customer, 'nombre' | 'telefono'>
  schedule: Schedule
  summary: OrderSummary
  coupon: Coupon | null
  payment: Payment
  modalidad: Modalidad
  spa: BusinessConfig['spa']
  tasa: Tasa | null
  reservaId?: string
  comprobanteUrl?: string | null
  calendarUrl?: string | null
}

/** Mensaje fijo que la clienta envía a Maria al terminar la reserva. */
export function buildWhatsAppMessage(input: WhatsAppInput): string {
  const { customer, schedule, summary, coupon, payment, modalidad, spa, tasa, reservaId, comprobanteUrl, calendarUrl } =
    input
  const negocio = input.negocio || BRAND
  const lines: string[] = [
    `🌸✨ ¡Nueva reserva en ${negocio}! ✨🌸`,
    '',
    '¡Hola! 💖 Quiero confirmar mi cita:',
    '',
    `👩🏻 Nombre: ${customer.nombre.trim()}`,
    `📱 Teléfono: ${customer.telefono.trim()}`,
    '',
    `🗓️ Fecha: ${capitalize(formatLongDate(schedule.fecha))}`,
    `⏰ Hora: ${formatTime12(schedule.hora)} (${formatDuration(summary.duracionMin)} aprox.)`,
    '',
    summary.lines.length === 1 ? '💅 Servicio:' : '💅 Servicios:',
    ...summary.lines.map((l) => `   ▫️ ${l.nombre} — ${formatEUR(l.precio, true)}`),
    '',
  ]

  if (modalidad === 'domicilio') {
    lines.push(
      summary.recargo > 0
        ? `🚗 Lugar: A domicilio (+${summary.recargoPct} %: ${formatEUR(summary.recargo, true)})`
        : '🚗 Lugar: A domicilio',
      '📍 Te envío mi ubicación por aquí 👇',
    )
  } else {
    lines.push('🏡 Lugar: En el spa', `📍 Ubicación: ${spa.direccion ? `${spa.direccion} · ` : ''}${spa.mapsUrl}`)
  }
  lines.push('')

  if (coupon && summary.descuento > 0) lines.push(`🎟️ Cupón ${coupon.codigo}: −${formatEUR(summary.descuento, true)}`)
  lines.push(`💰 Total: ${formatEUR(summary.total, true)}`)

  if (payment.metodo === 'pago_movil') {
    lines.push(
      summary.totalBs !== null
        ? `💸 Pagado por Pago Móvil: ${formatBs(summary.totalBs)}`
        : '💸 Pagado por Pago Móvil',
    )
    if (tasa) lines.push(`   (tasa BCV ${formatBs(tasa.valor)})`)
    lines.push(comprobanteUrl ? `🧾 Capture: ${comprobanteUrl}` : '🧾 Capture: adjunto en la reserva')
  } else {
    lines.push('💵 Pago: en la cita')
  }

  if (calendarUrl) lines.push('', '📆 Agrégala a tu calendario:', calendarUrl)

  lines.push('')
  if (reservaId) lines.push(`🔖 Reserva #${reservaId.slice(0, 8).toUpperCase()}`)
  lines.push('¡Gracias! Nos vemos pronto 💕')
  return lines.join('\n')
}

export function buildWhatsAppUrl(numero: string, message: string): string {
  return `https://wa.me/${numero.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
}
