import type { CommandDraft } from '../commands/draft'

/**
 * Opens the (+) quick add dialog from anywhere - e.g. the command bar's "Edit" on the
 * Today page. AppShell owns the dialog and listens for this event, so pages don't
 * need a prop passed all the way down.
 */
export const QUICK_ADD_EVENT = 'rose:quick-add'

export function openQuickAdd(draft?: CommandDraft): void {
  window.dispatchEvent(new CustomEvent<CommandDraft | undefined>(QUICK_ADD_EVENT, { detail: draft }))
}