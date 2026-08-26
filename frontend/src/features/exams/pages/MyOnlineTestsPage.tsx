import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PlayCircle } from 'lucide-react'
import { onlineTestsApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, EmptyState, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import { formatDate } from '@/utils/formatDate'
import '../i18n'

export function MyOnlineTestsPage() {
  const { t } = useFeatureTranslation('exams')
  const navigate = useNavigate()
  const { data: tests, isLoading } = useQuery({ queryKey: queryKeys.myOnlineTests, queryFn: onlineTestsApi.mine })

  return (
    <div>
      <PageHeader title={t('myOnlineTests.title')} description={t('myOnlineTests.description')} />

      {isLoading && <Skeleton className="h-48 w-full" />}

      {!isLoading && (tests?.length ?? 0) === 0 && (
        <EmptyState title={t('myOnlineTests.emptyTitle')} description={t('myOnlineTests.emptyDescription')} />
      )}

      {!isLoading && (tests?.length ?? 0) > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('myOnlineTests.columnExam')}</TableHead>
              <TableHead>{t('myOnlineTests.columnSubject')}</TableHead>
              <TableHead>{t('myOnlineTests.columnDuration')}</TableHead>
              <TableHead>{t('myOnlineTests.columnWindow')}</TableHead>
              <TableHead>{t('myOnlineTests.columnAttempts')}</TableHead>
              <TableHead>{t('myOnlineTests.columnBestScore')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tests!.map((test) => {
              // A submitted attempt always counts toward attempts_used, but an
              // in-progress one is always resumable regardless of the cap (see
              // OnlineExamService::startAttempt()) — so this only needs the raw
              // count, not best_score, which is now masked until declared and
              // would otherwise make an exhausted, undeclared test look retakeable.
              const exhausted = test.attempts_used >= test.max_attempts
              return (
                <TableRow key={test.exam_subject_id}>
                  <TableCell className="font-medium">{test.exam_name}</TableCell>
                  <TableCell>{test.subject_name}</TableCell>
                  <TableCell>{test.duration_minutes ? t('myOnlineTests.minutesSuffix', { count: test.duration_minutes }) : t('myOnlineTests.noLimit')}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {test.online_starts_at ? formatDate(test.online_starts_at) : t('myOnlineTests.open')} – {test.online_ends_at ? formatDate(test.online_ends_at) : t('myOnlineTests.noDeadline')}
                  </TableCell>
                  <TableCell>{test.attempts_used} / {test.max_attempts}</TableCell>
                  <TableCell>
                    {test.result_declared && test.best_score !== null && <Badge variant="success">{test.best_score} / {test.max_score}</Badge>}
                    {!test.result_declared && test.attempts_used > 0 && <Badge variant="warning">{t('myOnlineTests.pending')}</Badge>}
                    {!test.result_declared && test.attempts_used === 0 && '—'}
                  </TableCell>
                  <TableCell className="text-end">
                    <Button size="sm" disabled={exhausted} onClick={() => navigate(routePaths.takeOnlineTest(test.exam_subject_id))}>
                      <PlayCircle className="h-3.5 w-3.5" /> {test.attempts_used > 0 ? t('myOnlineTests.retake') : t('myOnlineTests.start')}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
