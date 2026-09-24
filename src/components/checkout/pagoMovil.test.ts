import { describe, expect, it } from 'vitest'
import { pagoMovilClipboard } from './PagoMovilDetails'

describe('Copiar todo', () => {
  it('arma el texto para pegar en la app del banco', () => {
    const text = pagoMovilClipboard({ banco: 'Banesco (0134)', telefono: '0412-2516390', cedula: 'V-12.345.678' }, 16559.02)
    expect(text).toBe('Banco: 0134 Banesco\nTeléfono: 04122516390\nCédula: V12345678\nMonto: 16559,02')
  })
})
