import type { BusinessConfig, Cart, Catalog, Coupon, Modalidad, Promo, Service, Tasa } from '../types'

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export interface OrderLine {
  key: string
  kind: 'servicio' | 'promo'
  id: string
  nombre: string
  precio: number
  /** Precio sin promo (solo promos), para mostrar el ahorro. */
  precioRegular?: number
  duracionMin: number
  tipo: 'base' | 'adicional' | 'promo'
  detalle?: string
}

export interface OrderSummary {
  lines: OrderLine[]
  subtotal: number
  /** Recargo por ir a domicilio (sobre el subtotal, antes del cupón). */
  recargo: number
  recargoPct: number
  descuento: number
  total: number
  totalBs: number | null
  duracionMin: number
  /** Hay al menos un servicio base o una promo (requisito para reservar). */
  hasBase: boolean
  count: number
}

export function promoServices(promo: Promo, servicios: Service[]): Service[] {
  return promo.servicioIds
    .map((id) => servicios.find((s) => s.id === id))
    .filter((s): s is Service => Boolean(s))
}

export function promoRegularPrice(promo: Promo, servicios: Service[]): number {
  return round2(promoServices(promo, servicios).reduce((sum, s) => sum + s.precio, 0))
}

export function promoDuration(promo: Promo, servicios: Service[]): number {
  return promoServices(promo, servicios).reduce((sum, s) => sum + s.duracionMin, 0)
}

export function couponDiscount(subtotal: number, coupon: Coupon | null): number {
  if (!coupon || subtotal <= 0) return 0
  const raw = coupon.porcentaje > 0 ? (subtotal * coupon.porcentaje) / 100 : coupon.monto
  return round2(Math.min(subtotal, Math.max(0, raw)))
}

export function toBs(eur: number, tasa: Tasa | null): number | null {
  if (!tasa || !(tasa.valor > 0)) return null
  return round2(eur * tasa.valor)
}

export function buildLines(cart: Cart, catalog: Pick<Catalog, 'servicios' | 'promociones'>): OrderLine[] {
  const lines: OrderLine[] = []
  for (const id of cart.promos) {
    const promo = catalog.promociones.find((p) => p.id === id)
    if (!promo) continue
    const incluidos = promoServices(promo, catalog.servicios)
    lines.push({
      key: `p:${id}`,
      kind: 'promo',
      id,
      nombre: promo.nombre,
      precio: promo.precio,
      precioRegular: promoRegularPrice(promo, catalog.servicios),
      duracionMin: promoDuration(promo, catalog.servicios),
      tipo: 'promo',
      detalle: incluidos.map((s) => s.nombre).join(' + '),
    })
  }
  for (const id of cart.servicios) {
    const s = catalog.servicios.find((x) => x.id === id)
    if (!s) continue
    lines.push({
      key: `s:${id}`,
      kind: 'servicio',
      id,
      nombre: s.nombre,
      precio: s.precio,
      duracionMin: s.duracionMin,
      tipo: s.tipo,
    })
  }
  // Base y promos primero, adicionales al final.
  return lines.sort((a, b) => Number(a.tipo === 'adicional') - Number(b.tipo === 'adicional'))
}

export function summarize(
  cart: Cart,
  catalog: Pick<Catalog, 'servicios' | 'promociones' | 'tasa'>,
  coupon: Coupon | null,
  modalidad: Modalidad | null = null,
  domicilio: BusinessConfig['domicilio'] = { recargoPct: 20, minutosExtra: 15 },
): OrderSummary {
  const lines = buildLines(cart, catalog)
  const subtotal = round2(lines.reduce((sum, l) => sum + l.precio, 0))
  const aDomicilio = modalidad === 'domicilio' && lines.length > 0
  // Recargo sobre el precio completo de los servicios; el cupón se descuenta después.
  const recargo = aDomicilio ? round2((subtotal * domicilio.recargoPct) / 100) : 0
  const descuento = couponDiscount(subtotal, coupon)
  const total = round2(subtotal + recargo - descuento)
  return {
    lines,
    subtotal,
    recargo,
    recargoPct: domicilio.recargoPct,
    descuento,
    total,
    totalBs: toBs(total, catalog.tasa),
    duracionMin: lines.reduce((sum, l) => sum + l.duracionMin, 0) + (aDomicilio ? domicilio.minutosExtra : 0),
    hasBase: lines.some((l) => l.tipo !== 'adicional'),
    count: lines.length,
  }
}

/** Texto plano de servicios para la hoja y el calendario. */
export function servicesText(lines: OrderLine[]): string {
  return lines.map((l) => l.nombre).join(', ')
}
