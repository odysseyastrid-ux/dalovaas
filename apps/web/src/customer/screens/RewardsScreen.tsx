import { useI18n } from '@/i18n/I18nContext'
import { useRewards } from '@/hooks/useMenu'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

export function RewardsScreen() {
  const { t, lang } = useI18n()
  const rewards = useRewards()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)
  const showToast = useToastStore((s) => s.show)

  const points = account?.loyalty_points ?? 0
  const tierProgress = Math.min(100, (points / 500) * 100)

  const redeem = async (rewardId: string) => {
    const { error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
    if (error) {
      showToast(t.notEnoughPoints)
      return
    }
    await refreshAccount()
    showToast(lang === 'fr' ? 'Récompense échangée !' : 'Reward redeemed!')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-divider)] p-4 font-[var(--font-heading)] text-lg font-extrabold">
        {t.rewards}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-xl bg-[var(--color-accent)] p-6">
          <div className="text-xs uppercase tracking-wide opacity-80">{t.yourPoints}</div>
          <div className="mt-1 font-[var(--font-heading)] text-4xl font-extrabold">{points}</div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-white/30">
            <div className="h-full rounded-full bg-white" style={{ width: `${tierProgress}%` }} />
          </div>
        </div>
        <div className="mt-6">
          <div className="mb-3 font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide">{t.redeem}</div>
          {rewards.map((r) => (
            <div key={r.id} className="mb-3 flex items-center justify-between rounded-xl border border-[var(--color-divider)] p-3.5">
              <div>
                <div className="font-[var(--font-heading)] text-sm font-bold">{lang === 'fr' ? r.name_fr : r.name}</div>
                <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">{r.cost} pts</div>
              </div>
              <button
                disabled={points < r.cost}
                onClick={() => redeem(r.id)}
                className="rounded-lg border border-[var(--color-divider)] px-3.5 py-2 text-xs font-bold disabled:opacity-40"
              >
                {t.redeemBtn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
