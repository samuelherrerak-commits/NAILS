const env = import.meta.env

export const API_URL: string = (env.VITE_API_URL ?? '').trim()
export const API_TOKEN: string = (env.VITE_API_TOKEN ?? '').trim() || 'MARIANAILS'
export const DEFAULT_WHATSAPP: string = ((env.VITE_WHATSAPP ?? '').trim() || '584122516390').replace(/\D/g, '')

/** Sin URL de Apps Script la app usa datos de ejemplo. */
export const DEMO_MODE = API_URL === ''

export const METODO_LABEL = {
  lugar: 'Pago en la cita',
  pago_movil: 'Bolívares (Pago Móvil)',
} as const

export const BRAND = 'ByMariaNails'

export const MODALIDAD_LABEL = {
  spa: 'En el spa',
  domicilio: 'A domicilio',
} as const
