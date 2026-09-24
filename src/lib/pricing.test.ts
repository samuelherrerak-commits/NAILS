import { describe, expect, it } from 'vitest'
import type { Promo, Service } from '../types'
import { couponDiscount, summarize, toBs } from './pricing'

const servicios: Service[] = [
  { id: 'S1', nombre: 'Mani', precio: 12, duracionMin: 60, tipo: 'base', categoria: 'Servicios' },
  { id: 'S2', nombre: 'Pedi', precio: 15, duracionMin: 60, tipo: 'base', categoria: 'Servicios' },
  { id: 'A1', nombre: 'Arte', precio: 3, duracionMin: 15, tipo: 'adicional', categoria: 'Servicios' },
]
const promociones: Promo[] = [{ id: 'P1', nombre: 'Mani + Pedi', servicioIds: ['S1', 'S2'], precio: 24 }]
const catalog = { servicios, promociones, tasa: { valor: 400.5, fecha: null, fuente: 'BCV' } }

describe('summarize', () => {
  it('suma servicios, promos y duración', () => {
    const s = summarize({ servicios: ['A1'], promos: ['P1'] }, catalog, null)
    expect(s.subtotal).toBe(27)
    expect(s.total).toBe(27)
    expect(s.duracionMin).toBe(135)
    expect(s.hasBase).toBe(true)
    expect(s.lines.map((l) => l.id)).toEqual(['P1', 'A1'])
    expect(s.lines[0].precioRegular).toBe(27)
    expect(s.totalBs).toBe(10813.5)
  })

  it('solo adicionales no habilita la reserva', () => {
    expect(summarize({ servicios: ['A1'], promos: [] }, catalog, null).hasBase).toBe(false)
  })

  it('ignora IDs que ya no existen en el catálogo', () => {
    const s = summarize({ servicios: ['X9', 'S1'], promos: ['P9'] }, catalog, null)
    expect(s.count).toBe(1)
    expect(s.total).toBe(12)
  })

  it('aplica cupones por porcentaje y por monto', () => {
    const cart = { servicios: ['S1', 'S2'], promos: [] }
    expect(summarize(cart, catalog, { codigo: 'P', porcentaje: 10, monto: 0 }).total).toBe(24.3)
    expect(summarize(cart, catalog, { codigo: 'M', porcentaje: 0, monto: 5 }).total).toBe(22)
  })
})

describe('a domicilio', () => {
  const cart = { servicios: ['S1'], promos: [] }
  const c20 = { ...catalog, servicios: [{ ...servicios[0], precio: 20 }] }

  it('suma 20 % sobre el subtotal antes del cupón y 15 min a la duración', () => {
    // 20 € + 4 € (20 %) − 2 € (cupón de 2 €) = 22 €
    const s = summarize(cart, c20, { codigo: 'M', porcentaje: 0, monto: 2 }, 'domicilio', { recargoPct: 20, minutosExtra: 15 })
    expect(s.recargo).toBe(4)
    expect(s.descuento).toBe(2)
    expect(s.total).toBe(22)
    expect(s.duracionMin).toBe(75)
  })

  it('el cupón por porcentaje se calcula sobre el subtotal de los servicios', () => {
    const s = summarize(cart, c20, { codigo: 'P', porcentaje: 10, monto: 0 }, 'domicilio')
    expect(s.total).toBe(22) // 20 + 4 − 2
  })

  it('en el spa no hay recargo ni minutos extra', () => {
    const s = summarize(cart, c20, null, 'spa')
    expect(s.recargo).toBe(0)
    expect(s.total).toBe(20)
    expect(s.duracionMin).toBe(60)
  })
})

describe('couponDiscount', () => {
  it('nunca supera el subtotal', () => {
    expect(couponDiscount(4, { codigo: 'M', porcentaje: 0, monto: 10 })).toBe(4)
  })
  it('sin cupón no descuenta', () => {
    expect(couponDiscount(40, null)).toBe(0)
  })
})

describe('toBs', () => {
  it('redondea a 2 decimales y maneja tasa ausente', () => {
    expect(toBs(12.5, { valor: 412.3456, fecha: null, fuente: 'BCV' })).toBe(5154.32)
    expect(toBs(12.5, null)).toBeNull()
  })
})
