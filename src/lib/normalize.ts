import { DEFAULT_WHATSAPP } from '../config'
import type { BusinessConfig, BusyRange, Catalog, Promo, Service, Tasa } from '../types'
import { parseHHMM } from './format'

// ---------- Normalización (las hojas pueden traer números como texto, etc.) ----------

export type Row = Record<string, unknown>

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value !== 'string') return fallback
  let s = value.replace(/[^\d.,-]/g, '')
  if (s.includes(',') && s.includes('.')) {
    // "1.234,56" (es-VE) o "1,234.56" (en-US): el último separador es el decimal.
    s = s.lastIndexOf(',') > s.lastIndexOf('.') ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : fallback
}

export const str = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())

export function normalizeServices(rows: unknown): Service[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r: Row) => ({
      id: str(r.ID),
      nombre: str(r.Nombre),
      precio: toNumber(r.Precio),
      duracionMin: Math.max(0, Math.round(toNumber(r.Duracion_Min, 60))),
      tipo: /adic/i.test(str(r.Tipo)) ? ('adicional' as const) : ('base' as const),
    }))
    .filter((s) => s.id && s.nombre)
}

export function normalizePromos(rows: unknown): Promo[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r: Row) => ({
      id: str(r.ID),
      nombre: str(r.Nombre),
      servicioIds: str(r.Servicios_Incluidos)
        .split(/[,;|]/)
        .map((x) => x.trim())
        .filter(Boolean),
      precio: toNumber(r.Precio_Promo),
    }))
    .filter((p) => p.id && p.nombre && p.servicioIds.length > 0)
}

export const DEFAULT_CONFIG: BusinessConfig = {
  nombreNegocio: 'Mariana',
  whatsapp: DEFAULT_WHATSAPP,
  horaApertura: 9 * 60,
  horaCierre: 19 * 60,
  intervaloMin: 30,
  diasLaborales: [1, 2, 3, 4, 5, 6],
  diasAnticipacion: 21,
  anticipacionMinHoras: 2,
  zonaHoraria: 'America/Caracas',
  pagoMovil: { banco: '', telefono: '', cedula: '' },
}

export function normalizeConfig(raw: unknown): BusinessConfig {
  const map: Record<string, string> = {}
  if (Array.isArray(raw)) {
    for (const r of raw as Row[]) if (str(r.Clave)) map[str(r.Clave).toLowerCase()] = str(r.Valor)
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) map[k.toLowerCase()] = str(v)
  }
  const time = (key: string, fallback: number) => {
    const m = parseHHMM(map[key] ?? '')
    return Number.isFinite(m) ? m : fallback
  }
  const int = (key: string, fallback: number) => {
    const n = Math.round(toNumber(map[key], Number.NaN))
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  const d = DEFAULT_CONFIG
  const dias = (map.dias_laborales ?? '')
    .split(/[,;\s]+/)
    .map((x) => Number.parseInt(x, 10))
    .filter((n) => n >= 0 && n <= 6)
  const whatsapp = (map.whatsapp ?? '').replace(/\D/g, '')

  return {
    nombreNegocio: map.nombre_negocio || d.nombreNegocio,
    whatsapp: whatsapp || d.whatsapp,
    horaApertura: time('hora_apertura', d.horaApertura),
    horaCierre: time('hora_cierre', d.horaCierre),
    intervaloMin: int('intervalo_min', d.intervaloMin) || d.intervaloMin,
    diasLaborales: dias.length ? dias : d.diasLaborales,
    diasAnticipacion: int('dias_anticipacion', d.diasAnticipacion) || d.diasAnticipacion,
    anticipacionMinHoras: int('anticipacion_min_horas', d.anticipacionMinHoras),
    zonaHoraria: map.zona_horaria || d.zonaHoraria,
    pagoMovil: {
      banco: map.pm_banco ?? '',
      telefono: map.pm_telefono ?? '',
      cedula: map.pm_cedula ?? '',
    },
  }
}

export function normalizeTasa(raw: unknown): Tasa | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Row
  const valor = toNumber(r.valor, 0)
  if (!(valor > 0)) return null
  return { valor, fecha: str(r.fecha) || null, fuente: str(r.fuente) || 'BCV' }
}

export function normalizeCitas(rows: unknown): BusyRange[] {
  if (!Array.isArray(rows)) return []
  return rows
    .map((r: Row) => ({ inicio: new Date(str(r.inicio)), fin: new Date(str(r.fin)) }))
    .filter((c) => !Number.isNaN(c.inicio.getTime()) && !Number.isNaN(c.fin.getTime()) && c.fin > c.inicio)
}

export function normalizeCatalog(data: Row): Catalog {
  return {
    servicios: normalizeServices(data.servicios),
    promociones: normalizePromos(data.promociones),
    config: normalizeConfig(data.config),
    tasa: normalizeTasa(data.tasa),
    citas: normalizeCitas(data.citasAgendadas),
  }
}
