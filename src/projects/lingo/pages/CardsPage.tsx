import { useMemo, useState } from 'react'
import { ConfirmDialog } from '../../../components/ConfirmDialog'
import { Modal } from '../../../components/Modal'
import { EmptyState, ErrorState, LoadingState } from '../../../components/States'
import { useToast } from '../../../components/toast/useToast'
import { useAsync } from '../../../hooks/useAsync'
import { lingoApi } from '../api/client'
import { CardForm } from '../components/CardForm'
import { SpeakButton } from '../components/SpeakButton'
import { dueLabel } from '../lib/dates'
import type { Card, CardInput, Language } from '../model'

interface CardsPageProps {
  language: Language
}

export default function CardsPage({ language }: CardsPageProps) {
  const notify = useToast()
  const cards = useAsync(() => lingoApi.cards(language.code), [language.code])
  const { reload } = cards
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Card | null>(null)
  const [deleting, setDeleting] = useState<Card | null>(null)
  const [importing, setImporting] = useState(false)

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const list = cards.data ?? []
    if (!needle) return list
    return list.filter((c) => [c.term, c.reading, c.meaning, c.notes].some((field) => field.toLowerCase().includes(needle)))
  }, [cards.data, search])

  async function create(input: CardInput) {
    await lingoApi.createCard(language.code, input)
    notify('Card added', 'success')
    reload()
  }

  async function saveEdit(input: CardInput) {
    if (!editing) return
    await lingoApi.updateCard(editing.id, input)
    setEditing(null)
    notify('Card updated', 'success')
    reload()
  }

  async function confirmDelete() {
    if (!deleting) return
    const target = deleting
    setDeleting(null)
    try {
      await lingoApi.deleteCard(target.id)
      notify('Card deleted', 'success')
      reload()
    } catch (error) {
      notify((error as Error).message, 'error')
    }
  }

  async function importStarter() {
    setImporting(true)
    try {
      const { added, skipped } = await lingoApi.importStarter(language.code)
      notify(added > 0 ? `Added ${added} starter cards` : `You already have all ${skipped} starter cards`, 'success')
      reload()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="lingo-page">
      <section className="card">
        <h2 className="section-title">New {language.name} card</h2>
        <CardForm language={language} submitLabel="Add card" onSave={create} />
      </section>

      <section className="card">
        <div className="lingo-list-head">
          <h2 className="section-title">
            Deck <span className="muted small">({cards.data?.length ?? 0})</span>
          </h2>
          <input
            type="search"
            className="lingo-search"
            placeholder="Search cards…"
            aria-label="Search cards"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {language.hasStarter && (
            <button type="button" className="btn ghost" onClick={() => void importStarter()} disabled={importing}>
              {importing ? 'Adding…' : '✦ Add starter deck'}
            </button>
          )}
        </div>

        {cards.error && !cards.data && <ErrorState error={cards.error} onRetry={reload} />}
        {!cards.data && cards.loading && <LoadingState label="Loading cards…" />}
        {cards.data && cards.data.length === 0 && (
          <EmptyState title="No cards yet">
            Add a word above, save one from Translate{language.hasStarter ? ', or add the starter deck' : ''}.
          </EmptyState>
        )}
        {cards.data && cards.data.length > 0 && visible.length === 0 && <p className="muted">No card matches “{search}”.</p>}

        <ul className="lingo-cards">
          {visible.map((card) => (
            <li key={card.id} className="lingo-card-row">
              <div className="lingo-card-text">
                <span className="lingo-term" lang={language.code}>
                  {card.term}
                </span>
                {card.reading && <span className="lingo-reading">{card.reading}</span>}
                <span className="lingo-meaning">{card.meaning}</span>
                {card.notes && <span className="muted small">{card.notes}</span>}
              </div>
              <span className={`badge ${card.isDue ? 'badge-due' : 'badge-clear'}`}>{dueLabel(card.dueOn)}</span>
              <div className="lingo-row-actions">
                <SpeakButton text={card.term} lang={language.speech} />
                <button type="button" className="icon-btn" onClick={() => setEditing(card)} aria-label={`Edit ${card.term}`} title="Edit">
                  ✎
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setDeleting(card)}
                  aria-label={`Delete ${card.term}`}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={editing !== null} title="Edit card" onClose={() => setEditing(null)}>
        {editing && (
          <CardForm
            key={editing.id}
            language={language}
            initial={{ term: editing.term, reading: editing.reading, meaning: editing.meaning, notes: editing.notes }}
            submitLabel="Save changes"
            onSave={saveEdit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>

      <ConfirmDialog open={deleting !== null} onConfirm={() => void confirmDelete()} onCancel={() => setDeleting(null)}>
        Delete the card <strong>{deleting?.term}</strong>? Its review history goes with it.
      </ConfirmDialog>
    </div>
  )
}
