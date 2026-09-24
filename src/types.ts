export type ServiceKind = 'base' | 'adicional'

export interface Service {
  id: string
  nombre: string
  precio: number
  duracionMin: number
  tipo: ServiceKind
}

export interface Promo {
  id: string
  nombre: string
  servicioIds: string[]
  precio: number
}

export interface PagoMovilData {
  banco: string
  telefono: string
  cedula: string
}

export interface BusinessConfig {
  nombreNegocio: string
  whatsapp: string
  /** Minutos desde medianoche (hora de Caracas). */
  horaApertura: number
  horaCierre: number
  intervaloMin: number
  /** 0 = domingo … 6 = sábado */
  diasLaborales: number[]
  diasAnticipacion: number
  anticipacionMinHoras: number
  zonaHoraria: string
  pagoMovil: PagoMovilData
}

export interface Tasa {
  /** Bolívares por 1 euro. */
  valor: number
  fecha: string | null
  fuente: string
}

export interface BusyRange {
  inicio: Date
  fin: Date
}

export interface Catalog {
  servicios: Service[]
  promociones: Promo[]
  config: BusinessConfig
  tasa: Tasa | null
  citas: BusyRange[]
}

export interface Coupon {
  codigo: string
  porcentaje: number
  monto: number
}

export interface Cart {
  servicios: string[]
  promos: string[]
}

export type Payment = { metodo: 'lugar' } | { metodo: 'pago_movil'; referencia: string }

export interface Customer {
  nombre: string
  telefono: string
}

export interface Schedule {
  fecha: string // YYYY-MM-DD
  hora: string // HH:MM
}

export interface ReservationPayload {
  cliente: string
  telefono: string
  servicios: string
  items: Cart
  total: number
  fechaCita: string
  horaCita: string
  duracionTotalMin: number
  metodoPago: string
  referencia: string
  cupon: string
}

export interface ReservationResult {
  id: string
  total: number
  totalBs: number | null
  tasa: number | null
}
