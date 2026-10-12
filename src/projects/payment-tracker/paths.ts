/**
 * Every Payment Tracker URL in one place.
 *
 * Why absolute paths? This app is mounted on a splat route
 * (`/projects/payment-tracker/*`). Inside a splat, a relative link like
 * `to="report"` resolves against the *current* URL, so clicking tabs in a row
 * produced `/payments/report/report`. Absolute paths always land correctly.
 */
export const TRACKER_BASE = '/projects/payment-tracker'

export const trackerPaths = {
  payments: TRACKER_BASE,
  report: `${TRACKER_BASE}/report`,
} as const