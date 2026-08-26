import { Download } from 'lucide-react'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Button, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { downloadFile } from '@/utils/download'
import type { TermResult } from '@/types/exam'
import '../i18n'

export function TermResultDisplay({ result, pdfUrl }: { result: TermResult; pdfUrl?: string }) {
  const { t } = useFeatureTranslation('exams')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t('termResult.consolidatedResultHeading', { term: result.term.name })}</h3>
        {pdfUrl && (
          <Button variant="outline" onClick={() => downloadFile(pdfUrl, `${result.student.full_name}-${result.term.name}-term-result.pdf`)}>
            <Download className="h-4 w-4" /> {t('termResult.downloadPdf')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label={t('termResult.weightedPercentage')} value={result.weighted_percentage !== null ? `${result.weighted_percentage}%` : '—'} />
        <StatCard label={t('termResult.weightedGpa')} value={result.weighted_gpa ?? '—'} />
        <StatCard label={t('termResult.grade')} value={result.grade_label ?? '—'} />
        <StatCard label={t('termResult.rank')} value={result.rank ? `${result.rank.position} / ${result.rank.out_of}` : '—'} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('termResult.columnExam')}</TableHead>
            <TableHead>{t('termResult.columnWeight')}</TableHead>
            <TableHead>{t('termResult.columnPercentage')}</TableHead>
            <TableHead>{t('termResult.columnGpa')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {result.exams.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">{t('termResult.noExamsYet')}</TableCell></TableRow>
          )}
          {result.exams.map((row) => (
            <TableRow key={row.exam.id}>
              <TableCell className="font-medium">{row.exam.name}</TableCell>
              <TableCell>{row.weight}</TableCell>
              <TableCell>{row.percentage !== null ? `${row.percentage}%` : '—'}</TableCell>
              <TableCell>{row.gpa ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
