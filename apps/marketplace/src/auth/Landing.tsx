import { Link } from 'react-router-dom'

const ROLES = [
  { to: '/auth/client', emoji: '🛵', title: 'Je commande', desc: 'Burgers, poutine, frites et plus — livrés chez vous.' },
  { to: '/auth/partenaire', emoji: '🍔', title: 'Je suis restaurant', desc: 'Vendez sur Dalovaas et touchez plus de clients.' },
  { to: '/auth/livreur', emoji: '🏍️', title: 'Je suis livreur', desc: 'Choisissez vos courses, livrez, encaissez.' },
]

export function Landing() {
  return (
    <div className="flex min-h-dvh flex-col bg-[image:var(--gradient-sunset)] px-6 py-10 text-white">
      <div className="mx-auto w-full max-w-md flex-1">
        <div className="mb-1 font-[var(--font-heading)] text-4xl font-extrabold tracking-tight">Dalovaas</div>
        <div className="mb-10 text-sm text-white/90">La marketplace de livraison du Cameroun.</div>

        <div className="flex flex-col gap-3">
          {ROLES.map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="flex items-center gap-4 rounded-2xl bg-white/95 p-4 text-[var(--color-ink)] shadow-lg transition active:scale-[0.98]"
            >
              <div className="text-3xl">{r.emoji}</div>
              <div className="flex-1">
                <div className="font-[var(--font-heading)] text-base font-bold">{r.title}</div>
                <div className="text-xs text-[var(--color-ink)]/60">{r.desc}</div>
              </div>
              <div className="text-[var(--color-ink)]/30">→</div>
            </Link>
          ))}
        </div>
      </div>

      <Link to="/auth/admin" className="mx-auto mt-8 text-center text-xs text-white/60 underline">
        Accès plateforme
      </Link>
    </div>
  )
}
