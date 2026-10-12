import './sharingan.css'

const LENS = 'M-110 0 Q0 -70 110 0 Q0 70 -110 0Z'
const TOMOE_TAIL = 'M-1 -5.4 C-7 -6.4 -11.5 -2.5 -13 3.5 C-9.5 0.5 -6.5 0.8 -4.2 3.3Z'
const BLADE = 'M0 -6 C10 -17 26 -22 38 -13 C27 -14 16 -8 8 4Z'

/** Naruto: an eye opens, the Sharingan spins up into the Mangekyō, and its genjutsu takes you in. */
export function SharinganScene() {
  return (
    <div className="scene sharingan-scene" aria-hidden="true">
      <div className="sharingan-night" />
      <div className="sharingan-genjutsu">
        <div className="sharingan-moon" />
        <div className="sharingan-clouds" />
      </div>
      <div className="sharingan-pulse" />
      <svg className="sharingan-eye" viewBox="-120 -80 240 160">
        <defs>
          <clipPath id="sharingan-lens">
            <path d={LENS} />
          </clipPath>
          <radialGradient id="sharingan-red">
            <stop offset="0" stopColor="#ff3b2f" />
            <stop offset="0.75" stopColor="#c8101c" />
            <stop offset="1" stopColor="#5a0008" />
          </radialGradient>
        </defs>
        <g clipPath="url(#sharingan-lens)">
          <rect x={-120} y={-80} width={240} height={160} fill="#efe3d3" />
          <circle r={41} fill="url(#sharingan-red)" stroke="#1a0000" strokeWidth={2} />
          <g className="sharingan-tomoe">
            <circle r={27} fill="none" stroke="#3a0006" strokeWidth={1.4} />
            {[0, 120, 240].map((deg) => (
              <g key={deg} transform={`rotate(${deg}) translate(0 -27)`}>
                <circle r={5.6} />
                <path d={TOMOE_TAIL} />
              </g>
            ))}
          </g>
          <g className="sharingan-mangekyo">
            {[0, 120, 240].map((deg) => (
              <path key={deg} d={BLADE} transform={`rotate(${deg})`} />
            ))}
            <circle r={10} />
          </g>
          <circle className="sharingan-pupil" r={8} />
          <rect className="sharingan-lid sharingan-lid--top" x={-120} y={-80} width={240} height={80} />
          <rect className="sharingan-lid sharingan-lid--bottom" x={-120} y={0} width={240} height={80} />
        </g>
        <path d={LENS} fill="none" stroke="#000" strokeWidth={3} />
      </svg>
    </div>
  )
}