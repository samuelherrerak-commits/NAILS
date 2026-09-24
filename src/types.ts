export type ServiceKind = 'base' | 'adicional'

export interface Service {
  id: string
  nombre: string
  precio: number
  duracionMin: number
  tipo: ServiceKind
  /** Columna Tipo de la hoja ("Manos", "Pies"…); agrupa los servicios base. */
  categoria: string
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
  /**
   * Tramos de atención por día de la semana (0 = domingo … 6 = sábado),
   * en minutos desde medianoche (hora de Caracas). Día sin tramos = cerrado.
   */
  horario: Array<Array<[number, number]>>
  intervaloMin: number
  diasAnticipacion: number
  anticipacionMinHoras: number
  zonaHoraria: string
  pagoMovil: PagoMovilData
  domicilio: { recargoPct: number; minutosExtra: number }
  spa: { direccion: string; mapsUrl: string }
}

export type Modalidad = 'spa' | 'domicilio'

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

export interface Comprobante {
  /** Imagen ya comprimida (data:image/jpeg;base64,…). */
  dataUrl: string
  nombre: string
}

export type Payment =
  | { metodo: 'lugar' }
  | { metodo: 'pago_movil'; pagado: boolean; comprobante: Comprobante | null }

export interface Customer {
  nombre: string
  telefono: string
  /** Solo para citas a domicilio. */
  direccion: string
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
  cupon: string
  modalidad: Modalidad
  direccion: string
  comprobante: { base64: string; mime: string; nombre: string } | null
}

export interface ReservationResult {
  id: string
  total: number
  totalBs: number | null
  tasa: number | null
  comprobanteUrl: string | null
}
