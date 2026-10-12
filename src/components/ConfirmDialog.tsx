import type { ReactNode } from 'react'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  title?: string
  children: ReactNode
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** "Are you sure?" popup. Cancel is focused first so a stray Enter never deletes anything. */
export function ConfirmDialog({
  open,
  title = 'Confirm delete',
  children,
  confirmLabel = 'Yes, delete it',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="confirm-text">{children}</div>
      <div className="form-actions">
        <button type="button" className="btn danger" onClick={onConfirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel} autoFocus>
          Cancel
        </button>
      </div>
    </Modal>
  )
}