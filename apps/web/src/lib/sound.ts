let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    return ctx
  } catch {
    // AudioContext unavailable (e.g. before any user interaction on some browsers)
    return null
  }
}

function tone(c: AudioContext, freq: number, startAt: number, duration: number, peak: number, type: OscillatorType) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, startAt)
  gain.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(0.02, duration / 3))
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(startAt)
  osc.stop(startAt + duration + 0.02)
}

/**
 * Alert for new OTP codes waiting to be relayed -- sharp square-wave triad,
 * deliberately harsher than the order chime so staff can tell the two
 * apart by ear without looking at the screen.
 */
export function playOtpAlert() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  ;[880, 1320, 880].forEach((freq, i) => tone(c, freq, now + i * 0.16, 0.15, 0.45, 'square'))
}

/**
 * Alert for new orders and status changes -- a warmer two-note "ding-dong"
 * chime (sine waves), distinct in timbre and rhythm from the OTP alert.
 */
export function playOrderAlert() {
  const c = getCtx()
  if (!c) return
  const now = c.currentTime
  tone(c, 740, now, 0.22, 0.4, 'sine')
  tone(c, 988, now + 0.2, 0.34, 0.4, 'sine')
}
