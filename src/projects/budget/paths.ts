/** Every Budget URL in one place (absolute, for the same reason as the tracker's paths.ts). */
export const BUDGET_BASE = '/projects/budget'

export const budgetPaths = {
  budget: BUDGET_BASE,
  report: `${BUDGET_BASE}/report`,
} as const