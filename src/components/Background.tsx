/** The static sci-fi backdrop behind every page. Pure CSS, no animation - see .bg-* in global.css. */
export function Background() {
  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />
      <div className="bg-scanlines" />
    </div>
  )
}