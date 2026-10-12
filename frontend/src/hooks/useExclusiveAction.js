import { useCallback, useRef, useState } from 'react'

/**
 * Run one action at a time on a screen.
 *
 * `exclusive(key, fn)` returns a handler that ignores calls while any action
 * is in flight (a ref closes the gap before React re-renders, so a rapid
 * double click cannot start the request twice). `busy` holds the key of the
 * running action for disabling controls and showing progress.
 *
 * This only prevents duplicate submissions from the UI. The server remains
 * the authority on which workflow actions are valid.
 */
export function useExclusiveAction() {
  const runningRef = useRef('')
  const [busy, setBusy] = useState('')

  const exclusive = useCallback((key, fn) => async (...args) => {
    if (runningRef.current) return undefined
    runningRef.current = key
    setBusy(key)
    try {
      return await fn(...args)
    } finally {
      runningRef.current = ''
      setBusy('')
    }
  }, [])

  return { busy, exclusive }
}
