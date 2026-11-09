import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, LoadingState } from '../components/States'
import { useToast } from '../components/toast/useToast'
import { useCurrency } from '../currency/useCurrency'
import { useAsync } from '../hooks/useAsync'
import { longDate } from '../lib/format'
import { useOffline } from '../lib/offline'
import { habitsApi } from '../projects/habits/api/client'
import { remindersApi } from '../projects/reminders/api/client'
import { friendlyTime } from '../projects/reminders/lib/time'
import { workbookApi } from '../projects/workbook/api/client'
import { dueLabel, todayApi, type TodayHabit, type TodayPayment, type TodayReminder, type TodayView } from './api'
import { useAutoRefresh } from '../hooks/useAutoRefresh'

// "kape 50" / "remind me ... bukas 5pm" - its own small file, loaded after the page.

const trackerLink = (title: string) => `/projects/payment-tracker?title=${encodeURIComponent(title)}`

function BudgetCard({ budget }: { budget: TodayView['budget'] }) {
  const { compactMoney } = useCurrency()
  return (
    <section className="card today-card" aria-labelledby="today-budget">
      <h2 id="today-budget" className="section-title">
        Budget · {budget.month_name}
      </h2>
      <div className="today-budget">
        <div>
          <span className="muted small">Revenue</span>
          <strong>{compactMoney(budget.revenue)}</strong>
        </div>
        <div>
          <span className="muted small">Spent</span>
          <strong>{compactMoney(budget.expenses)}</strong>
        </div>
        <div className={budget.left < 0 ? 'tone-text-danger' : 'tone-text-ok'}>
          <span className="muted small">Left</span>
          <strong>{compactMoney(budget.left)}</strong>
        </div>
      </div>
      <Link to="/projects/budget" className="btn link">
        Open budget →
      </Link>
    </section>
  )
}

function PaymentsCard({ payments, busy, disabled, run }: { payments: TodayPayment[] } & ActionProps) {
  const { money } = useCurrency()
  return (
    <section className="card today-card" aria-labelledby="today-payments">
      <h2 id="today-payments" className="section-title">
        Payments due
      </h2>
      {payments.length === 0 ? (
        <p className="muted">Nothing due in the next 7 days.</p>
      ) : (
        <ul className="today-list">
          {payments.map((payment) => (
            <li key={payment.id} className="today-row">
              <Link to={trackerLink(payment.title)} className="today-main today-link">
                <strong>{payment.title}</strong>
                <span className="muted small">
                  {money(payment.amount)} ·{' '}
                  <span className={payment.days_until_due < 0 ? 'tone-text-danger' : ''}>{dueLabel(payment.days_until_due)}</span>
                </span>
              </Link>
              <button
                type="button"
                className="btn ghost"
                aria-label={`Mark ${payment.title} paid`}
                disabled={disabled || busy === payment.id}
                onClick={() =>
                  run(payment.id, () => workbookApi.setPaymentStatus(payment.id, 'Paid', payment.title), `${payment.title} marked paid`)
                }
              >
                Pay
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface ActionProps {
  busy: string | null
  disabled: boolean
  run: (key: string, action: () => Promise<unknown>, done: string) => void
}

function RemindersCard({ reminders, busy, disabled, run }: { reminders: TodayReminder[] } & ActionProps) {
  return (
    <section className="card today-card" aria-labelledby="today-reminders">
      <h2 id="today-reminders" className="section-title">
        Reminders
      </h2>
      {reminders.length === 0 ? (
        <p className="muted">No reminders for today.</p>
      ) : (
        <ul className="today-list">
          {reminders.map((reminder) => (
            <li key={reminder.id} className="today-row">
              <span className="today-main">
                <strong>{reminder.text}</strong>
                <span className={`small ${reminder.overdue ? 'tone-text-danger' : 'muted'}`}>
                  {reminder.ringing ? '🔔 ' : ''}
                  {friendlyTime(reminder.due_at)}
                </span>
              </span>
              <button
                type="button"
                className="btn ghost"
                disabled={disabled || busy === reminder.id}
                onClick={() => run(reminder.id, () => remindersApi.complete(reminder.id), 'Reminder done')}
              >
                Done
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/projects/reminders" className="btn link">
        All reminders →
      </Link>
    </section>
  )
}

function HabitsCard({ habits, date, busy, disabled, run }: { habits: TodayHabit[]; date: string } & ActionProps) {
  const done = habits.filter((habit) => habit.done_today).length
  return (
    <section className="card today-card" aria-labelledby="today-habits">
      <h2 id="today-habits" className="section-title">
        Habits · {done}/{habits.length}
      </h2>
      {habits.length === 0 ? (
        <p className="muted">No habits yet.</p>
      ) : (
        <ul className="today-list">
          {habits.map((habit) => (
            <li key={habit.id} className="today-row">
              <span className="today-main">
                <strong>
                  {habit.icon ? `${habit.icon} ` : ''}
                  {habit.name}
                </strong>
                {habit.kind === 'count' && (
                  <span className="muted small">
                    {habit.done}/{habit.target} {habit.unit}
                  </span>
                )}
              </span>
              {habit.kind === 'check' ? (
                <button
                  type="button"
                  className={`btn ${habit.done_today ? 'primary' : 'ghost'}`}
                  aria-pressed={habit.done_today}
                  aria-label={`${habit.name}: ${habit.done_today ? 'done' : 'not done'}`}
                  disabled={disabled || busy === habit.id}
                  onClick={() =>
                    run(habit.id, () => habitsApi.setDay(habit.id, date, habit.done_today ? 0 : 1), habit.done_today ? 'Unticked' : 'Nice - habit done')
                  }
                >
                  {habit.done_today ? '✓ Done' : 'Mark done'}
                </button>
              ) : (
                <span className={`badge ${habit.done_today ? 'badge-clear' : ''}`}>{habit.done_today ? 'Done' : 'Open'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link to="/projects/habits" className="btn link">
        All habits →
      </Link>
    </section>
  )
}

/** Today: what needs you now, gathered from every project in one request. */
export default function TodayPage() {
  const today = useAsync(() => todayApi.get(), [])
  const { reload } = today
  const notify = useToast()
  const offline = useOffline()
  const [busy, setBusy] = useState<string | null>(null)

  useAutoRefresh(reload)

  function run(key: string, action: () => Promise<unknown>, done: string) {
    setBusy(key)
    action()
      .then(() => {
        notify(done, 'success')
        reload()
      })
      .catch((error: unknown) => notify((error as Error).message, 'error'))
      .finally(() => setBusy(null))
  }

  if (!today.data) {
    if (today.error) return <ErrorState error={today.error} onRetry={reload} />
    return <LoadingState label="Gathering today…" />
  }

  const view = today.data
  const actions = { busy, disabled: offline, run }
  return (
    <div className="today">
      <header className="today-head">
        <p className="eyebrow">{longDate(view.date)}</p>
        <h1 className="display">Today</h1>
      </header>
      <div className="today-grid">
        <PaymentsCard payments={view.payments} {...actions} />
        <RemindersCard reminders={view.reminders} {...actions} />
        <HabitsCard habits={view.habits} date={view.date} {...actions} />
        <BudgetCard budget={view.budget} />
      </div>
    </div>
  )
}