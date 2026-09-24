import { DEFAULT_WHATSAPP } from '../config'
import type { Catalog, Coupon, ReservationPayload, ReservationResult } from '../types'
import { ApiError } from './errors'
import { normalizeCatalog } from './normalize'
import { addDays, zonedParts } from './slots'

// Datos de ejemplo con la misma forma que devuelve el Apps Script.
// Se usan solo cuando VITE_API_URL está vacío (desarrollo / demo).

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

const SERVICIOS = [
  { ID: 'S1', Nombre: 'Manicure semipermanente', Precio: 12, Duracion_Min: 60, Tipo: 'Base' },
  { ID: 'S2', Nombre: 'Pedicure semipermanente', Precio: 15, Duracion_Min: 60, Tipo: 'Base' },
  { ID: 'S3', Nombre: 'Uñas acrílicas · set completo', Precio: 25, Duracion_Min: 120, Tipo: 'Base' },
  { ID: 'S4', Nombre: 'Polygel natural', Precio: 22, Duracion_Min: 90, Tipo: 'Base' },
  { ID: 'S5', Nombre: 'Relleno acrílico', Precio: 16, Duracion_Min: 75, Tipo: 'Base' },
  { ID: 'S6', Nombre: 'Manicure tradicional', Precio: 6, Duracion_Min: 45, Tipo: 'Base' },
  { ID: 'A1', Nombre: 'Nail art a mano (2 uñas)', Precio: 3, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A2', Nombre: 'Francés o baby boomer', Precio: 4, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A3', Nombre: 'Retiro de producto', Precio: 3, Duracion_Min: 20, Tipo: 'Adicional' },
  { ID: 'A4', Nombre: 'Spa de manos', Precio: 5, Duracion_Min: 15, Tipo: 'Adicional' },
  { ID: 'A5', Nombre: 'Efecto cromado', Precio: 4, Duracion_Min: 10, Tipo: 'Adicional' },
]

const PROMOCIONES = [
  { ID: 'P1', Nombre: 'Mani + Pedi', Servicios_Incluidos: 'S1, S2', Precio_Promo: 24 },
  { ID: 'P2', Nombre: 'Acrílicas con arte', Servicios_Incluidos: 'S3, A1', Precio_Promo: 25 },
  { ID: 'P3', Nombre: 'Manos de spa', Servicios_Incluidos: 'S1, A4', Precio_Promo: 15 },
]

const CONFIG = {
  nombre_negocio: 'Mariana',
  whatsapp: DEFAULT_WHATSAPP,
  hora_apertura: '09:00',
  hora_cierre: '19:00',
  intervalo_min: '30',
  dias_laborales: '1,2,3,4,5,6',
  dias_anticipacion: '21',
  anticipacion_min_horas: '2',
  zona_horaria: 'America/Caracas',
  pm_banco: 'Banesco (0134)',
  pm_telefono: '0412-2516390',
  pm_cedula: 'V-12.345.678',
}

const CUPONES: Record<string, Coupon> = {
  BIENVENIDA: { codigo: 'BIENVENIDA', porcentaje: 10, monto: 0 },
  MARIANA5: { codigo: 'MARIANA5', porcentaje: 0, monto: 5 },
}

/** Citas ocupadas relativas a hoy (hora de Caracas, UTC−4). */
function demoCitas() {
  const today = zonedParts(new Date(), 'America/Caracas').ymd
  const at = (days: number, from: string, to: string) => ({
    inicio: `${addDays(today, days)}T${from}:00-04:00`,
    fin: `${addDays(today, days)}T${to}:00-04:00`,
  })
  return [
    at(0, '13:00', '15:00'),
    at(1, '09:00', '10:30'),
    at(1, '14:00', '16:00'),
    at(2, '10:00', '13:00'),
    at(2, '15:30', '17:00'),
    at(3, '09:00', '19:00'),
    at(4, '11:00', '12:00'),
    at(5, '16:00', '18:30'),
  ]
}

export async function mockFetchData(): Promise<Catalog> {
  await wait(650)
  return normalizeCatalog({
    servicios: SERVICIOS,
    promociones: PROMOCIONES,
    config: CONFIG,
    tasa: { valor: 412.35, fecha: new Date().toISOString().slice(0, 10), fuente: 'BCV (demo)' },
    citasAgendadas: demoCitas(),
  })
}

export async function mockValidateCoupon(codigo: string): Promise<Coupon> {
  await wait(450)
  const c = CUPONES[codigo]
  if (!c) throw new ApiError('cupon_invalido', 'Este cupón no existe o ya se agotó.')
  return c
}

export async function mockSubmitReservation(payload: ReservationPayload): Promise<ReservationResult> {
  await wait(900)
  console.info('[demo] Reservación que se enviaría al Apps Script:', payload)
  return { id: crypto.randomUUID(), total: payload.total, totalBs: null, tasa: null }
}
