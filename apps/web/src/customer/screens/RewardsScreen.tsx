import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useRewards, useMenu } from '@/hooks/useMenu'
import { useAuthStore } from '@/state/authStore'
import { useCartStore } from '@/state/cartStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { LoyaltyTicketCard } from '@/components/LoyaltyTicketCard'

export function RewardsScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const rewards = useRewards()
  const { items: menuItems } = useMenu()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)
  const addLine = useCartStore((s) => s.addLine)
  const showToast = useToastStore((s) => s.show)

  const points = account?.loyalty_points ?? 0

  const redeem = async (rewardId: string) => {
    const reward = rewards.find((r) => r.id === rewardId)
    const item = reward?.item_id ? menuItems.find((m) => m.id === reward.item_id) : null
    if (!reward || !item) {
      showToast(lang === 'fr' ? 'Article indisponible' : 'Item unavailable')
      return
    }

    const { data: redemption, error } = await supabase.rpc('redeem_reward', { p_reward_id: rewardId })
    if (error || !redemption) {
      showToast(t.notEnoughPoints)
      return
    }

    addLine({
      itemId: item.id,
      name: item.name,
      nameFr: item.name_fr,
      cat: item.cat,
      unitPrice: 0,
      qty: 1,
      addOns: [],
      redemptionId: redemption.id,
    })
    await refreshAccount()
    showToast(lang === 'fr' ? 'Récompense ajoutée, plus qu\'à commander !' : 'Reward added, ready to order!')
    // Straight to checkout, not just the cart -- the reward is already in
    // it, so there's nothing left to review before paying.
    navigate('/checkout')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-[var(--color-divider)] p-4 [font-family:var(--font-heading)] text-lg font-extrabold">
        {t.rewards}
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <LoyaltyTicketCard account={account} points={points} />
        <div className="mt-6">
          <div className="mb-3 [font-family:var(--font-heading)] text-xs font-bold uppercase tracking-wide">{t.redeem}</div>
          {rewards.map((r) => (
            <div key={r.id} className="mb-3 flex items-center justify-between rounded-2xl bg-[var(--color-card)] p-3.5 shadow-[0_2px_10px_rgba(26,21,18,0.06)]">
              <div>
                <div className="[font-family:var(--font-heading)] text-sm font-bold">{lang === 'fr' ? r.name_fr : r.name}</div>
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
