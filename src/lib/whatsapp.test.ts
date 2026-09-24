import { describe, expect, it } from 'vitest'
import { summarize } from './pricing'
import { buildWhatsAppMessage, buildWhatsAppUrl } from './whatsapp'

const catalog = {
  servicios: [{ id: 'S1', nombre: 'Manicure', precio: 12, duracionMin: 60, tipo: 'base' as const }],
  promociones: [],
  tasa: { valor: 400, fecha: null, fuente: 'BCV' },
}

const base = {
  negocio: 'Mariana',
  customer: { nombre: ' Ana Pérez ', telefono: '0412 123 4567' },
  schedule: { fecha: '2026-09-24', hora: '14:30' },
  summary: summarize({ servicios: ['S1'], promos: [] }, catalog, null),
  coupon: null,
  tasa: catalog.tasa,
}

describe('buildWhatsAppMessage', () => {
  it('incluye fecha, servicios, total y pago en el lugar', () => {
    const msg = buildWhatsAppMessage({ ...base, payment: { metodo: 'lugar' } })
    expect(msg).toContain('👤 Ana Pérez')
    expect(msg).toContain('Jueves 24 de septiembre · 2:30 p. m.')
    expect(msg).toContain('• Manicure — 12,00 €')
    expect(msg).toContain('💰 Total: 12,00 €')
    expect(msg).toContain('Pago en el lugar')
    expect(msg).not.toContain('Referencia')
  })

  it('en Pago Móvil agrega monto en Bs y referencia', () => {
    const msg = buildWhatsAppMessage({ ...base, payment: { metodo: 'pago_movil', referencia: '004512' } })
    expect(msg).toContain('Bs. 4.800,00')
    expect(msg).toContain('Bolívares (Pago Móvil)')
    expect(msg).toContain('🔢 Referencia: 004512')
  })
})

describe('buildWhatsAppUrl', () => {
  it('limpia el número y codifica el texto', () => {
    const url = buildWhatsAppUrl('+58 412-2516390', 'Hola & chao\nlínea')
    expect(url).toBe('https://wa.me/584122516390?text=Hola%20%26%20chao%0Al%C3%ADnea')
  })
})
