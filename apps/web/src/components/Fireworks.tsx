import { useEffect, useState } from 'react'

interface Particle {
  id: string
  x: number
  y: number
  tx: number
  ty: number
  color: string
}

export function Fireworks({ show }: { show: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    if (!show) return

    const colors = ['#f5a623', '#c9341f', '#e5342a', '#ffd666', '#e5772b']
    const newParticles: Particle[] = []

    // Create multiple bursts from center
    for (let burst = 0; burst < 3; burst++) {
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30 + (burst * 0.3)
        const velocity = 4 + Math.random() * 4
        const tx = Math.cos(angle) * velocity * 60
        const ty = Math.sin(angle) * velocity * 60
        const color = colors[Math.floor(Math.random() * colors.length)]

        newParticles.push({
          id: `${burst}-${i}`,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          tx,
          ty,
          color,
        })
      }
    }

    setParticles(newParticles)

    // Clear particles after animation completes
    const timer = setTimeout(() => setParticles([]), 1200)
    return () => clearTimeout(timer)
  }, [show])

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          className="firework-particle"
          style={
            {
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              left: p.x,
              top: p.y,
              width: '8px',
              height: '8px',
              backgroundColor: p.color,
              borderRadius: '50%',
              boxShadow: `0 0 8px ${p.color}`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  )
}
