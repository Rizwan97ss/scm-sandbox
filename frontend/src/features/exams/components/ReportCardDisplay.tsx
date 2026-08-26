import { Download } from 'lucide-react'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, Button, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { downloadFile } from '@/utils/download'
import type { BadgeVariant } from '@/components/ui/Badge'
import type { ReportCard, SubjectResultStatus } from '@/types/exam'
import '../i18n'

const STATUS_VARIANTS: Record<SubjectResultStatus, BadgeVariant> = { draft: 'default', calculated: 'warning', published: 'success' }

export function ReportCardDisplay({ report, pdfUrl }: { report: ReportCard; pdfUrl?: string }) {
  const { t } = useFeatureTranslation('exams')
  const statusLabels: Record<SubjectResultStatus, string> = {
    draft: t('reportCard.statusDraft'),
    calculated: t('reportCard.statusCalculated'),
    published: t('reportCard.statusPublished'),
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{report.exam.name}</h3>
          {!report.exam.is_published && <Badge variant="warning">{t('reportCard.notYetPublished')}</Badge>}
        </div>
        {pdfUrl && (
          <Button variant="outline" onClick={() => downloadFile(pdfUrl, `${report.student.full_name}-${report.exam.name}-report-card.pdf`)}>
            <Download className="h-4 w-4" /> {t('reportCard.downloadPdf')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label={t('reportCard.overallPercentage')} value={report.overall_percentage !== null ? `${report.overall_percentage}%` : '—'} />
        <StatCard label={t('reportCard.overallGpa')} value={report.overall_gpa ?? '—'} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('reportCard.columnSubject')}</TableHead>
            <TableHead>{t('reportCard.columnComponents')}</TableHead>
            <TableHead>{t('reportCard.columnTotal')}</TableHead>
            <TableHead>{t('reportCard.columnPercentage')}</TableHead>
            <TableHead>{t('reportCard.columnGrade')}</TableHead>
            <TableHead>{t('reportCard.columnPassFail')}</TableHead>
            <TableHead>{t('reportCard.columnStatus')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {report.subjects.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">{t('reportCard.noSubjectsConfigured')}</TableCell></TableRow>
          )}
          {report.subjects.map((row) => (
            <TableRow key={row.group.id}>
              <TableCell className="font-medium">{row.group.subject.name}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {row.components.length > 0
                  ? row.components.map((c) => `${c.type ?? t('reportCard.componentFallback')}: ${c.is_absent ? t('reportCard.absent') : (c.marks_obtained ?? '—')}/${c.max_marks}`).join(', ')
                  : '—'}
              </TableCell>
              <TableCell>{row.is_absent ? <Badge variant="destructive">{t('reportCard.absent')}</Badge> : `${row.marks_obtained_total ?? '—'} / ${row.max_marks_total}`}</TableCell>
              <TableCell>{row.percentage !== null ? `${row.percentage}%` : '—'}</TableCell>
              <TableCell>{row.grade_label ?? '—'}</TableCell>
              <TableCell>
                {row.is_pass === true && <Badge variant="success">{t('reportCard.pass')}</Badge>}
                {row.is_pass === false && <Badge variant="destructive">{t('reportCard.fail')}</Badge>}
                {row.is_pass === null && '—'}
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[row.group.status]}>{statusLabels[row.group.status]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
