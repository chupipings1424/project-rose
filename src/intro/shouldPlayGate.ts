/**
 * The gate is skipped when the visitor asked the OS for reduced motion, or when
 * the URL contains ?nogate (handy while developing).
 */
export function shouldPlayGate(): boolean {
  if (typeof window === 'undefined') return false
  if (new URLSearchParams(window.location.search).has('nogate')) return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
}