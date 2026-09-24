import { describe, expect, it } from 'vitest'
import { initialOrder, orderReducer } from './order'

describe('orderReducer', () => {
  const withSchedule = { ...initialOrder, schedule: { fecha: '2026-09-24', hora: '10:00' } }

  it('cambiar la modalidad limpia el horario (cambia la duración)', () => {
    const s = orderReducer(withSchedule, { type: 'setModalidad', modalidad: 'domicilio' })
    expect(s.modalidad).toBe('domicilio')
    expect(s.schedule).toBeNull()
  })

  it('Pago Móvil: "Ya pagué" y luego el capture', () => {
    let s = orderReducer(initialOrder, { type: 'setPaymentMethod', metodo: 'pago_movil' })
    expect(s.payment).toEqual({ metodo: 'pago_movil', pagado: false, comprobante: null })
    s = orderReducer(s, { type: 'setPagado', pagado: true })
    s = orderReducer(s, { type: 'setComprobante', comprobante: { dataUrl: 'data:image/jpeg;base64,AA', nombre: 'c.jpg' } })
    expect(s.payment).toMatchObject({ pagado: true, comprobante: { nombre: 'c.jpg' } })
    // Cambiar de método descarta el capture
    s = orderReducer(s, { type: 'setPaymentMethod', metodo: 'lugar' })
    expect(s.payment).toEqual({ metodo: 'lugar' })
  })
})
