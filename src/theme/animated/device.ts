/** Small media-query helpers. They return false when matchMedia is missing (old browsers, jsdom). */
const matches = (query: string) => typeof window.matchMedia === 'function' && window.matchMedia(query).matches

/** A phone or a small window: draw less to save battery. */
export const isSmallScreen = () => matches('(pointer: coarse), (max-width: 600px)')

/** A real mouse (laptop/desktop). Touch screens have no hover, so no "push away" effect there. */
export const hasMouse = () => matches('(hover: hover) and (pointer: fine)')

/** The phone or computer asks for less motion (an accessibility setting). */
export const prefersReducedMotion = () => matches('(prefers-reduced-motion: reduce)')