import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import type { Cart, Comprobante, Coupon, Customer, Modalidad, Payment, Schedule } from '../types'

export interface OrderState {
  cart: Cart
  coupon: Coupon | null
  schedule: Schedule | null
  modalidad: Modalidad | null
  customer: Customer
  payment: Payment | null
}

export type OrderAction =
  | { type: 'toggleService'; id: string }
  | { type: 'togglePromo'; id: string }
  | { type: 'setCoupon'; coupon: Coupon | null }
  | { type: 'setSchedule'; schedule: Schedule | null }
  | { type: 'setCustomer'; customer: Partial<Customer> }
  | { type: 'setPaymentMethod'; metodo: Payment['metodo'] }
  | { type: 'setModalidad'; modalidad: Modalidad }
  | { type: 'setPagado'; pagado: boolean }
  | { type: 'setComprobante'; comprobante: Comprobante | null }
  | { type: 'reset' }

export const initialOrder: OrderState = {
  cart: { servicios: [], promos: [] },
  coupon: null,
  schedule: null,
  modalidad: null,
  customer: { nombre: '', telefono: '' },
  payment: null,
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

export function orderReducer(state: OrderState, action: OrderAction): OrderState {
  switch (action.type) {
    // Cambiar el carrito cambia la duración, así que el cupo elegido deja de ser válido.
    case 'toggleService':
      return { ...state, cart: { ...state.cart, servicios: toggle(state.cart.servicios, action.id) }, schedule: null }
    case 'togglePromo':
      return { ...state, cart: { ...state.cart, promos: toggle(state.cart.promos, action.id) }, schedule: null }
    case 'setCoupon':
      return { ...state, coupon: action.coupon }
    case 'setSchedule':
      return { ...state, schedule: action.schedule }
    case 'setCustomer':
      return { ...state, customer: { ...state.customer, ...action.customer } }
    case 'setPaymentMethod':
      if (state.payment?.metodo === action.metodo) return state
      return {
        ...state,
        payment:
          action.metodo === 'pago_movil' ? { metodo: 'pago_movil', pagado: false, comprobante: null } : { metodo: 'lugar' },
      }
    // A domicilio suma minutos: el cupo elegido deja de ser válido.
    case 'setModalidad':
      if (state.modalidad === action.modalidad) return state
      return { ...state, modalidad: action.modalidad, schedule: null }
    case 'setPagado':
      if (state.payment?.metodo !== 'pago_movil') return state
      return { ...state, payment: { ...state.payment, pagado: action.pagado } }
    case 'setComprobante':
      if (state.payment?.metodo !== 'pago_movil') return state
      return { ...state, payment: { ...state.payment, pagado: true, comprobante: action.comprobante } }
    case 'reset':
      return initialOrder
  }
}

// El navegador puede recargar la pestaña al volver de la app del banco:
// guardamos el borrador para no perder la orden.
const STORAGE_KEY = 'bymarianails:borrador:v2'

function loadDraft(): OrderState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return initialOrder
    const parsed = JSON.parse(raw) as Partial<OrderState>
    return {
      ...initialOrder,
      ...parsed,
      cart: { ...initialOrder.cart, ...parsed.cart },
      customer: { ...initialOrder.customer, ...parsed.customer },
    }
  } catch {
    return initialOrder
  }
}

function saveDraft(state: OrderState) {
  try {
    // La imagen del capture es pesada: no se guarda (se vuelve a subir si recarga).
    const draft =
      state.payment?.metodo === 'pago_movil' ? { ...state, payment: { ...state.payment, comprobante: null } } : state
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
}

const OrderContext = createContext<{ state: OrderState; dispatch: Dispatch<OrderAction> } | null>(null)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, undefined, loadDraft)
  useEffect(() => saveDraft(state), [state])
  return <OrderContext.Provider value={{ state, dispatch }}>{children}</OrderContext.Provider>
}

export function useOrder() {
  const ctx = useContext(OrderContext)
  if (!ctx) throw new Error('useOrder debe usarse dentro de <OrderProvider>')
  return ctx
}
