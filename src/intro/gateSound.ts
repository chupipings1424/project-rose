// Every sound here is synthesised with the Web Audio API: no audio files, no copyright,
// and it is a good way to learn how audio graphs work (source -> filter -> gain -> speakers).
//
// Every gate skin has a sound profile: the same building blocks (rumble, grind,
// impact, whoosh) tuned differently, plus a signature "accent" - a synth
// arpeggio for neon, an airlock hiss for space, a church bell for Death Note...
import type { SoundProfileId } from './gateSkins'

export interface GateSound {
  resume(): void
  setPush(progress: number, holding: boolean): void
  doorOpened(door: number): void
  doorClosed(): void
  gateOpened(): void
  quiet(): void
  setMuted(muted: boolean): void
  dispose(afterMs?: number): void
}

type AudioCtor = typeof AudioContext

function audioCtor(): AudioCtor | undefined {
  return window.AudioContext ?? (window as Window & { webkitAudioContext?: AudioCtor }).webkitAudioContext
}

const MASTER_VOLUME = 0.85

function noiseBuffer(ctx: AudioContext, kind: 'white' | 'brown'): AudioBuffer {
  const length = ctx.sampleRate * 3
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1
    if (kind === 'white') {
      data[i] = white
    } else {
      // Brown noise = integrated white noise: deep and rumbly, like moving stone.
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
  }
  return buffer
}

/** The small instruments an accent can play. */
interface Kit {
  /** One note: an oscillator with an attack/decay envelope, optionally detuned and filtered. */
  tone(freq: number, options?: ToneOptions): void
  /** A burst of filtered noise (hiss, wind, steam). */
  noise(options: NoiseOptions): void
}

interface ToneOptions {
  type?: OscillatorType
  at?: number
  attack?: number
  length?: number
  peak?: number
  detune?: number
  glideTo?: number
  lowpass?: number
}

interface NoiseOptions {
  at?: number
  length: number
  peak: number
  filter: BiquadFilterType
  from: number
  to?: number
  q?: number
}

interface SoundProfile {
  rumbleHz: number
  subHz: number
  grindHz: number
  grindQ: number
  chopHz: number
  chopWave: OscillatorType
  /** Base pitch of the landing / opening boom. */
  impactPitch: number
  /** How bright the crunch under the boom is (lowpass Hz). */
  crunchHz: number
  /** How loud the stone-like parts are (0 = pure accent). */
  weight: number
  sweep: readonly [number, number]
  arrive?: (kit: Kit) => void
  open?: (kit: Kit) => void
}

const notes = (kit: Kit, freqs: readonly number[], gap: number, options: ToneOptions) =>
  freqs.forEach((freq, i) => kit.tone(freq, { ...options, at: (options.at ?? 0) + i * gap }))

/** Bell partials are not whole multiples of the base pitch: that's what makes them sound like metal. */
const bell = (kit: Kit, base: number, at: number, peak: number) =>
  [0.5, 1, 1.19, 1.56, 2, 2.66, 3.01].forEach((ratio, i) =>
    kit.tone(base * ratio, { at, attack: 0.004, length: 3.2 - i * 0.3, peak: peak / (i + 1) }),
  )

