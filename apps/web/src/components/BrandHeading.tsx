import { useState } from 'react'
import { BRAND_NAME, BRAND_WORDMARK_URL } from '@/lib/brand'

/** Wordmark logo with a graceful text fallback if the image fails to load. */
export function BrandHeading({ className = 'mb-2 h-9 w-auto' }: { className?: string }) {
  const [failed, setFailed] = useState(false)
  return failed ? (
    <div className="mb-1 [font-family:var(--font-heading)] text-xl font-extrabold">{BRAND_NAME}</div>
  ) : (
    <img src={BRAND_WORDMARK_URL} alt={BRAND_NAME} onError={() => setFailed(true)} className={className} />
  )
}
