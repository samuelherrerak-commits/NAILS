import { useCallback, useEffect, useState } from 'react'
import { fetchData } from '../lib/api'
import type { Catalog } from '../types'

type CatalogState =
  | { status: 'loading'; catalog: null; error: null }
  | { status: 'ready'; catalog: Catalog; error: null }
  | { status: 'error'; catalog: null; error: string }

export function useCatalog() {
  const [state, setState] = useState<CatalogState>({ status: 'loading', catalog: null, error: null })

  const load = useCallback(async () => {
    setState({ status: 'loading', catalog: null, error: null })
    try {
      setState({ status: 'ready', catalog: await fetchData(), error: null })
    } catch (e) {
      setState({ status: 'error', catalog: null, error: e instanceof Error ? e.message : 'Error desconocido' })
    }
  }, [])

  /** Vuelve a pedir la ocupación sin mostrar el estado de carga. */
  const refresh = useCallback(async () => {
    try {
      const catalog = await fetchData()
      setState({ status: 'ready', catalog, error: null })
    } catch {
      /* se mantiene lo que ya había */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return { ...state, retry: load, refresh }
}
