import { DEFAULT_WHATSAPP } from '../config'
import type { BusinessConfig, BusyRange, Catalog, Promo, Service, Tasa } from '../types'
import { parseHHMM } from './format'

// ---------- Normalización: la hoja la llena una persona, así que se tolera de todo ----------

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

/** "Duración (min)" → "duracionmin": sin acentos, mayúsculas, espacios ni símbolos. */
export function normKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/** "Nivelación Gel" → "nivelacion-gel". Debe coincidir con slug_ del Apps Script. */
export function slug(value: string): string {
  return (
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'item'
  )
}

/** Lee una columna aceptando variantes del encabezado ("Duracion_Min", "Duración", "duracion min"). */
export function pick(row: Row, ...names: string[]): unknown {
  const wanted = names.map(normKey)
  for (const [k, v] of Object.entries(row)) if (wanted.includes(normKey(k))) return v
  return undefined
}

/** Usa el ID de la hoja o, si está vacío, uno derivado del nombre (único). */
function assignIds<T extends { id: string; nombre: string }>(items: T[]): T[] {
  const used = new Set<string>()
  return items.map((item) => {
    let id = item.id || slug(item.nombre)
    if (used.has(id)) {
      let n = 2
      while (used.has(`${id}-${n}`)) n++
      id = `${id}-${n}`
    }
    used.add(id)
    return { ...item, id }
  })
}

export function normalizeServices(rows: unknown): Service[] {
  if (!Array.isArray(rows)) return []
  const items = rows
    .map((r: Row) => {
      const tipoRaw = str(pick(r, 'Tipo', 'Categoria'))
      const adicional = /adic|extra/i.test(tipoRaw)
      return {
        id: str(pick(r, 'ID')),
        nombre: str(pick(r, 'Nombre', 'Servicio')),
        precio: toNumber(pick(r, 'Precio')),
        duracionMin: Math.max(0, Math.round(toNumber(pick(r, 'Duracion_Min', 'Duracion', 'DuracionMin', 'Minutos'), 60))),
        tipo: adicional ? ('adicional' as const) : ('base' as const),
        categoria: adicional || /^base$/i.test(tipoRaw) || !tipoRaw ? 'Servicios' : tipoRaw,
      }
    })
    .filter((s) => s.nombre)
  return assignIds(items)
}

/** Resuelve IDs o nombres de servicios (sin distinguir mayúsculas ni acentos). */
function resolveServiceRefs(refs: string[], servicios: Service[]): string[] {
  return refs
    .map((ref) => {
      const key = normKey(ref)
      return (servicios.find((s) => normKey(s.id) === key) ?? servicios.find((s) => normKey(s.nombre) === key))?.id
    })
    .filter((id): id is string => Boolean(id))
}

export function normalizePromos(rows: unknown, servicios: Service[] = []): Promo[] {
  if (!Array.isArray(rows)) return []
  const items = rows
    .map((r: Row) => {
      const refs = str(pick(r, 'Servicios_Incluidos', 'Servicios'))
        .split(/[,;|+]/)
        .map((x) => x.trim())
        .filter(Boolean)
      return {
        id: str(pick(r, 'ID')),
        nombre: str(pick(r, 'Nombre', 'Promocion')),
        servicioIds: servicios.length ? resolveServiceRefs(refs, servicios) : refs,
        precio: toNumber(pick(r, 'Precio_Promo', 'Precio')),
      }
    })
    .filter((p) => p.nombre && p.servicioIds.length > 0)
  return assignIds(items)
}

// ---------- Horario semanal ----------

const DIAS: Record<string, number> = {
  domingo: 0, dom: 0, lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3,
  jueves: 4, jue: 4, viernes: 5, vie: 5, sabado: 6, sab: 6,
}

export function parseDia(value: unknown): number | null {
  const s = normKey(str(value))
  if (/^[0-6]$/.test(s)) return Number(s)
  if (s === '7') return 0
  return s in DIAS ? DIAS[s] : null
}

const emptyWeek = (): Array<Array<[number, number]>> => Array.from({ length: 7 }, () => [])

