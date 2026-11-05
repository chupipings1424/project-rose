/**
 * A tiny "something changed" signal. Quick add fires it after saving, and pages
 * that show a summary (Today) listen and reload. A plain DOM event keeps the two
 * sides from importing each other.
 */
export const DATA_CHANGED_EVENT = 'rose:data-changed'

export function announceDataChanged(): void {
  window.dispatchEvent(new Event(DATA_CHANGED_EVENT))
}