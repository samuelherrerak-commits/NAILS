const numberFmt = (min: number, max: number) =>
  new Intl.NumberFormat('es-VE', { minimumFractionDigits: min, maximumFractionDigits: max })

const eurFixed = numberFmt(2, 2)
const eurCompact = numberFmt(0, 2)

/** "15 €" en tarjetas, "15,00 €" cuando `fixed`. */
export function formatEUR(value: number, fixed = false): string {
  return `${(fixed ? eurFixed : eurCompact).format(value)} €`
}

export function formatBs(value: number): string {
  return `Bs. ${eurFixed.format(value)}`
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Minutos desde medianoche → "HH:MM". */
export function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** "HH:MM" o "H:MM" → minutos; NaN si no es válido. */
export function parseHHMM(value: string): number {
  const match = /^(\d{1,2}):(\d{2})/.exec(value.trim())
  if (!match) return Number.NaN
  return Number(match[1]) * 60 + Number(match[2])
}

/** "14:30" → "2:30 p. m." */
export function formatTime12(hhmm: string): string {
  const minutes = parseHHMM(hhmm)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  const suffix = h < 12 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

function ymdToUTC(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** "2026-09-24" → "jueves 24 de septiembre" */
export function formatLongDate(ymd: string): string {
  return new Intl.DateTimeFormat('es-VE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
    .format(ymdToUTC(ymd))
    .replace(',', '')
}

export function formatWeekdayShort(ymd: string): string {
  const s = new Intl.DateTimeFormat('es-VE', { weekday: 'short', timeZone: 'UTC' }).format(ymdToUTC(ymd))
  return s.replace('.', '')
}

export function formatMonthShort(ymd: string): string {
  const s = new Intl.DateTimeFormat('es-VE', { month: 'short', timeZone: 'UTC' }).format(ymdToUTC(ymd))
  return s.replace('.', '')
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
