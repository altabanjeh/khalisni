import { useEffect, useState } from 'react'

function getMatch(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(query).matches
}

/** Tracks a CSS media query; false where matchMedia is unavailable (tests). */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => getMatch(query))

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mediaQuery = window.matchMedia(query)
    const update = (event) => setMatches(event.matches)
    setMatches(mediaQuery.matches)
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [query])

  return matches
}

export default useMediaQuery
