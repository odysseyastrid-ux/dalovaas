let ctx: AudioContext | null = null

/**
 * Attention-grabbing alert for the staff dashboard -- new orders, pending
 * validations, new OTP codes. A busy fair booth is loud, so this needs to
 * cut through: three sharp tones, louder than a typical UI chime.
 */
export function playAlertBeep() {
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    ;[880, 1320, 880].forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'square'
      osc.frequency.value = freq
      const t = now + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.45, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14)
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.start(t)
      osc.stop(t + 0.15)
    })
  } catch {
    // AudioContext unavailable (e.g. before any user interaction on some browsers) -- silently skip
  }
}
