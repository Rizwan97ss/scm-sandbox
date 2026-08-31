import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { reportsApi } from '@/api/endpoints/reports'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { CHART_LTR_STYLE, useChartDirection } from '@/hooks/useChartDirection'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, DataTable, QueryErrorState, Skeleton, type DataTableColumn } from '@/components/ui'
import type { ExamPerformance } from '@/types/reports'
import '../i18n'

export function AcademicReportPage() {
  const { t } = useFeatureTranslation('reports')
  const chartDir = useChartDirection()
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.reportsAcademicPerformance, queryFn: reportsApi.academicPerformance })

  const exams = data?.exams ?? []

  const columns: DataTableColumn<ExamPerformance>[] = [
    { key: 'exam_name', header: t('academic.columnExam'), render: (row) => <span className="font-medium">{row.exam_name}</span> },
    { key: 'entries_count', header: t('academic.columnMarksEntered'), align: 'right', render: (row) => row.entries_count },
    { key: 'average_percentage', header: t('academic.columnAverage'), align: 'right', render: (row) => (row.average_percentage != null ? `${row.average_percentage}%` : '—') },
    { key: 'pass_rate', header: t('academic.columnPassRate'), align: 'right', render: (row) => (row.pass_rate != null ? `${row.pass_rate}%` : '—') },
  ]

  return (
    <div>
      <PageHeader title={t('academic.title')} description={t('academic.description')} />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && isError && <QueryErrorState onRetry={refetch} />}

      {!isLoading && !isError && exams.length === 0 && <p className="text-sm text-muted-foreground">{t('academic.noExams')}</p>}

      {!isError && exams.length > 0 && (
        <>
          <Card className="mb-6">
            <CardContent className="pt-6">
              <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={280}>
                <BarChart data={exams}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="exam_name" fontSize={12} {...chartDir.horizontalAxisProps} />
                  <YAxis domain={[0, 100]} fontSize={12} orientation={chartDir.startOrientation} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Bar dataKey="average_percentage" name={t('academic.legendAverage')} fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pass_rate" name={t('academic.legendPassRate')} fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <DataTable columns={columns} data={exams} rowKey={(row) => row.exam_id} isLoading={false} />
        </>
      )}
    </div>
  )
}
