import type { BusinessConfig, BusyRange } from '../types'
import { toHHMM } from './format'

export type SlotState = 'libre' | 'reservado' | 'pasado'

export interface Slot {
  hora: string // HH:MM
  minutos: number
  estado: SlotState
}

export interface DayOption {
  fecha: string // YYYY-MM-DD
  weekday: number
  libres: number
  slots: Slot[]
}

interface ZonedParts {
  ymd: string
  minutes: number
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = partsFormatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
    partsFormatters.set(timeZone, f)
  }
  return f
}

/** Fecha y minutos del día en el reloj de pared de `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts = formatterFor(timeZone).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00'
  return {
    ymd: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  }
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Agrupa las citas por día como rangos [inicio, fin) en minutos locales. */
export function busyByDay(citas: BusyRange[], timeZone: string): Map<string, Array<[number, number]>> {
  const map = new Map<string, Array<[number, number]>>()
  const push = (ymd: string, range: [number, number]) => {
    const list = map.get(ymd)
    if (list) list.push(range)
    else map.set(ymd, [range])
  }
  for (const cita of citas) {
    const start = zonedParts(cita.inicio, timeZone)
    const end = zonedParts(cita.fin, timeZone)
    if (start.ymd === end.ymd) {
      push(start.ymd, [start.minutes, end.minutes])
      continue
    }
    // Cita que cruza la medianoche: se reparte entre los días.
    push(start.ymd, [start.minutes, 24 * 60])
    let day = addDays(start.ymd, 1)
    while (day < end.ymd) {
      push(day, [0, 24 * 60])
      day = addDays(day, 1)
    }
    push(end.ymd, [0, end.minutes])
  }
  return map
}

const overlaps = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1

export function slotsForDay(
  fecha: string,
  config: BusinessConfig,
  duracionMin: number,
  busy: Array<[number, number]>,
  now: ZonedParts,
): Slot[] {
  const slots: Slot[] = []
  const step = Math.max(5, config.intervaloMin)
  const dur = Math.max(step, duracionMin)
  const minStart =
    fecha === now.ymd ? now.minutes + config.anticipacionMinHoras * 60 : fecha < now.ymd ? Infinity : -Infinity

  for (let start = config.horaApertura; start + dur <= config.horaCierre; start += step) {
    let estado: SlotState = 'libre'
    if (start < minStart) estado = 'pasado'
    else if (busy.some(([b0, b1]) => overlaps(start, start + dur, b0, b1))) estado = 'reservado'
    slots.push({ hora: toHHMM(start), minutos: start, estado })
  }
  return slots
}

/** Próximos días laborables con sus cupos, empezando hoy. */
export function buildAgenda(
  config: BusinessConfig,
  citas: BusyRange[],
  duracionMin: number,
  nowDate: Date = new Date(),
): DayOption[] {
  const now = zonedParts(nowDate, config.zonaHoraria)
  const busy = busyByDay(citas, config.zonaHoraria)
  const days: DayOption[] = []
  for (let i = 0; i < config.diasAnticipacion; i++) {
    const fecha = addDays(now.ymd, i)
    const weekday = weekdayOf(fecha)
    if (!config.diasLaborales.includes(weekday)) continue
    const slots = slotsForDay(fecha, config, duracionMin, busy.get(fecha) ?? [], now)
    days.push({ fecha, weekday, slots, libres: slots.filter((s) => s.estado === 'libre').length })
  }
  return days
}
