import './senkaimon.css'

const BUTTERFLY = 'M0 0 C-6 -14 -24 -18 -26 -6 C-27 2 -14 4 0 0 C-12 4 -20 14 -12 18 C-6 20 -2 10 0 0Z'

/**
 * Bleach: the Senkaimon's shoji doors slide open, a black Getsuga Tenshō
 * cuts through the blood chains, and the cut tears the screen open.
 */
export function SenkaimonScene() {
  return (
    <div className="scene senkai-scene" aria-hidden="true">
      <div className="senkai-sky" />
      <div className="senkai-gate">
        <div className="senkai-opening">
          <div className="senkai-light" />
          <div className="senkai-door senkai-door--left" />
          <div className="senkai-door senkai-door--right" />
        </div>
        <div className="senkai-post senkai-post--left" />
        <div className="senkai-post senkai-post--right" />
        <div className="senkai-beam" />
        <div className="senkai-roof" />
      </div>
      <div className="senkai-reiatsu" />
      <div className="senkai-chain senkai-chain--a" />
      <div className="senkai-chain senkai-chain--b" />
      <div className="senkai-butterflies">
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="-30 -22 60 44">
            <g className="senkai-wing">
              <path d={BUTTERFLY} />
            </g>
            <g className="senkai-wing senkai-wing--right">
              <path d={BUTTERFLY} />
            </g>
          </svg>
        ))}
      </div>
      <svg className="senkai-getsuga" viewBox="0 0 400 200">
        <path d="M20 180 Q200 -60 380 20 Q210 30 20 180Z" />
      </svg>
      <div className="senkai-cut" />
    </div>
  )
}