import { describe, expect, it } from 'vitest'
import { normalizeCatalog, normalizeConfig, toNumber } from './normalize'

describe('toNumber', () => {
  it('entiende formatos es-VE y en-US', () => {
    expect(toNumber(12)).toBe(12)
    expect(toNumber('12,5')).toBe(12.5)
    expect(toNumber('1.234,56')).toBe(1234.56)
    expect(toNumber('1,234.56')).toBe(1234.56)
    expect(toNumber('15 €')).toBe(15)
    expect(toNumber('', 7)).toBe(7)
  })
})

describe('normalizeCatalog', () => {
  it('normaliza filas de la hoja', () => {
    const c = normalizeCatalog({
      servicios: [
        { ID: 1, Nombre: 'Mani', Precio: '12', Duracion_Min: 60, Tipo: 'Base' },
        { ID: 'A1', Nombre: 'Arte', Precio: 3, Duracion_Min: '15', Tipo: 'adicional' },
        { ID: '', Nombre: 'Fila vacía', Precio: 0 },
      ],
      promociones: [{ ID: 'P1', Nombre: 'Combo', Servicios_Incluidos: '1; A1', Precio_Promo: '13,5' }],
      config: [{ Clave: 'hora_apertura', Valor: '08:30' }, { Clave: 'dias_laborales', Valor: '2,3,4' }],
      tasa: { valor: '410,25', fecha: '2026-09-24', fuente: 'BCV' },
      citasAgendadas: [{ inicio: '2026-09-24T14:00:00.000Z', fin: '2026-09-24T15:00:00.000Z' }, { inicio: 'x', fin: 'y' }],
    })
    expect(c.servicios).toHaveLength(2)
    expect(c.servicios[0]).toMatchObject({ id: '1', precio: 12, tipo: 'base' })
    expect(c.servicios[1].tipo).toBe('adicional')
    expect(c.promociones[0]).toMatchObject({ servicioIds: ['1', 'A1'], precio: 13.5 })
    expect(c.config.horaApertura).toBe(510)
    expect(c.config.diasLaborales).toEqual([2, 3, 4])
    expect(c.tasa?.valor).toBe(410.25)
    expect(c.citas).toHaveLength(1)
  })

  it('usa valores por defecto y el WhatsApp del negocio si la hoja está vacía', () => {
    const cfg = normalizeConfig([])
    expect(cfg.whatsapp).toBe('584122516390')
    expect(cfg.horaApertura).toBe(540)
    expect(cfg.zonaHoraria).toBe('America/Caracas')
  })
})
