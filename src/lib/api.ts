import { API_TOKEN, API_URL, DEMO_MODE } from '../config'
import type { Catalog, Coupon, ReservationPayload, ReservationResult } from '../types'
import { mockFetchData, mockSubmitReservation, mockValidateCoupon } from './mock'
import { ApiError } from './errors'
import { normalizeCatalog, str, toNumber, type Row } from './normalize'

export { ApiError }

const TIMEOUT_MS = 20_000

// ---------- Transporte ----------

async function request(input: string, init?: RequestInit): Promise<Row> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(input, { ...init, signal: controller.signal, redirect: 'follow' })
  } catch {
    throw new ApiError('red', 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
  } finally {
    clearTimeout(timer)
  }
  let data: Row
  try {
    data = (await res.json()) as Row
  } catch {
    throw new ApiError('desconocido', 'Respuesta inesperada del servidor.')
  }
  if (data && typeof data.error === 'string') {
    const code = (['no_autorizado', 'cupo_ocupado', 'cupon_invalido', 'datos_invalidos'] as const).find(
      (c) => c === data.error,
    )
    throw new ApiError(code ?? (/autoriz/i.test(data.error) ? 'no_autorizado' : 'desconocido'), str(data.mensaje) || data.error)
  }
  return data
}

function url(params: Record<string, string>): string {
  const u = new URL(API_URL)
  u.searchParams.set('token', API_TOKEN)
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v)
  return u.toString()
}

// ---------- API pública ----------

/** Catálogo, promociones, configuración, tasa BCV y ocupación del calendario. */
export async function fetchData(): Promise<Catalog> {
  if (DEMO_MODE) return mockFetchData()
  return normalizeCatalog(await request(url({})))
}

/** Valida un cupón en el servidor (la lista de cupones nunca llega al navegador). */
export async function validateCoupon(codigo: string): Promise<Coupon> {
  const code = codigo.trim().toUpperCase()
  if (!code) throw new ApiError('cupon_invalido', 'Escribe un código.')
  if (DEMO_MODE) return mockValidateCoupon(code)
  const data = await request(url({ action: 'cupon', codigo: code }))
  if (!data.valido) throw new ApiError('cupon_invalido', str(data.mensaje) || 'Este cupón no es válido.')
  return { codigo: str(data.codigo) || code, porcentaje: toNumber(data.porcentaje), monto: toNumber(data.monto) }
}

/**
 * Envía la reservación. Se usa `text/plain` para que el navegador no haga
 * preflight CORS (Apps Script no responde a OPTIONS).
 */
export async function submitReservation(payload: ReservationPayload): Promise<ReservationResult> {
  if (DEMO_MODE) return mockSubmitReservation(payload)
  const data = await request(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: API_TOKEN, ...payload }),
  })
  if (!data.success) throw new ApiError('desconocido', 'No se pudo guardar la reserva.')
  return {
    id: str(data.id),
    total: toNumber(data.total, payload.total),
    totalBs: data.totalBs === null || data.totalBs === undefined ? null : toNumber(data.totalBs),
    tasa: data.tasa === null || data.tasa === undefined ? null : toNumber(data.tasa),
    comprobanteUrl: str(data.comprobanteUrl) || null,
  }
}
