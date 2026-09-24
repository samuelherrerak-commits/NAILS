import { parseHHMM } from './format'
import { addDays } from './slots'

export interface CalendarEvent {
  titulo: string
  fecha: string // YYYY-MM-DD (hora local del negocio)
  hora: string // HH:MM
  duracionMin: number
  ubicacion: string
  detalles: string
  zonaHoraria: string
}

const compact = (fecha: string, minutos: number) => {
  const dayOffset = Math.floor(minutos / 1440)
  const m = minutos - dayOffset * 1440
  const ymd = addDays(fecha, dayOffset).replace(/-/g, '')
  return `${ymd}T${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`
}

/**
 * Enlace "Agregar a Google Calendar" con la cita ya llena. Es gratis y no usa API:
 * Google abre el formulario del evento (en Android, en la app de Calendar).
 */
export function buildGoogleCalendarUrl(ev: CalendarEvent): string {
  const inicio = parseHHMM(ev.hora)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.titulo,
    dates: `${compact(ev.fecha, inicio)}/${compact(ev.fecha, inicio + Math.max(15, ev.duracionMin))}`,
    ctz: ev.zonaHoraria,
    location: ev.ubicacion,
    details: ev.detalles,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
