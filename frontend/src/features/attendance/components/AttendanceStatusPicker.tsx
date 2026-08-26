import { cn } from '@/utils/cn'
import { ATTENDANCE_STATUSES, getAttendanceStatusLabels, type AttendanceStatus } from '@/types/enums'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { ATTENDANCE_STATUS_ACTIVE_CLASSES, ATTENDANCE_STATUS_BADGE_VARIANT } from '../statusStyles'
import '../i18n'

/** Compact pill toggle group used both for taking attendance and for single-record corrections. */
export function AttendanceStatusPicker({
  value,
  onChange,
  statuses = ATTENDANCE_STATUSES,
  size = 'md',
}: {
  value: AttendanceStatus
  onChange: (status: AttendanceStatus) => void
  statuses?: readonly AttendanceStatus[]
  size?: 'sm' | 'md'
}) {
  const { t } = useFeatureTranslation('attendance')
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup">
      {statuses.map((status) => {
        const active = status === value
        const variant = ATTENDANCE_STATUS_BADGE_VARIANT[status]
        return (
          <button
            key={status}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(status)}
            className={cn(
              'rounded-full border font-medium transition-colors',
              size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
              active ? ATTENDANCE_STATUS_ACTIVE_CLASSES[variant] : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {getAttendanceStatusLabels(t)[status]}
          </button>
        )
      })}
    </div>
  )
}
