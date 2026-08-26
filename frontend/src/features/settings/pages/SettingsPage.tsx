import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fetchSettings, updateSettings } from '@/api/endpoints/settings'
import { queryKeys } from '@/api/queryKeys'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, FormField, Input, Skeleton, Switch, Tabs } from '@/components/ui'
import type { SettingUpdateItem, SettingsMap } from '@/types/settings'
import type { ApiError } from '@/api/client'
import '../i18n'

interface FieldConfig {
  key: string
  labelKey: string
  hintKey?: string
  group: string
  type: 'string' | 'integer' | 'boolean'
  isPublic?: boolean
  inputType?: string
}

const FIELDS: FieldConfig[] = [
  { key: 'school.name', labelKey: 'fields.schoolName', group: 'school', type: 'string', isPublic: true },
  { key: 'school.short_name', labelKey: 'fields.shortName', hintKey: 'fields.shortNameHint', group: 'school', type: 'string', isPublic: true },
  { key: 'school.email', labelKey: 'fields.email', group: 'school', type: 'string' },
  { key: 'school.phone', labelKey: 'fields.phone', group: 'school', type: 'string' },
  { key: 'school.address_line1', labelKey: 'fields.addressLine1', group: 'school', type: 'string', isPublic: true },
  { key: 'school.address_line2', labelKey: 'fields.addressLine2', group: 'school', type: 'string', isPublic: true },
  { key: 'school.city', labelKey: 'fields.city', group: 'school', type: 'string', isPublic: true },
  { key: 'school.state', labelKey: 'fields.stateProvince', group: 'school', type: 'string', isPublic: true },
  { key: 'school.postal_code', labelKey: 'fields.postalCode', group: 'school', type: 'string', isPublic: true },
  { key: 'school.country', labelKey: 'fields.country', group: 'school', type: 'string', isPublic: true },
  { key: 'school.locale', labelKey: 'fields.locale', hintKey: 'fields.localeHint', group: 'school', type: 'string', isPublic: true },
  { key: 'branding.primary_color', labelKey: 'fields.primaryColor', group: 'branding', type: 'string', isPublic: true, inputType: 'color' },
  { key: 'branding.secondary_color', labelKey: 'fields.secondaryColor', group: 'branding', type: 'string', isPublic: true, inputType: 'color' },
  { key: 'branding.logo_url', labelKey: 'fields.logoUrl', group: 'branding', type: 'string', isPublic: true },
  { key: 'branding.favicon_url', labelKey: 'fields.faviconUrl', group: 'branding', type: 'string', isPublic: true },
  { key: 'localization.currency', labelKey: 'fields.currencyCode', hintKey: 'fields.currencyCodeHint', group: 'localization', type: 'string', isPublic: true },
  { key: 'localization.currency_symbol', labelKey: 'fields.currencySymbol', group: 'localization', type: 'string', isPublic: true },
  { key: 'localization.timezone', labelKey: 'fields.timezone', hintKey: 'fields.timezoneHint', group: 'localization', type: 'string', isPublic: true },
  { key: 'localization.date_format', labelKey: 'fields.dateFormat', hintKey: 'fields.dateFormatHint', group: 'localization', type: 'string', isPublic: true },
  { key: 'academic.grade_level_label', labelKey: 'fields.gradeLevelTerminology', hintKey: 'fields.gradeLevelTerminologyHint', group: 'academic', type: 'string', isPublic: true },
  { key: 'academic.section_label', labelKey: 'fields.sectionTerminology', group: 'academic', type: 'string', isPublic: true },
  { key: 'academic.term_label', labelKey: 'fields.termTerminology', hintKey: 'fields.termTerminologyHint', group: 'academic', type: 'string', isPublic: true },
  { key: 'students.admission_number_format', labelKey: 'fields.admissionNumberFormat', hintKey: 'fields.admissionNumberFormatHint', group: 'students', type: 'string' },
  { key: 'students.admission_number_padding', labelKey: 'fields.admissionNumberPadding', hintKey: 'fields.admissionNumberPaddingHint', group: 'students', type: 'integer' },
  { key: 'notifications.email_enabled', labelKey: 'fields.emailNotificationsEnabled', group: 'notifications', type: 'boolean' },
  {
    key: 'retention.activity_log_days',
    labelKey: 'fields.auditLogRetentionDays',
    hintKey: 'fields.auditLogRetentionDaysHint',
    group: 'retention',
    type: 'integer',
  },
  {
    key: 'retention.data_export_days',
    labelKey: 'fields.dataExportAvailabilityDays',
    hintKey: 'fields.dataExportAvailabilityDaysHint',
    group: 'retention',
    type: 'integer',
  },
  {
    key: 'retention.inactive_account_anonymize_days',
    labelKey: 'fields.autoAnonymizeInactiveDays',
    hintKey: 'fields.autoAnonymizeInactiveDaysHint',
    group: 'retention',
    type: 'integer',
  },
]

