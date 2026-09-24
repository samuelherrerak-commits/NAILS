import { AnimatePresence, motion } from 'framer-motion'
import { forwardRef, useRef, useState } from 'react'
import { toast } from 'sonner'
import { formatBs } from '../../lib/format'
import { compressImage } from '../../lib/image'
import { haptic, spring, tap } from '../../lib/motion'
import type { Comprobante, PagoMovilData, Tasa } from '../../types'
import { Button, Spinner } from '../ui/Button'
import { IconCheck, IconCopy, IconUpload } from '../ui/icons'

interface PagoMovilDetailsProps {
  data: PagoMovilData
  totalBs: number | null
  tasa: Tasa | null
  pagado: boolean
  comprobante: Comprobante | null
  onPagado: () => void
  onComprobante: (c: Comprobante | null) => void
  error: string | null
}

async function writeClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value)
  } catch {
    // Respaldo para navegadores sin API de portapapeles.
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
}

async function copy(value: string, label: string, message = `${label} copiado`) {
  await writeClipboard(value)
  haptic(10)
  toast.success(message)
}

const bancoCodigo = (banco: string) => /\d{4}/.exec(banco)?.[0] ?? ''
const bancoNombre = (banco: string) => banco.replace(/\(?\d{4}\)?/, '').replace(/[-·]/g, ' ').replace(/\s+/g, ' ').trim()
const soloDigitos = (s: string) => s.replace(/\D/g, '')
const cedulaLimpia = (s: string) => s.replace(/[^\dVEJGP]/gi, '').toUpperCase()
const montoPlano = (n: number) => n.toFixed(2).replace('.', ',')

/** Texto listo para pegar en la app del banco. */
export function pagoMovilClipboard(data: PagoMovilData, totalBs: number | null): string {
  const lines = []
  if (data.banco) lines.push(`Banco: ${[bancoCodigo(data.banco), bancoNombre(data.banco)].filter(Boolean).join(' ')}`)
  if (data.telefono) lines.push(`Teléfono: ${soloDigitos(data.telefono)}`)
  if (data.cedula) lines.push(`Cédula: ${cedulaLimpia(data.cedula)}`)
  if (totalBs !== null) lines.push(`Monto: ${montoPlano(totalBs)}`)
  return lines.join('\n')
}

function formatTasaFecha(fecha: string | null): string | null {
  if (!fecha) return null
  // "2026-09-24" sin hora: es una fecha de calendario, no un instante UTC.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  const d = new Date(dateOnly ? `${fecha}T12:00:00Z` : fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' }).format(d)
}

