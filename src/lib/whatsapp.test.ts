import { describe, expect, it } from 'vitest'
import { summarize } from './pricing'
import { buildWhatsAppMessage, buildWhatsAppUrl } from './whatsapp'

const catalog = {
  servicios: [
    { id: 'kapping', nombre: 'Kapping', precio: 17, duracionMin: 60, tipo: 'base' as const, categoria: 'Manos' },
    { id: 'nivelacion', nombre: 'Nivelacion', precio: 15, duracionMin: 60, tipo: 'base' as const, categoria: 'Manos' },
  ],
  promociones: [],
  tasa: { valor: 974.06, fecha: null, fuente: 'BCV' },
}
const spa = { direccion: '', mapsUrl: 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17' }
const base = {
  negocio: 'ByMariaNails',
  customer: { nombre: ' Ana Pérez ', telefono: '0412 123 4567' },
  schedule: { fecha: '2026-09-24', hora: '14:30' },
  coupon: null,
  tasa: catalog.tasa,
  spa,
  reservaId: 'abc12345-xyz',
}

describe('buildWhatsAppMessage', () => {
  it('spa + Pago Móvil: Maps, monto en Bs, capture y calendario', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      modalidad: 'spa',
      summary: summarize({ servicios: ['kapping'], promos: [] }, catalog, null, 'spa'),
      payment: { metodo: 'pago_movil', pagado: true, comprobante: null },
      comprobanteUrl: 'https://drive.google.com/file/d/123/view',
      calendarUrl: 'https://calendar.google.com/calendar/render?action=TEMPLATE',
    })
    expect(msg).toBe(
      [
        '🌸✨ ¡Nueva reserva en ByMariaNails! ✨🌸',
        '',
        '¡Hola! 💖 Quiero confirmar mi cita:',
        '',
        '👩🏻 Nombre: Ana Pérez',
        '📱 Teléfono: 0412 123 4567',
        '',
        '🗓️ Fecha: Jueves 24 de septiembre',
        '⏰ Hora: 2:30 p. m. (1 h aprox.)',
        '',
        '💅 Servicio:',
        '   ▫️ Kapping — 17,00 €',
        '',
        '🏡 Lugar: En el spa',
        '📍 Ubicación: https://maps.app.goo.gl/MBfSuyGHQrRRcDp17',
        '',
        '💰 Total: 17,00 €',
        '💸 Pagado por Pago Móvil: Bs. 16.559,02',
        '   (tasa BCV Bs. 974,06)',
        '🧾 Capture: https://drive.google.com/file/d/123/view',
        '',
        '📆 Agrégala a tu calendario:',
        'https://calendar.google.com/calendar/render?action=TEMPLATE',
        '',
        '🔖 Reserva #ABC12345',
        '¡Gracias! Nos vemos pronto 💕',
      ].join('\n'),
    )
  })

  it('domicilio + pago en la cita: pide la ubicación por el chat y muestra el recargo', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      modalidad: 'domicilio',
      summary: summarize({ servicios: ['kapping', 'nivelacion'], promos: [] }, catalog, null, 'domicilio'),
      payment: { metodo: 'lugar' },
    })
    expect(msg).toContain('💅 Servicios:\n   ▫️ Kapping — 17,00 €\n   ▫️ Nivelacion — 15,00 €')
    expect(msg).toContain('⏰ Hora: 2:30 p. m. (2 h 15 min aprox.)')
    expect(msg).toContain('🚗 Lugar: A domicilio (+20 %: 6,40 €)')
    expect(msg).toContain('📍 Te envío mi ubicación por aquí 👇')
    expect(msg).toContain('💰 Total: 38,40 €')
    expect(msg).toContain('💵 Pago: en la cita')
    expect(msg).not.toContain('maps.app')
    expect(msg).not.toContain('calendario')
  })
})

describe('buildWhatsAppUrl', () => {
  it('limpia el número y codifica el texto', () => {
    const url = buildWhatsAppUrl('+58 412-2516390', 'Hola & chao\nlínea')
    expect(url).toBe('https://wa.me/584122516390?text=Hola%20%26%20chao%0Al%C3%ADnea')
  })
})