export const SOUND_PROFILES: Readonly<Record<SoundProfileId, SoundProfile>> = {
  stone: { rumbleHz: 80, subHz: 34, grindHz: 520, grindQ: 0.9, chopHz: 11, chopWave: 'sawtooth', impactPitch: 50, crunchHz: 420, weight: 1, sweep: [180, 3200] },
  synth: {
    rumbleHz: 120, subHz: 41, grindHz: 900, grindQ: 6, chopHz: 16, chopWave: 'square', impactPitch: 62, crunchHz: 260, weight: 0.45, sweep: [300, 5200],
    arrive: (kit) => notes(kit, [440, 660], 0.09, { type: 'square', length: 0.12, peak: 0.08, lowpass: 2400 }),
    open: (kit) => {
      notes(kit, [220, 277.2, 329.6, 440, 554.4, 659.3, 880], 0.085, { type: 'sawtooth', length: 0.28, peak: 0.12, lowpass: 3200 })
      ;[110, 164.8, 220].forEach((f) => kit.tone(f, { type: 'sawtooth', attack: 0.5, length: 2.4, peak: 0.07, detune: 9, lowpass: 1400 }))
    },
  },
  airlock: {
    rumbleHz: 70, subHz: 30, grindHz: 260, grindQ: 2, chopHz: 24, chopWave: 'square', impactPitch: 44, crunchHz: 300, weight: 0.8, sweep: [120, 2400],
    arrive: (kit) => kit.noise({ length: 0.5, peak: 0.25, filter: 'highpass', from: 3000 }),
    open: (kit) => {
      kit.noise({ length: 1.4, peak: 0.35, filter: 'highpass', from: 1800, to: 6000 })
      kit.tone(110, { type: 'sawtooth', attack: 0.2, length: 1.8, peak: 0.1, glideTo: 520, lowpass: 900 })
      notes(kit, [880, 880], 0.18, { type: 'sine', at: 1.6, length: 0.12, peak: 0.08 })
    },
  },
  digital: {
    rumbleHz: 90, subHz: 45, grindHz: 1400, grindQ: 8, chopHz: 32, chopWave: 'square', impactPitch: 70, crunchHz: 200, weight: 0.35, sweep: [400, 6000],
    arrive: (kit) => notes(kit, [1200, 1800, 900], 0.05, { type: 'square', length: 0.05, peak: 0.06 }),
    open: (kit) => {
      // A glitchy burst of data blips (fixed pattern, so it sounds the same every time).
      const blips = [880, 1760, 1320, 2640, 990, 1980, 660, 2200, 1480, 740, 2960, 1100, 1650, 2470, 830, 1240]
      notes(kit, blips, 0.07, { type: 'square', length: 0.05, peak: 0.07, lowpass: 5000 })
      kit.tone(1600, { type: 'sine', at: 0.3, attack: 0.05, length: 1.6, peak: 0.1, glideTo: 60 })
    },
  },
  desert: {
    rumbleHz: 75, subHz: 32, grindHz: 380, grindQ: 0.6, chopHz: 7, chopWave: 'triangle', impactPitch: 46, crunchHz: 520, weight: 0.9, sweep: [140, 2200],
    open: (kit) => {
      // A gong: low partials that ring for a long time.
      ;[1, 1.48, 2.1, 2.9, 3.6].forEach((ratio, i) =>
        kit.tone(98 * ratio, { attack: 0.01, length: 4 - i * 0.5, peak: 0.22 / (i + 1) }),
      )
      kit.noise({ length: 2.6, peak: 0.16, filter: 'bandpass', from: 400, to: 900, q: 0.5 })
    },
  },
  crystal: {
    rumbleHz: 100, subHz: 52, grindHz: 2400, grindQ: 10, chopHz: 20, chopWave: 'sine', impactPitch: 80, crunchHz: 180, weight: 0.25, sweep: [600, 8000],
    arrive: (kit) => kit.tone(1568, { length: 0.6, peak: 0.07, detune: 6 }),
    open: (kit) => notes(kit, [1046.5, 1318.5, 1568, 2093, 2637, 3136], 0.11, { length: 1.4, peak: 0.07, detune: 7 }),
  },
  truth: {
    rumbleHz: 60, subHz: 28, grindHz: 300, grindQ: 1.4, chopHz: 5, chopWave: 'sine', impactPitch: 38, crunchHz: 360, weight: 0.9, sweep: [90, 1600],
    // Two heartbeats as the gate lands...
    arrive: (kit) => notes(kit, [55, 50], 0.22, { length: 0.25, peak: 0.5, attack: 0.01 }),
    // ...then a low, uneasy choir while the eye opens.
    open: (kit) =>
      [130.8, 155.6, 196, 233.1].forEach((f, i) =>
        kit.tone(f, { type: 'triangle', at: i * 0.12, attack: 0.7, length: 2.6, peak: 0.08, detune: 12, lowpass: 1200 }),
      ),
  },
  gothic: {
    rumbleHz: 70, subHz: 31, grindHz: 1100, grindQ: 4, chopHz: 9, chopWave: 'sawtooth', impactPitch: 52, crunchHz: 600, weight: 0.75, sweep: [150, 2600],
    arrive: (kit) => kit.noise({ length: 0.25, peak: 0.3, filter: 'bandpass', from: 2400, q: 8 }),
    open: (kit) => {
      bell(kit, 98, 0, 0.3)
      bell(kit, 98, 1.1, 0.2)
    },
  },
}

