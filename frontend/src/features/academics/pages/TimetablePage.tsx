import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui'
import { TimetablePeriodsManager } from '../components/TimetablePeriodsManager'
import { ClassSubjectTeacherManager } from '../components/ClassSubjectTeacherManager'
import { TimetableGridBuilder } from '../components/TimetableGridBuilder'
import '../i18n'

export function TimetablePage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('timetable.title')} description={t('timetable.description')} />
      <Tabs
        items={[
          { value: 'grid', label: t('timetable.tabGrid'), content: <TimetableGridBuilder /> },
          { value: 'assignments', label: t('timetable.tabAssignments'), content: <ClassSubjectTeacherManager /> },
          { value: 'periods', label: t('timetable.tabPeriods'), content: <TimetablePeriodsManager /> },
        ]}
      />
    </div>
  )
}
