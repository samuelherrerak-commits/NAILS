import type { Ref } from 'react'
import type { Customer, Modalidad } from '../../types'
import { Field } from '../ui/Field'

export interface CustomerErrors {
  nombre: string | null
  telefono: string | null
  direccion: string | null
}

export function validateCustomer(c: Customer, modalidad: Modalidad | null = null): CustomerErrors {
  const digits = c.telefono.replace(/\D/g, '')
  return {
    nombre: c.nombre.trim().length < 2 ? 'Escribe tu nombre.' : null,
    telefono: digits.length < 10 || digits.length > 13 ? 'Escribe un teléfono válido, ej. 0412 123 4567.' : null,
    direccion:
      modalidad === 'domicilio' && c.direccion.trim().length < 8
        ? 'Escribe la dirección donde te atenderemos (urbanización, calle, casa o apto).'
        : null,
  }
}

interface CustomerFormProps {
  customer: Customer
  onChange: (patch: Partial<Customer>) => void
  errors: CustomerErrors
  showErrors: boolean
  nombreRef?: Ref<HTMLInputElement>
  telefonoRef?: Ref<HTMLInputElement>
  direccionRef?: Ref<HTMLInputElement>
  modalidad: Modalidad | null
}

export function CustomerForm({
  customer,
  onChange,
  errors,
  showErrors,
  nombreRef,
  telefonoRef,
  direccionRef,
  modalidad,
}: CustomerFormProps) {
  return (
    <div className="space-y-3">
      <Field
        ref={nombreRef}
        label="Nombre y apellido"
        autoComplete="name"
        autoCapitalize="words"
        enterKeyHint="next"
        placeholder="María Pérez"
        value={customer.nombre}
        onChange={(e) => onChange({ nombre: e.target.value })}
        error={showErrors ? errors.nombre : null}
      />
      <Field
        ref={telefonoRef}
        label="Teléfono (WhatsApp)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        enterKeyHint={modalidad === 'domicilio' ? 'next' : 'done'}
        placeholder="0412 123 4567"
        value={customer.telefono}
        onChange={(e) => onChange({ telefono: e.target.value })}
        error={showErrors ? errors.telefono : null}
      />
      {modalidad === 'domicilio' && (
        <Field
          ref={direccionRef}
          label="Dirección para la cita a domicilio"
          autoComplete="street-address"
          enterKeyHint="done"
          placeholder="Urbanización, calle, casa o apto, punto de referencia"
          value={customer.direccion}
          onChange={(e) => onChange({ direccion: e.target.value })}
          error={showErrors ? errors.direccion : null}
        />
      )}
    </div>
  )
}
