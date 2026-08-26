import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { studentAdmissionSchema, type StudentAdmissionFormValues } from '../schemas/studentAdmissionSchema'
import { studentsApi } from '@/api/endpoints/students'
import { academicYearsApi, departmentsApi, gradeLevelsApi, sectionsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, DatePicker, FormField, Input, Select } from '@/components/ui'
import { GENDERS, getGenderLabels, GUARDIAN_RELATIONSHIPS, getGuardianRelationshipLabels } from '@/types/enums'
import { routePaths } from '@/routes/routePaths'
import type { ApiError } from '@/api/client'
import '../i18n'

export function StudentAdmissionPage() {
  const { t } = useFeatureTranslation('students')
  const navigate = useNavigate()

  const { data: academicYears } = useQuery({ queryKey: queryKeys.academicYears({ per_page: 100 }), queryFn: () => academicYearsApi.list({ per_page: 100 }) })
  const { data: gradeLevels } = useQuery({ queryKey: queryKeys.gradeLevels({ per_page: 100 }), queryFn: () => gradeLevelsApi.list({ per_page: 100 }) })
  const { data: departments } = useQuery({ queryKey: queryKeys.departments({ per_page: 100 }), queryFn: () => departmentsApi.list({ per_page: 100 }) })

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<StudentAdmissionFormValues>({
    resolver: zodResolver(studentAdmissionSchema),
    defaultValues: {
      gender: 'male',
      admission_date: new Date().toISOString().slice(0, 10),
      guardians: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' })

  const gradeLevelId = watch('current_grade_level_id')
  const { data: sections } = useQuery({
    queryKey: queryKeys.sections({ grade_level_id: gradeLevelId }),
    queryFn: () => sectionsApi.list({ per_page: 100, 'filter[grade_level_id]': gradeLevelId }),
    enabled: !!gradeLevelId,
  })

  const createMutation = useMutation({
    mutationFn: studentsApi.create,
    onSuccess: (student) => {
      toast.success(t('admission.admittedSuccess', { name: student.full_name }))
      navigate(routePaths.studentProfile(student.id))
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  useUnsavedChangesWarning(isDirty && !createMutation.isSuccess)

  function onSubmit(values: StudentAdmissionFormValues) {
    if (createMutation.isPending) return
    createMutation.mutate({
      ...values,
      guardians: values.guardians.map((guardian) => ({ ...guardian, email: guardian.email || null })),
    })
  }

  return (
    <div>
      <PageHeader title={t('admission.title')} breadcrumbs={[{ label: t('admission.breadcrumbStudents'), to: routePaths.students }, { label: t('admission.breadcrumbAdmission') }]} />

      <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-3xl flex-col gap-8" noValidate>
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('admission.studentDetails')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('fields.firstName')} htmlFor="first_name" error={errors.first_name?.message} required>
              <Input id="first_name" invalid={!!errors.first_name} {...register('first_name')} />
            </FormField>
            <FormField label={t('fields.lastName')} htmlFor="last_name" error={errors.last_name?.message} required>
              <Input id="last_name" invalid={!!errors.last_name} {...register('last_name')} />
            </FormField>
            <FormField label={t('fields.gender')} htmlFor="gender" required>
              <Select
                id="gender"
                value={watch('gender')}
                onValueChange={(value) => setValue('gender', value as StudentAdmissionFormValues['gender'])}
                options={GENDERS.map((g) => ({ value: g, label: getGenderLabels(t)[g] }))}
              />
            </FormField>
            <FormField label={t('fields.dateOfBirth')} htmlFor="date_of_birth" error={errors.date_of_birth?.message} required>
              <DatePicker id="date_of_birth" invalid={!!errors.date_of_birth} {...register('date_of_birth')} />
            </FormField>
            <FormField label={t('fields.bloodGroup')} htmlFor="blood_group">
              <Input id="blood_group" {...register('blood_group')} />
            </FormField>
            <FormField label={t('fields.nationality')} htmlFor="nationality">
              <Input id="nationality" {...register('nationality')} />
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('admission.enrollment')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('fields.academicYear')} htmlFor="academic_year_id" error={errors.academic_year_id?.message} required>
              <Select
                id="academic_year_id"
                value={watch('academic_year_id') ? String(watch('academic_year_id')) : undefined}
                onValueChange={(value) => setValue('academic_year_id', Number(value))}
                options={(academicYears?.data ?? []).map((year) => ({ value: String(year.id), label: year.name }))}
                placeholder={t('admission.selectAcademicYear')}
              />
            </FormField>
            <FormField label={t('fields.admissionDate')} htmlFor="admission_date" error={errors.admission_date?.message} required>
              <DatePicker id="admission_date" invalid={!!errors.admission_date} {...register('admission_date')} />
            </FormField>
            <FormField label={t('fields.gradeLevel')} htmlFor="current_grade_level_id">
              <Select
                id="current_grade_level_id"
                value={gradeLevelId ? String(gradeLevelId) : undefined}
                onValueChange={(value) => {
                  setValue('current_grade_level_id', Number(value))
                  setValue('current_section_id', undefined)
                }}
                options={(gradeLevels?.data ?? []).map((level) => ({ value: String(level.id), label: level.name }))}
                placeholder={t('admission.selectGradeLevel')}
              />
            </FormField>
            <FormField label={t('fields.department')} htmlFor="department_id">
              <Select
                id="department_id"
                value={watch('department_id') ? String(watch('department_id')) : undefined}
                onValueChange={(value) => setValue('department_id', Number(value))}
                options={(departments?.data ?? []).map((department) => ({ value: String(department.id), label: department.name }))}
                placeholder={t('admission.selectDepartment')}
              />
            </FormField>
            <FormField label={t('fields.section')} htmlFor="current_section_id">
              <Select
                id="current_section_id"
                value={watch('current_section_id') ? String(watch('current_section_id')) : undefined}
                onValueChange={(value) => setValue('current_section_id', Number(value))}
                options={(sections?.data ?? []).map((section) => ({ value: String(section.id), label: section.name }))}
                placeholder={gradeLevelId ? t('admission.selectSection') : t('admission.selectGradeLevelFirst')}
                disabled={!gradeLevelId}
              />
            </FormField>
            <FormField label={t('fields.rollNumber')} htmlFor="roll_number">
              <Input id="roll_number" {...register('roll_number')} />
            </FormField>
            <FormField label={t('fields.previousSchool')} htmlFor="previous_school_name">
              <Input id="previous_school_name" {...register('previous_school_name')} />
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('admission.emergencyContact')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('admission.contactName')} htmlFor="emergency_contact_name">
              <Input id="emergency_contact_name" {...register('emergency_contact_name')} />
            </FormField>
            <FormField label={t('admission.contactPhone')} htmlFor="emergency_contact_phone">
              <Input id="emergency_contact_phone" {...register('emergency_contact_phone')} />
            </FormField>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('admission.guardians')}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ first_name: '', last_name: '', phone: '', relationship_type: 'guardian', is_primary: fields.length === 0 })}
            >
              <Plus className="h-3.5 w-3.5" /> {t('admission.addGuardian')}
            </Button>
          </div>

          {fields.length === 0 && <p className="text-sm text-muted-foreground">{t('admission.noGuardiansYet')}</p>}

          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col gap-3 rounded-md border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t('admission.guardianN', { index: index + 1 })}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} aria-label={t('admission.removeGuardian')}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField label={t('fields.firstName')} required>
                  <Input {...register(`guardians.${index}.first_name`)} />
                </FormField>
                <FormField label={t('fields.lastName')} required>
                  <Input {...register(`guardians.${index}.last_name`)} />
                </FormField>
                <FormField label={t('fields.phone')} required>
                  <Input {...register(`guardians.${index}.phone`)} />
                </FormField>
                <FormField label={t('fields.email')}>
                  <Input type="email" {...register(`guardians.${index}.email`)} />
                </FormField>
                <FormField label={t('fields.relationship')} required>
                  <Select
                    value={watch(`guardians.${index}.relationship_type`)}
                    onValueChange={(value) => setValue(`guardians.${index}.relationship_type`, value as (typeof GUARDIAN_RELATIONSHIPS)[number])}
                    options={GUARDIAN_RELATIONSHIPS.map((r) => ({ value: r, label: getGuardianRelationshipLabels(t)[r] }))}
                  />
                </FormField>
              </div>
            </div>
          ))}
        </section>

        <div>
          <Button type="submit" isLoading={isSubmitting || createMutation.isPending}>
            {t('admission.admitStudent')}
          </Button>
        </div>
      </form>
    </div>
  )
}
