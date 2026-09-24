import { forwardRef } from 'react'
import { toast } from 'sonner'
import { formatBs } from '../../lib/format'
import { haptic } from '../../lib/motion'
import type { PagoMovilData, Tasa } from '../../types'
import { Field } from '../ui/Field'
import { IconCopy } from '../ui/icons'

interface PagoMovilDetailsProps {
  data: PagoMovilData
  totalBs: number | null
  tasa: Tasa | null
  referencia: string
  onReferencia: (value: string) => void
  error: string | null
}

async function copy(value: string, label: string) {
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
  haptic(10)
  toast.success(`${label} copiado`)
}

function formatTasaFecha(fecha: string | null): string | null {
  if (!fecha) return null
  // "2026-09-24" sin hora: es una fecha de calendario, no un instante UTC.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
  const d = new Date(dateOnly ? `${fecha}T12:00:00Z` : fecha)
  if (Number.isNaN(d.getTime())) return fecha
  return new Intl.DateTimeFormat('es-VE', { day: 'numeric', month: 'short', timeZone: 'America/Caracas' }).format(d)
}

export const PagoMovilDetails = forwardRef<HTMLInputElement, PagoMovilDetailsProps>(function PagoMovilDetails(
  { data, totalBs, tasa, referencia, onReferencia, error },
  ref,
) {
  const rows = [
    { label: 'Banco', value: data.banco, copyValue: data.banco.replace(/.*\((\d{4})\).*/, '$1') },
    { label: 'Teléfono', value: data.telefono, copyValue: data.telefono.replace(/\D/g, '') },
    { label: 'Cédula / RIF', value: data.cedula, copyValue: data.cedula.replace(/[^\dVEJGP]/gi, '') },
  ].filter((r) => r.value)

  const fecha = formatTasaFecha(tasa?.fecha ?? null)

  return (
    <div className="space-y-4 border-t border-rose/60 pt-4">
      <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
        <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-muted">Monto a transferir</p>
        {totalBs !== null && tasa ? (
          <>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-[26px] font-semibold tabular-nums tracking-[-0.02em]">{formatBs(totalBs)}</p>
              <CopyButton className="-mr-3" label="Monto" onClick={() => copy(totalBs.toFixed(2).replace('.', ','), 'Monto')} />
            </div>
            <p className="mt-1 text-[12px] text-muted tabular-nums">
              Tasa BCV del euro: {formatBs(tasa.valor)}
              {fecha ? ` · ${fecha}` : ''}
            </p>
          </>
        ) : (
          <p className="mt-1 text-[14px] text-muted">
            No pudimos obtener la tasa BCV ahora. Te confirmamos el monto en Bs por WhatsApp.
          </p>
        )}
      </div>

      {rows.length > 0 ? (
        <dl className="divide-y divide-line overflow-hidden rounded-xl bg-surface ring-1 ring-line">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-3 py-1 pl-4 pr-1">
              <dt className="w-24 shrink-0 text-[13px] text-muted">{row.label}</dt>
              <dd className="min-w-0 flex-1 truncate text-[15px] font-medium tabular-nums">{row.value}</dd>
              <CopyButton label={row.label} onClick={() => copy(row.copyValue || row.value, row.label)} />
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-[13px] text-muted">Te enviaremos los datos del Pago Móvil por WhatsApp.</p>
      )}

      <Field
        ref={ref}
        label="Número de referencia"
        inputMode="numeric"
        autoComplete="off"
        pattern="[0-9]*"
        placeholder="Ej. 004512"
        value={referencia}
        onChange={(e) => onReferencia(e.target.value)}
        error={error}
        hint="Los últimos dígitos que te muestra tu banco (mínimo 4)."
      />
    </div>
  )
})

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
