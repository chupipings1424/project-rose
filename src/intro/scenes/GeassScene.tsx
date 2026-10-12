import './geass.css'

const LENS = 'M-110 0 Q0 -66 110 0 Q0 66 -110 0Z'
/** The Geass sigil: a bird with spread wings (drawn in a 100 x 100 box). */
const GEASS_SIGIL = 'M50 30C44 38 30 36 12 26C24 40 36 46 44 50L50 74L56 50C64 46 76 40 88 26C70 36 56 38 50 30Z'

/** Code Geass: an eye opens, the Geass sigil ignites in it and flies out at you. */
export function GeassScene() {
  return (
    <div className="scene geass-scene" aria-hidden="true">
      <div className="geass-sky" />
      <div className="geass-floor">
        <div className="geass-board" />
      </div>
      <svg className="geass-eye" viewBox="-120 -70 240 140">
        <defs>
          <clipPath id="geass-lens">
            <path d={LENS} />
          </clipPath>
          <radialGradient id="geass-violet">
            <stop offset="0" stopColor="#c9a7ff" />
            <stop offset="0.7" stopColor="#6b3fb8" />
            <stop offset="1" stopColor="#24104a" />
          </radialGradient>
          <radialGradient id="geass-red">
            <stop offset="0" stopColor="#ff7a8c" />
            <stop offset="0.7" stopColor="#e8173a" />
            <stop offset="1" stopColor="#4a0010" />
          </radialGradient>
        </defs>
        <g clipPath="url(#geass-lens)">
          <rect x={-120} y={-70} width={240} height={140} fill="#f1ece4" />
          <circle r={38} fill="url(#geass-violet)" />
          <circle className="geass-iris-red" r={38} fill="url(#geass-red)" />
          <circle r={9} fill="#0a0006" />
          <path className="geass-sigil-in" d={GEASS_SIGIL} transform="translate(-30 -30) scale(0.6)" />
          <rect className="geass-lid geass-lid--top" x={-120} y={-70} width={240} height={70} />
          <rect className="geass-lid geass-lid--bottom" x={-120} y={0} width={240} height={70} />
        </g>
        <path d={LENS} fill="none" stroke="#000" strokeWidth={3} />
      </svg>
      <div className="geass-rings">
        <i />
        <i />
        <i />
      </div>
      <div className="geass-burst">
        {[0, 1, 2].map((i) => (
          <svg key={i} viewBox="0 0 100 100">
            <path d={GEASS_SIGIL} />
          </svg>
        ))}
      </div>
    </div>
  )
}