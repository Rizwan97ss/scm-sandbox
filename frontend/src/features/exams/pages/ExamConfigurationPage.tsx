import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui'
import { AssessmentComponentTypesPage } from './AssessmentComponentTypesPage'
import { ExamTypesPage } from './ExamTypesPage'
import '../i18n'

/** One combined settings page rather than two separate nav items — both are small, infrequently-changed lookup tables in the same "how exams are structured" concern. */
export function ExamConfigurationPage() {
  const { t } = useFeatureTranslation('exams')
  return (
    <div>
      <PageHeader title={t('examConfiguration.title')} description={t('examConfiguration.description')} />
      <Tabs
        items={[
          { value: 'exam-types', label: t('examConfiguration.tabExamTypes'), content: <ExamTypesPage /> },
          { value: 'component-types', label: t('examConfiguration.tabComponentTypes'), content: <AssessmentComponentTypesPage /> },
        ]}
      />
    </div>
  )
}
