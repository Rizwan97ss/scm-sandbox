import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, Send } from 'lucide-react'
import { studentsApi } from '@/api/endpoints/students'
import { guardiansApi } from '@/api/endpoints/guardians'
import { queryKeys } from '@/api/queryKeys'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, Button, Checkbox, EmptyState, FormField, Input, Modal, Select } from '@/components/ui'
import { GUARDIAN_RELATIONSHIPS, getGuardianRelationshipLabels } from '@/types/enums'
import type { Student, StudentGuardianInput } from '@/types/student'
import type { ApiError } from '@/api/client'
import '../i18n'

const emptyForm: StudentGuardianInput = { first_name: '', last_name: '', phone: '', relationship_type: 'guardian', is_primary: false, can_pickup: true }

export function StudentGuardianList({ student }: { student: Student }) {
  const { t } = useFeatureTranslation('students')
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<StudentGuardianInput>(emptyForm)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.student(student.id) })

  const attachMutation = useMutation({
    mutationFn: (payload: StudentGuardianInput) => studentsApi.attachGuardian(student.id, payload),
    onSuccess: () => {
      toast.success(t('guardianList.linked'))
      invalidate()
      setModalOpen(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const detachMutation = useMutation({
    mutationFn: (guardianId: number) => studentsApi.detachGuardian(student.id, guardianId),
    onSuccess: () => {
      toast.success(t('guardianList.unlinked'))
      invalidate()
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (guardianId: number) => guardiansApi.invite(guardianId),
    onSuccess: () => toast.success(t('guardianList.inviteSent')),
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <div className="flex flex-col gap-4">
      {can('students.edit') && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setForm(emptyForm)
              setModalOpen(true)
            }}
          >
            <Plus className="h-3.5 w-3.5" /> {t('guardianList.linkGuardian')}
          </Button>
        </div>
      )}

      {(student.guardians?.length ?? 0) === 0 && <EmptyState title={t('guardianList.noGuardians')} />}

      {(student.guardians?.length ?? 0) > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {student.guardians?.map((guardian) => (
            <li key={guardian.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">
                  {guardian.full_name}{' '}
                  {guardian.is_primary && (
                    <Badge variant="primary" className="ms-1">
                      {t('guardianList.primary')}
                    </Badge>
                  )}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getGuardianRelationshipLabels(t)[guardian.relationship_type]} · {guardian.phone}
                  {guardian.email ? ` · ${guardian.email}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {can('guardians.edit') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => inviteMutation.mutate(guardian.id)}
                    isLoading={inviteMutation.isPending && inviteMutation.variables === guardian.id}
                  >
                    <Send className="h-3.5 w-3.5" /> {t('guardianList.invite')}
                  </Button>
                )}
                {can('students.edit') && (
                  <Button variant="outline" size="sm" onClick={() => detachMutation.mutate(guardian.id)} aria-label={t('guardianList.unlink', { name: guardian.full_name })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={t('guardianList.linkGuardian')} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            attachMutation.mutate(form)
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label={t('fields.firstName')} htmlFor="guardian_first_name" required>
              <Input id="guardian_first_name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </FormField>
            <FormField label={t('fields.lastName')} htmlFor="guardian_last_name" required>
              <Input id="guardian_last_name" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </FormField>
          </div>
          <FormField label={t('fields.phone')} htmlFor="guardian_phone" required>
            <Input id="guardian_phone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </FormField>
          <FormField label={t('fields.email')} htmlFor="guardian_email">
            <Input id="guardian_email" type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label={t('fields.relationship')} htmlFor="guardian_relationship" required>
            <Select
              id="guardian_relationship"
              value={form.relationship_type}
              onValueChange={(value) => setForm({ ...form, relationship_type: value as StudentGuardianInput['relationship_type'] })}
              options={GUARDIAN_RELATIONSHIPS.map((r) => ({ value: r, label: getGuardianRelationshipLabels(t)[r] }))}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.is_primary} onCheckedChange={(checked) => setForm({ ...form, is_primary: checked })} />
            {t('guardianList.primaryGuardian')}
          </label>
          <Button type="submit" isLoading={attachMutation.isPending} className="mt-2">
            {t('guardianList.linkGuardianSubmit')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
