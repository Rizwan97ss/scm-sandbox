import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { Button, type ButtonVariant } from './Button'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  confirmVariant?: ButtonVariant
  isLoading?: boolean
  onConfirm: () => void
}

/** Use for any destructive or hard-to-undo action (delete, withdraw, deactivate). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant = 'destructive',
  isLoading,
  onConfirm,
}: ConfirmDialogProps) {
  const { t } = useTranslation()
  const resolvedConfirmLabel = confirmLabel ?? t('confirmDialog.confirm')
  const resolvedCancelLabel = cancelLabel ?? t('confirmDialog.cancel')

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {resolvedCancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} isLoading={isLoading}>
            {resolvedConfirmLabel}
          </Button>
        </>
      }
    >
      <></>
    </Modal>
  )
}