export const PagoMovilDetails = forwardRef<HTMLDivElement, PagoMovilDetailsProps>(function PagoMovilDetails(
  { data, totalBs, tasa, pagado, comprobante, onPagado, onComprobante, error },
  ref,
) {
  const rows = [
    { label: 'Banco', value: data.banco, copyValue: bancoCodigo(data.banco) || data.banco },
    { label: 'Teléfono', value: data.telefono, copyValue: soloDigitos(data.telefono) },
    { label: 'Cédula / RIF', value: data.cedula, copyValue: cedulaLimpia(data.cedula) },
  ].filter((r) => r.value)
  const fecha = formatTasaFecha(tasa?.fecha ?? null)
  const configurado = rows.length === 3

  return (
    <div className="space-y-4 border-t border-rose/60 pt-4">
      <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Monto a transferir</p>
        {totalBs !== null && tasa ? (
          <>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{formatBs(totalBs)}</p>
              <CopyButton className="-mr-3" label="Monto" onClick={() => copy(montoPlano(totalBs), 'Monto')} />
            </div>
            <p className="mt-1 text-[12px] text-muted tabular-nums">
              Tasa BCV del euro: {formatBs(tasa.valor)}
              {fecha ? ` · ${fecha}` : ''}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[14px] text-muted">La tasa BCV no está disponible en este momento. Intenta de nuevo en unos minutos.</p>
        )}
      </div>

      {rows.length > 0 && (
        <dl className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-1 pl-4 pr-1">
              <dt className="w-24 shrink-0 text-[13px] text-muted">{row.label}</dt>
              <dd className="min-w-0 flex-1 truncate text-[15px] font-medium tabular-nums">{row.value}</dd>
              <CopyButton label={row.label} onClick={() => copy(row.copyValue || row.value, row.label)} />
            </div>
          ))}
        </dl>
      )}
      {!configurado && (
        <p className="text-[13px] text-danger">Faltan datos del Pago Móvil en la configuración del negocio.</p>
      )}

      <Button
        block
        variant="secondary"
        onClick={() => copy(pagoMovilClipboard(data, totalBs), '', 'Datos copiados: pégalos en tu app del banco')}
        disabled={rows.length === 0}
      >
        <IconCopy size={18} /> Copiar todo
      </Button>
      <p className="-mt-2 text-center text-[12px] text-muted">Copia banco, teléfono, cédula y monto para pegarlos en tu banco.</p>

      <div ref={ref} className="scroll-mt-28">
        <AnimatePresence mode="wait" initial={false}>
          {!pagado ? (
            <motion.div key="ya-pague" exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <Button block onClick={onPagado} className="!bg-rose !text-ink !shadow-card">
                <IconCheck size={19} /> Ya pagué
              </Button>
              <p className="min-h-[1.25rem] pt-1.5 text-center text-[13px] text-danger" aria-live="polite">
                {error}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={spring.gentle}
            >
              <ComprobanteUpload value={comprobante} onChange={onComprobante} error={error} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
})

function ComprobanteUpload({
  value,
  onChange,
  error,
}: {
  value: Comprobante | null
  onChange: (c: Comprobante | null) => void
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setLoading(true)
    setLocalError(null)
    try {
      const dataUrl = await compressImage(file)
      onChange({ dataUrl, nombre: file.name.replace(/\.[^.]+$/, '') + '.jpg' })
      haptic(12)
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'No pudimos cargar la imagen.')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const shownError = localError ?? error
  return (
    <div>
      <p className="mb-1.5 text-[13px] font-medium text-muted">Capture del Pago Móvil</p>
      <input
        ref={inputRef}
        id="comprobante"
        type="file"
        accept="image/*"
        className="sr-only"
        aria-describedby="comprobante-error"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
          <img src={value.dataUrl} alt="Capture del pago" className="max-h-72 w-full object-contain bg-sand/50" />
          <div className="flex items-center justify-between gap-2 p-2 pl-4">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ok">
              <IconCheck size={16} /> Capture listo
            </span>
            <div className="flex">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="h-11 rounded-full px-3 text-[14px] font-medium text-rose-deep active:bg-rose-soft"
              >
                Cambiar
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="h-11 rounded-full px-3 text-[14px] text-muted active:bg-sand"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <motion.label
          htmlFor="comprobante"
          whileTap={tap}
          className={`flex min-h-[132px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed bg-surface px-4 text-center transition-colors ${
            shownError ? 'border-danger/60' : 'border-rose'
          }`}
        >
          {loading ? (
            <Spinner className="text-rose-deep" />
          ) : (
            <span className="grid size-11 place-items-center rounded-full bg-rose-soft text-rose-deep">
              <IconUpload size={22} />
            </span>
          )}
          <span className="text-[15px] font-medium">{loading ? 'Preparando imagen…' : 'Sube el capture del pago'}</span>
          <span className="text-[12px] text-muted">Desde tu galería o tomando una foto</span>
        </motion.label>
      )}
      <p id="comprobante-error" className="min-h-[1.25rem] pt-1.5 text-[13px] text-danger" aria-live="polite">
        {shownError}
      </p>
    </div>
  )
}

function CopyButton({ label, onClick, className = '' }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-muted transition-colors active:bg-sand ${className}`}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      <IconCopy size={18} />
    </button>
  )
}