export function SettingsPage() {
  const { t } = useFeatureTranslation('settings')
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({ queryKey: queryKeys.settings, queryFn: fetchSettings })
  const [values, setValues] = useState<SettingsMap>({})

  useEffect(() => {
    if (data) setValues(data)
  }, [data])

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      toast.success(t('page.toastSaved'))
      queryClient.setQueryData(queryKeys.settings, updated)
      queryClient.invalidateQueries({ queryKey: queryKeys.publicSettings() })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  function submitGroup(group: string) {
    const settings: SettingUpdateItem[] = FIELDS.filter((field) => field.group === group).map((field) => ({
      key: field.key,
      value: values[field.key],
      type: field.type,
      group: field.group,
      is_public: field.isPublic ?? false,
    }))
    mutation.mutate({ settings })
  }

  function renderField(field: FieldConfig) {
    const value = values[field.key]
    return (
      <FormField key={field.key} label={t(field.labelKey)} htmlFor={field.key} hint={field.hintKey ? t(field.hintKey) : undefined}>
        {field.type === 'boolean' ? (
          <Switch checked={!!value} onCheckedChange={(checked) => setValues({ ...values, [field.key]: checked })} />
        ) : (
          <Input
            id={field.key}
            type={field.inputType ?? (field.type === 'integer' ? 'number' : 'text')}
            value={(value as string | number | undefined) ?? ''}
            onChange={(e) => setValues({ ...values, [field.key]: field.type === 'integer' ? Number(e.target.value) : e.target.value })}
          />
        )}
      </FormField>
    )
  }

  function groupPanel(group: string, description: string) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{FIELDS.filter((field) => field.group === group).map(renderField)}</div>
        {can('settings.edit') && (
          <div>
            <Button onClick={() => submitGroup(group)} isLoading={mutation.isPending}>
              {t('page.saveChanges')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t('page.title')} description={t('page.description')} />
      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <Tabs
          items={[
            { value: 'school', label: t('page.tabSchool'), content: groupPanel('school', t('page.descriptionSchool')) },
            { value: 'branding', label: t('page.tabBranding'), content: groupPanel('branding', t('page.descriptionBranding')) },
            { value: 'localization', label: t('page.tabLocalization'), content: groupPanel('localization', t('page.descriptionLocalization')) },
            { value: 'academic', label: t('page.tabAcademic'), content: groupPanel('academic', t('page.descriptionAcademic')) },
            { value: 'students', label: t('page.tabStudents'), content: groupPanel('students', t('page.descriptionStudents')) },
            { value: 'notifications', label: t('page.tabNotifications'), content: groupPanel('notifications', t('page.descriptionNotifications')) },
            { value: 'retention', label: t('page.tabRetention'), content: groupPanel('retention', t('page.descriptionRetention')) },
          ]}
        />
      )}
    </div>
  )
}