export function createGateSound(muted: boolean, profileId: SoundProfileId = 'stone'): GateSound | null {
  const Ctor = audioCtor()
  if (!Ctor) return null
  const profile = SOUND_PROFILES[profileId]

  const ctx = new Ctor()
  const limiter = ctx.createDynamicsCompressor()
  limiter.connect(ctx.destination)
  const master = ctx.createGain()
  master.gain.value = muted ? 0 : MASTER_VOLUME
  master.connect(limiter)

  const brown = noiseBuffer(ctx, 'brown')
  const white = noiseBuffer(ctx, 'white')

  // 1. A low rumble bed that grows while you push.
  const bed = ctx.createBufferSource()
  bed.buffer = brown
  bed.loop = true
  const bedFilter = ctx.createBiquadFilter()
  bedFilter.type = 'lowpass'
  bedFilter.frequency.value = profile.rumbleHz
  const bedGain = ctx.createGain()
  bedGain.gain.value = 0
  bed.connect(bedFilter).connect(bedGain).connect(master)

  // 2. A sub-bass hum you feel more than hear.
  const sub = ctx.createOscillator()
  sub.frequency.value = profile.subHz
  const subGain = ctx.createGain()
  subGain.gain.value = 0
  sub.connect(subGain).connect(master)

  // 3. Stone grinding: band-passed hiss, chopped by a fast LFO so it scrapes.
  const grind = ctx.createBufferSource()
  grind.buffer = white
  grind.loop = true
  const grindFilter = ctx.createBiquadFilter()
  grindFilter.type = 'bandpass'
  grindFilter.frequency.value = profile.grindHz
  grindFilter.Q.value = profile.grindQ
  const grindChop = ctx.createGain()
  grindChop.gain.value = 0.5
  const lfo = ctx.createOscillator()
  lfo.type = profile.chopWave
  lfo.frequency.value = profile.chopHz
  const lfoDepth = ctx.createGain()
  lfoDepth.gain.value = 0.5
  lfo.connect(lfoDepth).connect(grindChop.gain)
  const grindGain = ctx.createGain()
  grindGain.gain.value = 0
  grind.connect(grindFilter).connect(grindChop).connect(grindGain).connect(master)

  bed.start()
  sub.start()
  grind.start()
  lfo.start()

  let disposed = false
  const glide = (param: AudioParam, value: number, seconds = 0.08) =>
    param.setTargetAtTime(value, ctx.currentTime, seconds)

  function envelope(peak: number, attack: number, seconds: number): GainNode {
    const t = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + seconds)
    return gain
  }

  /** A heavy thud: a falling sine "boom" plus a short crunch of low noise. */
  function impact(strength: number, pitch: number, seconds: number) {
    const t = ctx.currentTime
    const boom = ctx.createOscillator()
    boom.frequency.setValueAtTime(pitch * 1.8, t)
    boom.frequency.exponentialRampToValueAtTime(pitch * 0.55, t + seconds)
    boom.connect(envelope(strength, 0.015, seconds)).connect(master)
    boom.start(t)
    boom.stop(t + seconds + 0.05)

    const crunch = ctx.createBufferSource()
    crunch.buffer = brown
    const crunchFilter = ctx.createBiquadFilter()
    crunchFilter.type = 'lowpass'
    crunchFilter.frequency.value = profile.crunchHz
    crunch.connect(crunchFilter).connect(envelope(strength * 0.9, 0.005, seconds * 0.5)).connect(master)
    crunch.start(t, Math.random() * 2)
    crunch.stop(t + seconds)
  }

  function scrape(peak: number, seconds: number) {
    const t = ctx.currentTime
    grindGain.gain.cancelScheduledValues(t)
    grindGain.gain.setValueAtTime(grindGain.gain.value, t)
    grindGain.gain.linearRampToValueAtTime(peak, t + 0.08)
    grindGain.gain.linearRampToValueAtTime(0, t + seconds)
  }

  function whoosh(seconds: number) {
    const t = ctx.currentTime
    const air = ctx.createBufferSource()
    air.buffer = white
    const sweep = ctx.createBiquadFilter()
    sweep.type = 'bandpass'
    sweep.Q.value = 0.7
    sweep.frequency.setValueAtTime(profile.sweep[0], t)
    sweep.frequency.exponentialRampToValueAtTime(profile.sweep[1], t + seconds * 0.8)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.32, t + seconds * 0.6)
    gain.gain.linearRampToValueAtTime(0, t + seconds)
    air.connect(sweep).connect(gain).connect(master)
    air.start(t)
    air.stop(t + seconds)
  }

  const kit: Kit = {
    tone(freq, { type = 'sine', at = 0, attack = 0.02, length = 0.4, peak = 0.1, detune = 0, glideTo, lowpass } = {}) {
      const t = ctx.currentTime + at
      // Two slightly detuned voices make a note sound wide and alive (a "chorus").
      const voices = detune ? [-detune, detune] : [0]
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak / voices.length, t + attack)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + length)
      let out: AudioNode = gain
      if (lowpass) {
        const filter = ctx.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = lowpass
        gain.connect(filter)
        out = filter
      }
      out.connect(master)
      for (const cents of voices) {
        const osc = ctx.createOscillator()
        osc.type = type
        osc.detune.value = cents
        osc.frequency.setValueAtTime(freq, t)
        if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + attack + length)
        osc.connect(gain)
        osc.start(t)
        osc.stop(t + attack + length + 0.05)
      }
    },
    noise({ at = 0, length, peak, filter, from, to, q = 1 }) {
      const t = ctx.currentTime + at
      const source = ctx.createBufferSource()
      source.buffer = white
      const shape = ctx.createBiquadFilter()
      shape.type = filter
      shape.Q.value = q
      shape.frequency.setValueAtTime(from, t)
      if (to) shape.frequency.exponentialRampToValueAtTime(to, t + length)
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(peak, t + Math.min(0.05, length / 4))
      gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
      source.connect(shape).connect(gain).connect(master)
      source.start(t, Math.random() * 1.5)
      source.stop(t + length + 0.05)
    },
  }

  function quiet() {
    glide(bedGain.gain, 0, 0.15)
    glide(subGain.gain, 0, 0.15)
    glide(grindGain.gain, 0, 0.15)
  }

  return {
    resume() {
      if (ctx.state === 'suspended') void ctx.resume()
    },
    setPush(progress, holding) {
      const w = profile.weight
      glide(bedGain.gain, holding ? (0.18 + progress * 0.5) * w : 0, holding ? 0.1 : 0.3)
      glide(bedFilter.frequency, profile.rumbleHz - 10 + progress * 220)
      glide(subGain.gain, holding ? (0.08 + progress * 0.25) * w : 0, holding ? 0.1 : 0.3)
    },
    doorOpened(door) {
      impact((0.45 + door * 0.06) * profile.weight, profile.impactPitch + 12 - door * 3, 0.7 + door * 0.06)
      scrape((0.12 + door * 0.02) * profile.weight, 0.55)
    },
    doorClosed() {
      impact(0.55 * Math.max(profile.weight, 0.5), profile.impactPitch, 0.9)
      profile.arrive?.(kit)
    },
    gateOpened() {
      impact(Math.max(profile.weight, 0.4), profile.impactPitch * 0.8, 2.6)
      scrape(0.35 * profile.weight, 1.8)
      whoosh(2.1)
      profile.open?.(kit)
      glide(bedGain.gain, 0, 0.6)
      glide(subGain.gain, 0, 0.6)
    },
    quiet,
    setMuted(isMuted) {
      glide(master.gain, isMuted ? 0 : MASTER_VOLUME, 0.05)
    },
    dispose(afterMs = 4500) {
      if (disposed) return
      disposed = true
      // Let the last boom (or bell) ring out before the audio context is closed.
      window.setTimeout(() => {
        quiet()
        void ctx.close()
      }, afterMs)
    },
  }
}
/** One heavy stone thud, used when the gate refuses a wrong token. */
export function playThud(): void {
  const Ctor = audioCtor()
  if (!Ctor) return
  const ctx = new Ctor()
  const t = ctx.currentTime
  const out = ctx.createGain()
  out.gain.value = 0.9
  out.connect(ctx.destination)

  const boom = ctx.createOscillator()
  boom.frequency.setValueAtTime(95, t)
  boom.frequency.exponentialRampToValueAtTime(32, t + 0.6)
  const boomGain = ctx.createGain()
  boomGain.gain.setValueAtTime(0.0001, t)
  boomGain.gain.exponentialRampToValueAtTime(0.8, t + 0.012)
  boomGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7)
  boom.connect(boomGain).connect(out)
  boom.start(t)
  boom.stop(t + 0.75)

  const crunch = ctx.createBufferSource()
  crunch.buffer = noiseBuffer(ctx, 'brown')
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = 'lowpass'
  lowpass.frequency.value = 380
  const crunchGain = ctx.createGain()
  crunchGain.gain.setValueAtTime(0.0001, t)
  crunchGain.gain.exponentialRampToValueAtTime(0.7, t + 0.005)
  crunchGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
  crunch.connect(lowpass).connect(crunchGain).connect(out)
  crunch.start(t)
  crunch.stop(t + 0.4)

  window.setTimeout(() => void ctx.close(), 1200)
}