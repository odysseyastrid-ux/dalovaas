let ctx: AudioContext | null = null

/** Two-tone alert beep for new orders / pending validations on the staff dashboard. No audio asset needed. */
export function playAlertBeep() {
  try {
    ctx ??= new AudioContext()
    const now = ctx.currentTime
    ;[880, 1160].forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.18)
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16)
      osc.connect(gain)
      gain.connect(ctx!.destination)
      osc.start(now + i * 0.18)
      osc.stop(now + i * 0.18 + 0.18)
    })
  } catch {
    // AudioContext unavailable (e.g. before any user interaction on some browsers) -- silently skip
  }
}