/** Filas {dia, inicio, fin} de la hoja Horarios → tramos por día. null si no hay datos. */
export function normalizeHorarios(rows: unknown): Array<Array<[number, number]>> | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const week = emptyWeek()
  let any = false
  for (const r of rows as Row[]) {
    const dia = parseDia(pick(r, 'dia', 'Dia'))
    const inicio = parseHHMM(str(pick(r, 'inicio', 'Hora_Inicio', 'Abre')))
    const fin = parseHHMM(str(pick(r, 'fin', 'Hora_Fin', 'Cierra')))
    if (dia === null || !Number.isFinite(inicio) || !Number.isFinite(fin) || fin <= inicio) continue
    week[dia].push([inicio, fin])
    any = true
  }
  week.forEach((tramos) => tramos.sort((a, b) => a[0] - b[0]))
  return any ? week : null
}

export const DEFAULT_SPA_MAPS = 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17'

export const DEFAULT_CONFIG: BusinessConfig = {
  nombreNegocio: 'ByMariaNails',
  whatsapp: DEFAULT_WHATSAPP,
  horario: [[], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]], [[540, 1140]]],
  intervaloMin: 30,
  diasAnticipacion: 21,
  anticipacionMinHoras: 2,
  zonaHoraria: 'America/Caracas',
  pagoMovil: { banco: '', telefono: '', cedula: '' },
  domicilio: { recargoPct: 20, minutosExtra: 15 },
  spa: { direccion: '', mapsUrl: DEFAULT_SPA_MAPS },
}

export function normalizeConfig(raw: unknown, horariosRaw?: unknown): BusinessConfig {
  const map: Record<string, string> = {}
  if (Array.isArray(raw)) {
    for (const r of raw as Row[]) if (str(r.Clave)) map[str(r.Clave).toLowerCase()] = str(r.Valor)
  } else if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw)) map[k.toLowerCase()] = str(v)
  }
  const int = (key: string, fallback: number) => {
    const n = Math.round(toNumber(map[key], Number.NaN))
    return Number.isFinite(n) && n >= 0 ? n : fallback
  }
  const d = DEFAULT_CONFIG

  // Horario: pestaña Horarios; si no existe (script anterior), las claves de Configuracion.
  let horario = normalizeHorarios(horariosRaw)
  if (!horario) {
    const abre = parseHHMM(map.hora_apertura ?? '')
    const cierra = parseHHMM(map.hora_cierre ?? '')
    const dias = (map.dias_laborales ?? '')
      .split(/[,;\s]+/)
      .map(parseDia)
      .filter((n): n is number => n !== null)
    if (Number.isFinite(abre) && Number.isFinite(cierra) && cierra > abre) {
      horario = emptyWeek()
      for (const dia of dias.length ? dias : [1, 2, 3, 4, 5, 6]) horario[dia] = [[abre, cierra]]
    } else {
      horario = d.horario
    }
  }

  const whatsapp = (map.whatsapp ?? '').replace(/\D/g, '')
  return {
    nombreNegocio: map.nombre_negocio || d.nombreNegocio,
    whatsapp: whatsapp || d.whatsapp,
    horario,
    intervaloMin: int('intervalo_min', d.intervaloMin) || d.intervaloMin,
    diasAnticipacion: int('dias_anticipacion', d.diasAnticipacion) || d.diasAnticipacion,
    anticipacionMinHoras: int('anticipacion_min_horas', d.anticipacionMinHoras),
    zonaHoraria: map.zona_horaria || d.zonaHoraria,
    pagoMovil: {
      banco: map.pm_banco ?? '',
      telefono: map.pm_telefono ?? '',
      cedula: map.pm_cedula ?? '',
    },
    domicilio: {
      recargoPct: map.recargo_domicilio_pct ? toNumber(map.recargo_domicilio_pct, d.domicilio.recargoPct) : d.domicilio.recargoPct,
      minutosExtra: int('minutos_extra_domicilio', d.domicilio.minutosExtra),
    },
    spa: {
      direccion: map.direccion_spa ?? '',
      mapsUrl: /^https?:\/\//.test(map.direccion_spa_url ?? '') ? map.direccion_spa_url : d.spa.mapsUrl,
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
  const servicios = normalizeServices(data.servicios)
  return {
    servicios,
    promociones: normalizePromos(data.promociones, servicios),
    config: normalizeConfig(data.config, data.horarios),
    tasa: normalizeTasa(data.tasa),
    citas: normalizeCitas(data.citasAgendadas),
  }
}
