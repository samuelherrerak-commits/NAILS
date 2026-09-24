import { describe, expect, it } from 'vitest'
import { normalizeCatalog, normalizeConfig, normalizeHorarios, normalizeServices, slug, toNumber } from './normalize'

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

describe('slug', () => {
  it('quita acentos y espacios', () => {
    expect(slug('Nivelación Gel')).toBe('nivelacion-gel')
    expect(slug('  Uñas  (2) ')).toBe('unas-2')
  })
})

describe('respuesta real de la hoja (ID vacío, Tipo = categoría)', () => {
  const real = {
    servicios: [
      { ID: '', Nombre: 'Manicure', Precio: 13, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Nivelacion', Precio: 15, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Kapping', Precio: 17, Duracion_Min: 60, Tipo: 'Manos' },
      { ID: '', Nombre: 'Sistema', Precio: 20, Duracion_Min: 60, Tipo: 'Manos' },
    ],
    promociones: [],
    config: { nombre_negocio: 'MARIA NAILS', hora_apertura: '9:00', hora_cierre: '19:00', dias_laborales: '1,2,3,4,5,6' },
    tasa: { valor: 974.06, fecha: '2026-09-24T00:00:00-04:00', fuente: 'BCV (vía DolarApi)' },
    citasAgendadas: [],
  }

  it('muestra los 4 servicios con IDs derivados del nombre', () => {
    const c = normalizeCatalog(real)
    expect(c.servicios.map((s) => s.id)).toEqual(['manicure', 'nivelacion', 'kapping', 'sistema'])
    expect(c.servicios.every((s) => s.tipo === 'base' && s.categoria === 'Manos')).toBe(true)
  })

  it('arma el horario desde Configuracion cuando no hay pestaña Horarios', () => {
    const c = normalizeCatalog(real)
    expect(c.config.horario[0]).toEqual([])
    expect(c.config.horario[1]).toEqual([[540, 1140]])
    expect(c.tasa?.valor).toBe(974.06)
  })
})

describe('normalizeServices', () => {
  it('tolera encabezados con acentos y nombres repetidos', () => {
    const s = normalizeServices([
      { Nombre: 'Arte', 'Precio ($)': '3,5', 'Duración': '15', Tipo: 'Adicional' },
      { ID: '', Nombre: 'Arte', Precio: 4, Duracion_Min: 20, Tipo: '' },
      { ID: 'X', Nombre: '', Precio: 1 },
    ])
    expect(s).toHaveLength(2)
    expect(s[0]).toMatchObject({ id: 'arte', precio: 3.5, duracionMin: 15, tipo: 'adicional' })
    expect(s[1]).toMatchObject({ id: 'arte-2', tipo: 'base', categoria: 'Servicios' })
  })
})

describe('normalizeCatalog', () => {
  it('promos aceptan IDs o nombres de servicios', () => {
    const c = normalizeCatalog({
      servicios: [
        { ID: 'S1', Nombre: 'Manicure', Precio: 12, Duracion_Min: 60, Tipo: 'Manos' },
        { ID: '', Nombre: 'Pedicure Spa', Precio: 15, Duracion_Min: 60, Tipo: 'Pies' },
      ],
      promociones: [
        { ID: '', Nombre: 'Combo', Servicios_Incluidos: 's1, pedicure spa', Precio_Promo: '24' },
        { ID: 'P2', Nombre: 'Rota', Servicios_Incluidos: 'no existe', Precio_Promo: 5 },
      ],
      config: {},
      citasAgendadas: [{ inicio: '2026-09-24T14:00:00.000Z', fin: '2026-09-24T15:00:00.000Z' }, { inicio: 'x', fin: 'y' }],
    })
    expect(c.promociones).toHaveLength(1)
    expect(c.promociones[0]).toMatchObject({ id: 'combo', servicioIds: ['S1', 'pedicure-spa'], precio: 24 })
    expect(c.citas).toHaveLength(1)
  })
})

describe('normalizeHorarios', () => {
  it('acepta días en texto, tramos múltiples y días cerrados', () => {
    const h = normalizeHorarios([
      { dia: 'Lunes', inicio: '9:00', fin: '12:00' },
      { dia: 'lunes', inicio: '14:00', fin: '19:00' },
      { dia: 'Sábado', inicio: '09:00', fin: '14:00' },
      { dia: 'Domingo', inicio: '', fin: '' },
      { dia: 'Miercoles', inicio: '10:00', fin: '09:00' }, // inválido
    ])!
    expect(h[1]).toEqual([[540, 720], [840, 1140]])
    expect(h[6]).toEqual([[540, 840]])
    expect(h[0]).toEqual([])
    expect(h[3]).toEqual([])
  })

  it('la pestaña Horarios tiene prioridad sobre Configuracion', () => {
    const cfg = normalizeConfig({ hora_apertura: '08:00', hora_cierre: '20:00' }, [{ dia: 2, inicio: '10:00', fin: '16:00' }])
    expect(cfg.horario[2]).toEqual([[600, 960]])
    expect(cfg.horario[1]).toEqual([])
  })

  it('usa valores por defecto y el WhatsApp del negocio si la hoja está vacía', () => {
    const cfg = normalizeConfig([])
    expect(cfg.whatsapp).toBe('584122516390')
    expect(cfg.horario[1]).toEqual([[540, 1140]])
    expect(cfg.zonaHoraria).toBe('America/Caracas')
  })
})
