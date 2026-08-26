import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { studentsApi } from '@/api/endpoints/students'
import { academicYearsApi, gradeLevelsApi, sectionsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Button, FormField, Modal, Select, Textarea } from '@/components/ui'
import type { Student } from '@/types/student'
import type { ApiError } from '@/api/client'
import type { TFunction } from 'i18next'
import '../i18n'

export type EnrollmentActionType = 'promote' | 'transfer' | 'withdraw' | 'graduate' | 'reactivate'

function actionCopy(t: TFunction, action: EnrollmentActionType): { title: string; needsTarget: boolean; confirmLabel: string } {
  const copy: Record<EnrollmentActionType, { title: string; needsTarget: boolean; confirmLabel: string }> = {
    promote: { title: t('enrollmentActions.promoteTitle'), needsTarget: true, confirmLabel: t('enrollmentActions.promoteConfirm') },
    transfer: { title: t('enrollmentActions.transferTitle'), needsTarget: false, confirmLabel: t('enrollmentActions.transferConfirm') },
    withdraw: { title: t('enrollmentActions.withdrawTitle'), needsTarget: false, confirmLabel: t('enrollmentActions.withdrawConfirm') },
    graduate: { title: t('enrollmentActions.graduateTitle'), needsTarget: false, confirmLabel: t('enrollmentActions.graduateConfirm') },
    reactivate: { title: t('enrollmentActions.reactivateTitle'), needsTarget: true, confirmLabel: t('enrollmentActions.reactivateConfirm') },
  }
  return copy[action]
}

export function StudentEnrollmentActionModal({
  student,
  action,
  onOpenChange,
}: {
  student: Student
  action: EnrollmentActionType | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useFeatureTranslation('students')
  const queryClient = useQueryClient()
  const [reason, setReason] = useState('')
  const [gradeLevelId, setGradeLevelId] = useState<number>()
  const [sectionId, setSectionId] = useState<number>()
  const [academicYearId, setAcademicYearId] = useState<number>()

  const { data: gradeLevels } = useQuery({ queryKey: queryKeys.gradeLevels({ per_page: 100 }), queryFn: () => gradeLevelsApi.list({ per_page: 100 }) })
  const { data: academicYears } = useQuery({ queryKey: queryKeys.academicYears({ per_page: 100 }), queryFn: () => academicYearsApi.list({ per_page: 100 }) })
  const { data: sections } = useQuery({
    queryKey: queryKeys.sections({ grade_level_id: gradeLevelId }),
    queryFn: () => sectionsApi.list({ per_page: 100, 'filter[grade_level_id]': gradeLevelId }),
    enabled: !!gradeLevelId,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!action) return
      if (action === 'promote') {
        if (!gradeLevelId || !sectionId || !academicYearId) throw new Error(t('enrollmentActions.selectGradeSectionYear'))
        return studentsApi.promote(student.id, { to_grade_level_id: gradeLevelId, to_section_id: sectionId, to_academic_year_id: academicYearId, reason })
      }
      if (action === 'reactivate') {
        if (!gradeLevelId || !sectionId) throw new Error(t('enrollmentActions.selectGradeSection'))
        return studentsApi.reactivate(student.id, { to_grade_level_id: gradeLevelId, to_section_id: sectionId, reason })
      }
      if (action === 'transfer') return studentsApi.transfer(student.id, { reason })
      if (action === 'withdraw') return studentsApi.withdraw(student.id, { reason })
      return studentsApi.graduate(student.id, { reason })
    },
    onSuccess: () => {
      toast.success(t('profile.recordUpdated'))
      queryClient.invalidateQueries({ queryKey: queryKeys.student(student.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.studentEnrollmentHistory(student.id) })
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as Error | ApiError).message),
  })

  if (!action) return null
  const copy = actionCopy(t, action)

  return (
    <Modal open={!!action} onOpenChange={onOpenChange} title={copy.title} size="sm">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (mutation.isPending) return
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        {copy.needsTarget && (
          <>
            <FormField label={t('fields.gradeLevel')} required>
              <Select
                value={gradeLevelId ? String(gradeLevelId) : undefined}
                onValueChange={(value) => setGradeLevelId(Number(value))}
                options={(gradeLevels?.data ?? []).map((level) => ({ value: String(level.id), label: level.name }))}
              />
            </FormField>
            <FormField label={t('fields.section')} required>
              <Select
                value={sectionId ? String(sectionId) : undefined}
                onValueChange={(value) => setSectionId(Number(value))}
                options={(sections?.data ?? []).map((section) => ({ value: String(section.id), label: section.name }))}
                disabled={!gradeLevelId}
              />
            </FormField>
            {action === 'promote' && (
              <FormField label={t('fields.academicYear')} required>
                <Select
                  value={academicYearId ? String(academicYearId) : undefined}
                  onValueChange={(value) => setAcademicYearId(Number(value))}
                  options={(academicYears?.data ?? []).map((year) => ({ value: String(year.id), label: year.name }))}
                />
              </FormField>
            )}
          </>
        )}
        <FormField label={t('fields.reason')} hint={t('enrollmentActions.reasonHintEnrollment')}>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <Button type="submit" isLoading={mutation.isPending} className="mt-2">
          {copy.confirmLabel}
        </Button>
      </form>
    </Modal>
  )
}
