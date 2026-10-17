import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',')

export function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.closest('[inert]') && !element.closest('[aria-hidden="true"]'),
  )
}

/**
 * Dialog focus management for an open panel:
 * - moves focus into the panel when it opens (first focusable element, or the
 *   panel itself when `initialFocus` is 'container' or nothing is focusable;
 *   the panel needs tabIndex={-1} for that),
 * - closes on Escape,
 * - keeps Tab inside the panel when `trapFocus` is true (modal dialogs),
 * - returns focus to the element that was focused before opening (the trigger).
 */
export function useDialogFocus(open, containerRef, { onClose, trapFocus = false, initialFocus = 'first' } = {}) {
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    const container = containerRef.current
    if (!container) return undefined

    const previouslyFocused = document.activeElement
    const first = initialFocus === 'container' ? null : getFocusableElements(container)[0]
    ;(first || container).focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current?.()
        return
      }
      if (event.key !== 'Tab' || !trapFocus) return

      const items = getFocusableElements(container)
      if (!items.length) {
        event.preventDefault()
        container.focus()
        return
      }
      const firstItem = items[0]
      const lastItem = items[items.length - 1]
      const active = document.activeElement
      const outside = !container.contains(active)
      if (event.shiftKey && (outside || active === firstItem || active === container)) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && (outside || active === lastItem)) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused && previouslyFocused !== document.body && previouslyFocused.isConnected && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus()
      }
    }
  }, [open, containerRef, trapFocus, initialFocus])
}

export default useDialogFocus
