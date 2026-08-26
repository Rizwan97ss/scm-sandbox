import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersApi, type CreateUserPayload } from '@/api/endpoints/users'
import { designationsApi } from '@/api/endpoints/hr'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Button, Checkbox, FormField, Input, Modal, Select } from '@/components/ui'
import type { User } from '@/types/auth'
import type { Role } from '@/api/endpoints/roles'
import type { ApiError } from '@/api/client'
import '../i18n'

const emptyForm: CreateUserPayload = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
  roles: [],
  designation_id: null,
  employee_id: '',
  hire_date: '',
}

export function UserFormModal({
  open,
  onOpenChange,
  editing,
  roles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: User | null
  roles: Role[]
}) {
  const { t } = useFeatureTranslation('users')
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CreateUserPayload>(emptyForm)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])

  const { data: designations } = useQuery({ queryKey: queryKeys.designations({ per_page: 100 }), queryFn: () => designationsApi.list({ per_page: 100 }) })

  useEffect(() => {
    if (editing) {
      setForm({
        ...emptyForm,
        first_name: editing.first_name,
        last_name: editing.last_name,
        email: editing.email,
        designation_id: editing.designation?.id ?? null,
        employee_id: editing.employee_id ?? '',
        hire_date: editing.hire_date ?? '',
      })
      setSelectedRoles(editing.roles)
    } else {
      setForm(emptyForm)
      setSelectedRoles([])
    }
  }, [editing, open])

  // .slice(0, 1) — the real list is cached with real pagination/filter params (see UsersListPage), so a bare
  // key here would silently fail to match it and leave the list showing stale data after this mutation.
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.users().slice(0, 1) })

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserPayload) => usersApi.create(payload),
    onSuccess: () => {
      toast.success(t('formModal.createdToast'))
      invalidate()
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return
      await usersApi.update(editing.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        designation_id: form.designation_id,
        employee_id: form.employee_id || null,
        hire_date: form.hire_date || null,
      })
      await usersApi.updateRoles(editing.id, selectedRoles)
    },
    onSuccess: () => {
      toast.success(t('formModal.updatedToast'))
      invalidate()
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  function toggleRole(name: string, checked: boolean) {
    setSelectedRoles((current) => (checked ? [...current, name] : current.filter((r) => r !== name)))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) {
      await updateMutation.mutateAsync()
    } else {
      await createMutation.mutateAsync({ ...form, roles: selectedRoles })
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={editing ? t('formModal.editTitle') : t('formModal.newTitle')} size="lg">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('fields.firstName')} htmlFor="first_name" required>
            <Input id="first_name" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.lastName')} htmlFor="last_name" required>
            <Input id="last_name" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </FormField>
        </div>
        <FormField label={t('fields.email')} htmlFor="email" required>
          <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label={t('fields.designation')} htmlFor="designation_id" hint={t('fields.optional')}>
            <Select
              id="designation_id"
              value={form.designation_id ? String(form.designation_id) : 'none'}
              onValueChange={(value) => setForm({ ...form, designation_id: value === 'none' ? null : Number(value) })}
              options={[{ value: 'none', label: t('fields.none') }, ...(designations?.data ?? []).map((d) => ({ value: String(d.id), label: d.name }))]}
            />
          </FormField>
          <FormField label={t('fields.employeeId')} htmlFor="employee_id" hint={t('fields.optional')}>
            <Input id="employee_id" value={form.employee_id ?? ''} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
          </FormField>
          <FormField label={t('fields.hireDate')} htmlFor="hire_date" hint={t('fields.optional')}>
            <Input id="hire_date" type="date" value={form.hire_date ?? ''} onChange={(e) => setForm({ ...form, hire_date: e.target.value })} />
          </FormField>
        </div>

        {!editing && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('fields.password')} htmlFor="password" required>
              <Input id="password" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FormField>
            <FormField label={t('fields.confirmPassword')} htmlFor="password_confirmation" required>
              <Input
                id="password_confirmation"
                type="password"
                required
                value={form.password_confirmation}
                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              />
            </FormField>
          </div>
        )}

        <FormField label={t('fields.roles')} required>
          <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
            {roles.map((role) => (
              <label key={role.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={selectedRoles.includes(role.name)} onCheckedChange={(checked) => toggleRole(role.name, checked)} />
                {role.name}
              </label>
            ))}
          </div>
        </FormField>

        <Button type="submit" isLoading={isLoading} className="mt-2">
          {editing ? t('formModal.saveChanges') : t('formModal.createUser')}
        </Button>
      </form>
    </Modal>
  )
}
