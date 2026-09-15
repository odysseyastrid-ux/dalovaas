import { Button } from './Button'

export function ConfirmModal({
  title,
  desc,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string
  desc?: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl bg-[var(--color-bg)] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold">{title}</div>
        {desc && <div className="mb-4 text-sm text-[var(--color-ink)]/70">{desc}</div>}
        <div className={desc ? 'flex gap-2' : 'mt-4 flex gap-2'}>
          <Button variant="secondary" className="flex-1 text-center" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            className="flex-1 text-center"
            style={danger ? { background: '#dc2626', color: 'white' } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
