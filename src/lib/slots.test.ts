import { describe, expect, it } from 'vitest'
import type { BusinessConfig } from '../types'
import { buildAgenda, busyByDay, slotsForDay, zonedParts } from './slots'

const config: BusinessConfig = {
  nombreNegocio: 'Mariana',
  whatsapp: '584122516390',
  horario: [[], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]], [[540, 780]]],
  intervaloMin: 60,
  diasAnticipacion: 7,
  anticipacionMinHoras: 2,
  zonaHoraria: 'America/Caracas',
  pagoMovil: { banco: '', telefono: '', cedula: '' },
  domicilio: { recargoPct: 20, minutosExtra: 15 },
  spa: { direccion: '', mapsUrl: '' },
}

describe('zonedParts', () => {
  it('convierte a la hora de Caracas (UTC−4)', () => {
    expect(zonedParts(new Date('2026-09-24T14:30:00Z'), 'America/Caracas')).toEqual({
      ymd: '2026-09-24',
      minutes: 10 * 60 + 30,
    })
    expect(zonedParts(new Date('2026-09-25T02:00:00Z'), 'America/Caracas').ymd).toBe('2026-09-24')
  })
})

describe('slotsForDay', () => {
  const past = { ymd: '2026-09-01', minutes: 0 }

  it('bloquea cupos que se cruzan con citas según la duración', () => {
    const slots = slotsForDay('2026-09-24', config, 90, [[10 * 60, 11 * 60]], past)
    // 9:00 (9:00–10:30) choca, 10:00 choca, 11:00 (11:00–12:30) libre; 12:00 no cabe antes del cierre.
    expect(slots.map((s) => [s.hora, s.estado])).toEqual([
      ['09:00', 'reservado'],
      ['10:00', 'reservado'],
      ['11:00', 'libre'],
    ])
  })

  it('una cita que termina justo cuando empieza el cupo no lo bloquea', () => {
    const slots = slotsForDay('2026-09-24', config, 60, [[9 * 60, 10 * 60]], past)
    expect(slots.find((s) => s.hora === '10:00')?.estado).toBe('libre')
  })

  it('marca como pasados los cupos de hoy dentro de la anticipación mínima', () => {
    const now = { ymd: '2026-09-24', minutes: 8 * 60 + 30 } // 8:30 + 2 h → desde 10:30
    const slots = slotsForDay('2026-09-24', config, 60, [], now)
    expect(slots.filter((s) => s.estado === 'pasado').map((s) => s.hora)).toEqual(['09:00', '10:00'])
  })
})

describe('horario con pausa', () => {
  it('respeta varios tramos en el mismo día', () => {
    const cfg = { ...config, horario: config.horario.map((_, d) => (d === 4 ? [[540, 720], [840, 960]] as Array<[number, number]> : [])) }
    const slots = slotsForDay('2026-09-24', cfg, 60, [], { ymd: '2026-09-01', minutes: 0 })
    expect(slots.map((s) => s.hora)).toEqual(['09:00', '10:00', '11:00', '14:00', '15:00'])
  })

  it('un bloqueo de día completo deja el día sin cupos libres', () => {
    const now = new Date('2026-09-24T10:00:00Z')
    const bloqueo = [{ inicio: new Date('2026-09-26T04:00:00Z'), fin: new Date('2026-09-27T04:00:00Z') }]
    const days = buildAgenda(config, bloqueo, 60, now)
    expect(days.find((d) => d.fecha === '2026-09-26')?.libres).toBe(0)
  })
})

describe('busyByDay', () => {
  it('reparte citas que cruzan la medianoche', () => {
    const map = busyByDay(
      [{ inicio: new Date('2026-09-25T02:00:00Z'), fin: new Date('2026-09-25T06:00:00Z') }],
      'America/Caracas',
    )
    expect(map.get('2026-09-24')).toEqual([[22 * 60, 24 * 60]])
    expect(map.get('2026-09-25')).toEqual([[0, 2 * 60]])
  })
})

describe('buildAgenda', () => {
  it('omite días no laborables y cuenta cupos libres', () => {
    // Jueves 24 sep 2026, 06:00 en Caracas.
    const now = new Date('2026-09-24T10:00:00Z')
    const citas = [{ inicio: new Date('2026-09-25T13:00:00Z'), fin: new Date('2026-09-25T17:00:00Z') }] // viernes 9–13
    const days = buildAgenda(config, citas, 60, now)
    expect(days.map((d) => d.fecha)).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-28', '2026-09-29', '2026-09-30'])
    expect(days.find((d) => d.fecha === '2026-09-25')?.libres).toBe(0)
    expect(days.find((d) => d.fecha === '2026-09-26')?.libres).toBe(4)
  })
})
