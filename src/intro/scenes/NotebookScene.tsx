import './notebook.css'

/** Death Note: the notebook opens, a pen writes ROSE, and the ink floods the screen. */
export function NotebookScene() {
  return (
    <div className="scene note-scene" aria-hidden="true">
      <div className="note-desk" />
      <div className="note-book">
        <div className="note-page">
          <div className="note-ink-word">
            <svg viewBox="0 0 300 100">
              <text x="150" y="70">
                ROSE
              </text>
            </svg>
          </div>
          <div className="note-pen" />
        </div>
        <div className="note-cover">
          <div className="note-cover__front">DEATH NOTE</div>
          {/* Like the real Death Note, the rules are written inside the cover. */}
          <div className="note-cover__back">
            <p>How to use it</p>
            <p>The human whose name is written in this note shall enter.</p>
          </div>
        </div>
      </div>
      <div className="note-blot" />
    </div>
  )
}