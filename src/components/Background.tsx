/** The animated sci-fi scene behind every page. Pure CSS - see .bg-* in global.css. */
export function Background() {
  return (
    <div className="bg-scene" aria-hidden="true">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-grid" />
      {/* Theme-specific art: lightning, transmutation circle, a Dragon Ball, seals, chains, an eye... */}
      <div className="bg-motif" />
      {/* A second themed layer along the bottom (Bleach: black reiatsu flames). */}
      <div className="bg-floor" />
      <div className="bg-scanlines" />
    </div>
  )
}