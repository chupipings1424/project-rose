import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | undefined
  loading: boolean
}

/**
 * Runs an async loader whenever `deps` change and tracks loading / error / data.
 * A generic hook: `T` is inferred from what the loader resolves to.
 *
 *   const accounts = useAsync(() => trackerApi.accounts(), [])
 *   accounts.data  // Account[] | undefined
 */
export function useAsync<T>(loader: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    // If deps change before the request finishes, ignore the stale answer.
    let cancelled = false
    setState((previous) => ({ ...previous, loading: true, error: undefined }))
    loader().then(
      (data) => !cancelled && setState({ data, error: undefined, loading: false }),
      (error: unknown) =>
        !cancelled &&
        setState((previous) => ({
          ...previous,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        })),
    )
    return () => {
      cancelled = true
    }
    // The caller owns `deps`, exactly like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((data: T) => setState({ data, error: undefined, loading: false }), [])

  return { ...state, reload, setData }
}