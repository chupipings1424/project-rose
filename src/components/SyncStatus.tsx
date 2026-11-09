import { useEffect, useState } from 'react'
import { useOffline } from '../lib/offline'
import { flushOutbox, OUTBOX_SYNCED_EVENT, removeEntry, retryEntry, useOutbox, type OutboxEntry } from '../lib/outbox'
import { ConfirmDialog } from './ConfirmDialog'
import { Modal } from './Modal'
import { useToast } from './toast/useToast'

const savedAt = (entry: OutboxEntry) =>
  new Date(entry.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/**
 * A strip under the top bar while saves are waiting in the outbox (lib/outbox.ts).
 * Tap it to see them, send them now, or delete one - always after an "are you sure?".
 */
export function SyncStatus() {
  const entries = useOutbox()
  const offline = useOffline()
  const notify = useToast()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<OutboxEntry | null>(null)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const onSynced = (event: Event) => {
      const count = (event as CustomEvent<number>).detail
      notify(`Synced ${count} saved ${count === 1 ? 'entry' : 'entries'}`, 'success')
    }
    window.addEventListener(OUTBOX_SYNCED_EVENT, onSynced)
    return () => window.removeEventListener(OUTBOX_SYNCED_EVENT, onSynced)
  }, [notify])

  if (entries.length === 0 && !open) return null
  const refused = entries.filter((entry) => entry.error).length

  async function syncNow() {
    setSyncing(true)
    await flushOutbox()
    setSyncing(false)
  }

  async function confirmDelete() {
    if (!deleting) return
    await removeEntry(deleting.id)
    notify('Deleted - it will not be sent', 'info')
    setDeleting(null)
  }

  return (
    <>
      {entries.length > 0 && (
        <button type="button" className="sync-banner" onClick={() => setOpen(true)}>
          <span aria-hidden="true">{'\u21bb'}</span> {entries.length} waiting to sync
          {refused > 0 && ` \u00b7 ${refused} need${refused === 1 ? 's' : ''} a look`} {'\u00b7'} View
        </button>
      )}
      <Modal open={open} title="Waiting to sync" onClose={() => setOpen(false)}>
        {entries.length === 0 ? (
          <p className="muted">All synced.</p>
        ) : (
          <>
            <p className="muted small">
              Saved on this phone. They are sent when ROSE is open and online - each one only once.
            </p>
            <ul className="sync-list">
              {entries.map((entry) => (
                <li key={entry.id} className="sync-row">
                  <div className="sync-main">
                    <strong>{entry.label}</strong>
                    <span className="muted small">Saved {savedAt(entry)}</span>
                    {entry.error && <span className="form-error small">Not saved: {entry.error}</span>}
                  </div>
                  <div className="sync-actions">
                    {entry.error && (
                      <button type="button" className="btn ghost" disabled={offline} onClick={() => void retryEntry(entry.id)}>
                        Retry
                      </button>
                    )}
                    <button type="button" className="btn ghost" aria-label={`Delete ${entry.label}`} onClick={() => setDeleting(entry)}>
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="form-actions">
              <button type="button" className="btn primary" disabled={offline || syncing} onClick={() => void syncNow()}>
                {syncing ? 'Syncing...' : offline ? 'Offline - will sync later' : 'Sync now'}
              </button>
            </div>
          </>
        )}
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title="Delete this entry?"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      >
        <p>
          <strong>{deleting?.label}</strong> hasn&apos;t reached the server yet. Deleting it means it is never saved.
        </p>
      </ConfirmDialog>
    </>
  )
}