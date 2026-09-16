import { useI18n } from '@/i18n/I18nContext'
import type { Account } from '@/types/domain'

const NEXT_TIER_THRESHOLD = 500

export function LoyaltyTicketCard({ account, points }: { account: Account | null; points: number }) {
  const { lang } = useI18n()
  const toNextTier = Math.max(0, NEXT_TIER_THRESHOLD - points)
  const memberSince = account?.created_at ? new Date(account.created_at).getFullYear() : null
  const memberNumber = account?.id ? account.id.replace(/-/g, '').slice(0, 10).toUpperCase() : '—'

  return (
    <div className="ticket-canvas">
      <div className="ticket-wrapper">
        <div className="ticket">
          <div className="t-main">
            <div className="t-content">
              <div className="t-header">
                <div className="t-logo">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c1.4 2.6-1.6 4-1.6 7.2a3.6 3.6 0 0 0 7.2 0c0-1-.8-1.8-.8-1.8.9 2.6-.9 3.6-1.8 3.6a1.8 1.8 0 0 1-1.8-1.8c0-1.8 1.8-2.7 1.8-4.5 0-1.8-.9-2.7-3-2.7z" />
                  </svg>
                  MARLYSE
                </div>
                <div className="t-type">{lang === 'fr' ? 'Fidélité' : 'Loyalty'}</div>
              </div>
              <div className="t-title">{lang === 'fr' ? 'Vos points' : 'Your points'}</div>
              <div className="t-subtitle">
                {account?.profile_name || (lang === 'fr' ? 'Programme de fidélité Marlyse' : 'Marlyse loyalty program')}
              </div>
              <div className="t-details">
                <div className="t-detail-item">
                  <div className="t-label">{lang === 'fr' ? 'Membre depuis' : 'Member since'}</div>
                  <div className="t-value">{memberSince ?? '—'}</div>
                </div>
                <div className="t-detail-item">
                  <div className="t-label">{lang === 'fr' ? 'Prochain palier' : 'Next tier'}</div>
                  <div className="t-value">
                    {toNextTier === 0 ? (lang === 'fr' ? 'Atteint' : 'Reached') : `${toNextTier} pts`}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="t-perforation">
            <div className="t-perf-line" />
          </div>
          <div className="t-stub">
            <div className="t-barcode-container">
              <div className="t-barcode" />
              <div className="t-barcode-id">{memberNumber}</div>
            </div>
            <div className="t-admit">
              <div className="t-admit-text">{lang === 'fr' ? 'Points' : 'Points'}</div>
              <div className="t-admit-num">{points}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
