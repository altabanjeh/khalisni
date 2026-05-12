import { useCallback, useEffect, useState } from 'react'

export function useAsyncData(loader, dependencies = [], initialValue = null) {
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((current) => current + 1), [])

  useEffect(() => {
    let mounted = true

    async function run() {
      try {
        setLoading(true)
        setError(null)
        const result = await loader()
        if (mounted) setData(result)
      } catch (err) {
        if (mounted) setError(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()

    return () => {
      mounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, ...dependencies])

  return {
    data,
    loading,
    error,
    setData,
    reload,
  }
}
