/**
 * A "draft" is something ROSE is about to save, before you confirm it. The command
 * bar turns "kape 50" into a draft, shows it as a preview card, and either saves it
 * or opens quick add with the draft filled in.
 */
export type CommandDraft =
  | { kind: 'expense'; item: string; amount: number; date: string }
  /** amount null = use the title's plan amount. */
  | { kind: 'payment'; title: string; amount: number | null; date: string }
  /** dueAt is an ISO date-time. */
  | { kind: 'reminder'; text: string; dueAt: string }