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
  customer: { nombre: ' Ana Pérez ', telefono: '0412 123 4567', direccion: 'Urb. El Paraíso, calle 3, casa 12' },
  schedule: { fecha: '2026-09-24', hora: '14:30' },
  coupon: null,
  tasa: catalog.tasa,
  spa,
  reservaId: 'abc12345-xyz',
}

describe('buildWhatsAppMessage', () => {
  it('spa + Pago Móvil: monto pagado en Bs, enlace de Maps y capture', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      modalidad: 'spa',
      summary: summarize({ servicios: ['kapping'], promos: [] }, catalog, null, 'spa'),
      payment: { metodo: 'pago_movil', pagado: true, comprobante: null },
      comprobanteUrl: 'https://drive.google.com/file/d/123/view',
    })
    expect(msg).toContain('✨ Nueva reserva · ByMariaNails')
    expect(msg).toContain('👤 Ana Pérez · 📱 0412 123 4567')
    expect(msg).toContain('📅 Jueves 24 de septiembre · 2:30 p. m.')
    expect(msg).toContain('💅 Servicio: Kapping')
    expect(msg).toContain('📍 En el spa: https://maps.app.goo.gl/MBfSuyGHQrRRcDp17')
    expect(msg).toContain('💰 Monto pagado: Bs. 16.559,02 (17,00 € · tasa BCV Bs. 974,06)')
    expect(msg).toContain('Capture: https://drive.google.com/file/d/123/view')
    expect(msg).toContain('ID de reserva: ABC12345')
    expect(msg).not.toContain('domicilio')
  })

  it('domicilio + pago en la cita: dirección, recargo y total a pagar', () => {
    const msg = buildWhatsAppMessage({
      ...base,
      modalidad: 'domicilio',
      summary: summarize({ servicios: ['kapping', 'nivelacion'], promos: [] }, catalog, null, 'domicilio'),
      payment: { metodo: 'lugar' },
    })
    expect(msg).toContain('💅 Servicios: Kapping, Nivelacion')
    expect(msg).toContain('🏠 A domicilio: Urb. El Paraíso, calle 3, casa 12')
    expect(msg).toContain('Recargo a domicilio (20 %): 6,40 €')
    expect(msg).toContain('💰 Total a pagar en la cita: 38,40 €')
    expect(msg).toContain('💳 Pago en la cita')
    expect(msg).not.toContain('maps.app')
  })
})

describe('buildWhatsAppUrl', () => {
  it('limpia el número y codifica el texto', () => {
    const url = buildWhatsAppUrl('+58 412-2516390', 'Hola & chao\nlínea')
    expect(url).toBe('https://wa.me/584122516390?text=Hola%20%26%20chao%0Al%C3%ADnea')
  })
})
