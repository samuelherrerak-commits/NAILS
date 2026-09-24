import { AnimatePresence, motion, type Variants } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CartBar } from './components/CartBar'
import { CartSheet } from './components/CartSheet'
import { useCatalog } from './hooks/useCatalog'
import { spring } from './lib/motion'
import { summarize } from './lib/pricing'
import { useOrder } from './state/order'
import { AgendaView } from './views/AgendaView'
import { CatalogView } from './views/CatalogView'
import { PaymentView } from './views/PaymentView'
import { SuccessView } from './views/SuccessView'

type View = 'catalogo' | 'agenda' | 'pago' | 'listo'
const STEP: Record<View, number> = { catalogo: 0, agenda: 1, pago: 2, listo: 3 }

const EMPTY_CATALOG = { servicios: [], promociones: [], tasa: null }

export default function App() {
  const { status, catalog, error, retry, refresh } = useCatalog()
  const { state, dispatch } = useOrder()
  const [view, setView] = useState<View>('catalogo')
  const [direction, setDirection] = useState(1)
  const [cartOpen, setCartOpen] = useState(false)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const catalogScroll = useRef(0)

  const summary = useMemo(
    () => summarize(state.cart, catalog ?? EMPTY_CATALOG, state.coupon, state.modalidad, catalog?.config.domicilio),
    [state.cart, state.coupon, state.modalidad, catalog],
  )

  const show = useCallback((next: View) => {
    setView((current) => {
      if (current === 'catalogo') catalogScroll.current = window.scrollY
      setDirection(STEP[next] >= STEP[current] ? 1 : -1)
      return next
    })
  }, [])

  // Cada pantalla es una entrada del historial: el botón "atrás" del teléfono funciona.
  const navigate = useCallback(
    (next: View) => {
      window.history.pushState({ view: next }, '')
      show(next)
    },
    [show],
  )
  const goBack = useCallback(() => window.history.back(), [])

  useEffect(() => {
    window.history.replaceState({ view: 'catalogo' }, '')
    const onPop = (e: PopStateEvent) => {
      setCartOpen(false)
      const next = (e.state?.view as View | undefined) ?? 'catalogo'
      show(next === 'listo' ? 'catalogo' : next)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [show])

  // Protecciones: no se llega a agenda/pago sin catálogo, servicio base o cupo.
  useEffect(() => {
    if (view === 'catalogo' || view === 'listo') return
    if (status !== 'ready' || !summary.hasBase || !state.modalidad) show('catalogo')
    else if (view === 'pago' && !state.schedule) show('agenda')
  }, [view, status, summary.hasBase, state.modalidad, state.schedule, show])

  const startBooking = () => {
    setCartOpen(false)
    navigate('agenda')
  }

  const onSuccess = (url: string) => {
    setWhatsappUrl(url)
    dispatch({ type: 'reset' })
    window.history.replaceState({ view: 'listo' }, '')
    show('listo')
  }

  const startOver = () => {
    setWhatsappUrl(null)
    window.history.replaceState({ view: 'catalogo' }, '')
    catalogScroll.current = 0
    show('catalogo')
    void refresh()
  }

  const onSlotTaken = () => {
    dispatch({ type: 'setSchedule', schedule: null })
    void refresh()
    goBack()
  }

  let page: ReactNode = null
  if (view === 'catalogo') {
    page = <CatalogView catalog={catalog} status={status} error={error} onRetry={retry} summary={summary} />
  } else if (view === 'agenda' && catalog) {
    page = <AgendaView catalog={catalog} summary={summary} onBack={goBack} onContinue={() => navigate('pago')} />
  } else if (view === 'pago' && catalog) {
    page = (
      <PaymentView
        catalog={catalog}
        summary={summary}
        onBack={goBack}
        onSlotTaken={onSlotTaken}
        onSuccess={onSuccess}
      />
    )
  } else if (view === 'listo' && whatsappUrl) {
    page = <SuccessView whatsappUrl={whatsappUrl} onNew={startOver} />
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg overflow-x-clip">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <Page key={view} direction={direction} scrollTo={view === 'catalogo' ? catalogScroll.current : 0}>
          {page}
        </Page>
      </AnimatePresence>

      <CartBar count={view === 'catalogo' ? summary.count : 0} total={summary.total} onOpen={() => setCartOpen(true)} />
      <CartSheet open={cartOpen} onClose={() => setCartOpen(false)} summary={summary} onContinue={startBooking} config={catalog?.config ?? null} />
    </div>
  )
}

const pageVariants: Variants = {
  enter: (d: number) => ({ x: d * 40, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: spring.page },
  exit: (d: number) => ({ x: d * -24, opacity: 0, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] as const } }),
}

function Page({ children, direction, scrollTo }: { children: ReactNode; direction: number; scrollTo: number }) {
  useLayoutEffect(() => {
    window.scrollTo(0, scrollTo)
    // Solo al montar la pantalla.
  }, [])
  return (
    <motion.main custom={direction} variants={pageVariants} initial="enter" animate="center" exit="exit">
      {children}
    </motion.main>
  )
}
