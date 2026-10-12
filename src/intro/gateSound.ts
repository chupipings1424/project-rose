// Every sound here is synthesised with the Web Audio API: no audio files, no copyright,
// and it is a good way to learn how audio graphs work (source -> filter -> gain -> speakers).

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

export function createGateSound(muted: boolean): GateSound | null {
  const Ctor = audioCtor()
  if (!Ctor) return null

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
  bedFilter.frequency.value = 80
  const bedGain = ctx.createGain()
  bedGain.gain.value = 0
  bed.connect(bedFilter).connect(bedGain).connect(master)

  // 2. A sub-bass hum you feel more than hear.
  const sub = ctx.createOscillator()
  sub.frequency.value = 34
  const subGain = ctx.createGain()
  subGain.gain.value = 0
  sub.connect(subGain).connect(master)

  // 3. Stone grinding: band-passed hiss, chopped by a fast LFO so it scrapes.
  const grind = ctx.createBufferSource()
  grind.buffer = white
  grind.loop = true
  const grindFilter = ctx.createBiquadFilter()
  grindFilter.type = 'bandpass'
  grindFilter.frequency.value = 520
  grindFilter.Q.value = 0.9
  const grindChop = ctx.createGain()
  grindChop.gain.value = 0.5
  const lfo = ctx.createOscillator()
  lfo.type = 'sawtooth'
  lfo.frequency.value = 11
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
    crunchFilter.frequency.value = 420
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
    sweep.frequency.setValueAtTime(180, t)
    sweep.frequency.exponentialRampToValueAtTime(3200, t + seconds * 0.8)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, t)
    gain.gain.linearRampToValueAtTime(0.32, t + seconds * 0.6)
    gain.gain.linearRampToValueAtTime(0, t + seconds)
    air.connect(sweep).connect(gain).connect(master)
    air.start(t)
    air.stop(t + seconds)
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
      glide(bedGain.gain, holding ? 0.18 + progress * 0.5 : 0, holding ? 0.1 : 0.3)
      glide(bedFilter.frequency, 70 + progress * 220)
      glide(subGain.gain, holding ? 0.08 + progress * 0.25 : 0, holding ? 0.1 : 0.3)
    },
    doorOpened(door) {
      impact(0.45 + door * 0.06, 62 - door * 3, 0.7 + door * 0.06)
      scrape(0.12 + door * 0.02, 0.55)
    },
    doorClosed() {
      impact(0.55, 50, 0.9)
    },
    gateOpened() {
      impact(1, 40, 2.6)
      scrape(0.35, 1.8)
      whoosh(2.1)
      glide(bedGain.gain, 0, 0.6)
      glide(subGain.gain, 0, 0.6)
    },
    quiet,
    setMuted(isMuted) {
      glide(master.gain, isMuted ? 0 : MASTER_VOLUME, 0.05)
    },
    dispose(afterMs = 2800) {
      if (disposed) return
      disposed = true
      // Let the last boom ring out before the audio context is closed.
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