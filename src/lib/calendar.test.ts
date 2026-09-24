import { describe, expect, it } from 'vitest'
import { buildGoogleCalendarUrl } from './calendar'

describe('buildGoogleCalendarUrl', () => {
  const base = {
    titulo: '💅 Cita ByMariaNails · Kapping',
    fecha: '2026-09-24',
    hora: '15:30',
    duracionMin: 75,
    ubicacion: 'https://maps.app.goo.gl/MBfSuyGHQrRRcDp17',
    detalles: 'Kapping & más',
    zonaHoraria: 'America/Caracas',
  }

  it('usa hora local con ctz y calcula el fin', () => {
    const url = new URL(buildGoogleCalendarUrl(base))
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render')
    expect(url.searchParams.get('action')).toBe('TEMPLATE')
    expect(url.searchParams.get('dates')).toBe('20260924T153000/20260924T164500')
    expect(url.searchParams.get('ctz')).toBe('America/Caracas')
    expect(url.searchParams.get('text')).toBe('💅 Cita ByMariaNails · Kapping')
    expect(url.searchParams.get('details')).toBe('Kapping & más')
    expect(url.searchParams.get('location')).toBe(base.ubicacion)
  })

  it('una cita que termina después de medianoche pasa al día siguiente', () => {
    const url = new URL(buildGoogleCalendarUrl({ ...base, hora: '23:30', duracionMin: 60 }))
    expect(url.searchParams.get('dates')).toBe('20260924T233000/20260925T003000')
  })
})
