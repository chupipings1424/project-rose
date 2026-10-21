import { useState, type ChangeEvent, type FormEvent } from 'react'
import type { CardInput, Language } from '../model'

interface CardFormProps {
  language: Language
  initial?: CardInput
  submitLabel: string
  onSave: (input: CardInput) => Promise<void>
  onCancel?: () => void
}

const EMPTY: CardInput = { term: '', reading: '', meaning: '', notes: '' }

/** Add or edit a flashcard. Controlled inputs: React state is the single source of truth. */
export function CardForm({ language, initial = EMPTY, submitLabel, onSave, onCancel }: CardFormProps) {
  const [input, setInput] = useState<CardInput>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof CardInput) => (event: ChangeEvent<HTMLInputElement>) =>
    setInput((previous) => ({ ...previous, [field]: event.target.value }))

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave(input)
      if (!onCancel) setInput(EMPTY) // the "add" form clears itself for the next word
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the card.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="grid-form" onSubmit={handleSubmit}>
      <label>
        {language.name} word or phrase
        <input lang={language.code} value={input.term} onChange={set('term')} maxLength={200} required />
      </label>
      {language.hasReading && (
        <label>
          Reading (optional)
          <input value={input.reading} onChange={set('reading')} maxLength={200} placeholder="filled in for kana / hangul" />
        </label>
      )}
      <label>
        Meaning (English)
        <input value={input.meaning} onChange={set('meaning')} maxLength={200} required />
      </label>
      <label className="span-all">
        Notes (optional)
        <input value={input.notes} onChange={set('notes')} maxLength={500} />
      </label>
      {error && (
        <p className="form-error span-all" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions span-all">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
