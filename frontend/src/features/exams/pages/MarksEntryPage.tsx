import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Save } from 'lucide-react'
import { examMarksApi, examsApi } from '@/api/endpoints/exams'
import { studentsApi } from '@/api/endpoints/students'
import { queryKeys } from '@/api/queryKeys'
import { usePermission } from '@/hooks/usePermission'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Checkbox, Input, Modal, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import { formatApiError, type ApiError } from '@/api/client'
import type { ExamMarkImportResult } from '@/types/exam'
import '../i18n'

interface EntryState {
  marks_obtained: string
  is_absent: boolean
  remarks: string
}

export function MarksEntryPage() {
  const { t } = useFeatureTranslation('exams')
  const { examId, examSubjectId } = useParams<{ examId: string; examSubjectId: string }>()
  const examSubjectIdNum = Number(examSubjectId)
  const location = useLocation()
  const queryClient = useQueryClient()
  const { can } = usePermission()

  const { data: exam } = useQuery({ queryKey: queryKeys.exam(Number(examId)), queryFn: () => examsApi.get(Number(examId)) })

  // The link that brought us here (ExamDetailPage) already knows the group's ID and passes it
  // via router state, so this can fetch in parallel with `exam` instead of waiting for it — the
  // fix for the roster-query waterfall below. A direct link/refresh has no state, so this stays
  // disabled and `group` falls back to being derived from `exam` once that loads, same as before.
  const examSubjectGroupId = (location.state as { examSubjectGroupId?: number } | null)?.examSubjectGroupId
  const { data: groupFromState } = useQuery({
    queryKey: queryKeys.examSubjectGroup(examSubjectGroupId ?? 0),
    queryFn: () => examsApi.getGroup(examSubjectGroupId!),
    enabled: !!examSubjectGroupId,
  })

  // The component (what the marks belong to) and its parent group (what
  // subject/section it's under) — components no longer carry subject/
  // section directly, only their group does. See ExamSubjectGroup in types/exam.ts.
  const groupFromExam = exam?.exam_subject_groups.find((g) => g.components.some((c) => c.id === examSubjectIdNum))
  const group = groupFromState ?? groupFromExam
  const examSubject = groupFromExam?.components.find((c) => c.id === examSubjectIdNum)

  const { data: roster, isLoading: rosterLoading } = useQuery({
    queryKey: queryKeys.students({ 'filter[current_section_id]': group?.section?.id, per_page: 200 }),
    queryFn: () => studentsApi.list({ 'filter[current_section_id]': group!.section!.id, per_page: 200 }),
    enabled: !!group?.section?.id,
  })

  const { data: existingMarks } = useQuery({
    queryKey: queryKeys.examMarks(examSubjectIdNum),
    queryFn: () => examMarksApi.list(examSubjectIdNum),
  })

  const [entries, setEntries] = useState<Record<number, EntryState>>({})
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!roster) return
    const existingByStudent = new Map((existingMarks ?? []).map((m) => [m.student_id, m]))
    const next: Record<number, EntryState> = {}
    for (const student of roster.data) {
      const mark = existingByStudent.get(student.id)
      next[student.id] = {
        marks_obtained: mark?.marks_obtained !== null && mark?.marks_obtained !== undefined ? String(mark.marks_obtained) : '',
        is_absent: mark?.is_absent ?? false,
        remarks: mark?.remarks ?? '',
      }
    }
    setEntries(next)
    setIsDirty(false)
  }, [roster, existingMarks])

  useUnsavedChangesWarning(isDirty)

  function updateEntry(studentId: number, entry: EntryState) {
    setEntries((prev) => ({ ...prev, [studentId]: entry }))
    setIsDirty(true)
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      examMarksApi.mark(
        examSubjectIdNum,
        Object.entries(entries).map(([studentId, e]) => ({
          student_id: Number(studentId),
          marks_obtained: e.is_absent || e.marks_obtained === '' ? null : Number(e.marks_obtained),
          is_absent: e.is_absent,
          remarks: e.remarks || null,
        }))
      ),
    onSuccess: (records) => {
      toast.success(t('marksEntry.marksSavedToast', { count: records.length }))
      setIsDirty(false)
      queryClient.invalidateQueries({ queryKey: queryKeys.examMarks(examSubjectIdNum) })
    },
    onError: (error) => toast.error(formatApiError(error as ApiError)),
  })

  // ---- Import marks from Excel — an alternative to typing each row manually ----
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importResult, setImportResult] = useState<ExamMarkImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => examMarksApi.import(examSubjectIdNum, file),
    onSuccess: (result) => {
      setImportResult(result)
      queryClient.invalidateQueries({ queryKey: queryKeys.examMarks(examSubjectIdNum) })
      if (result.failed_count === 0) toast.success(t('marksEntry.importSuccessToast', { count: result.imported_count }))
      else toast.warning(t('marksEntry.importPartialToast', { imported: result.imported_count, failed: result.failed_count }))
    },
    onError: (error) => toast.error(formatApiError(error as ApiError)),
  })

  if (!exam || !examSubject) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('marksEntry.title', { subject: group?.subject?.name })}
        description={t('marksEntry.description', { exam: exam.name, section: group?.section?.name, maxMarks: examSubject.max_marks })}
        breadcrumbs={[{ label: t('marksEntry.breadcrumbExams'), to: routePaths.exams }, { label: exam.name, to: routePaths.examDetail(exam.id) }, { label: group?.subject?.name ?? '' }]}
        actions={
          can('exam-marks.import') && (
            <Button variant="outline" onClick={() => { setImportResult(null); setImportModalOpen(true) }}>
              <Download className="h-4 w-4" /> {t('marksEntry.importFromExcel')}
            </Button>
          )
        }
      />

      {rosterLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      )}

      {!rosterLoading && (roster?.data.length ?? 0) > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('marksEntry.columnAdmissionNumber')}</TableHead>
                <TableHead>{t('marksEntry.columnName')}</TableHead>
                <TableHead>{t('marksEntry.columnMarks')}</TableHead>
                <TableHead>{t('marksEntry.columnAbsent')}</TableHead>
                <TableHead>{t('marksEntry.columnRemarks')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster!.data.map((student) => {
                const entry = entries[student.id] ?? { marks_obtained: '', is_absent: false, remarks: '' }
                return (
                  <TableRow key={student.id}>
                    <TableCell className="text-muted-foreground">{student.admission_number}</TableCell>
                    <TableCell className="font-medium">{student.full_name}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={examSubject.max_marks}
                        step="0.01"
                        className="h-8 w-24"
                        disabled={entry.is_absent}
                        value={entry.marks_obtained}
                        onChange={(e) => updateEntry(student.id, { ...entry, marks_obtained: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={entry.is_absent}
                        onCheckedChange={(checked) => updateEntry(student.id, { ...entry, is_absent: checked, marks_obtained: checked ? '' : entry.marks_obtained })}
                        aria-label={t('marksEntry.markAbsentAria', { name: student.full_name })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-48"
                        placeholder={t('marksEntry.remarksPlaceholder')}
                        value={entry.remarks}
                        onChange={(e) => updateEntry(student.id, { ...entry, remarks: e.target.value })}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
              <Save className="h-4 w-4" /> {t('marksEntry.saveMarks')}
            </Button>
          </div>
        </>
      )}

      <Modal open={importModalOpen} onOpenChange={setImportModalOpen} title={t('marksEntry.importModalTitle', { subject: group?.subject?.name })}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t('marksEntry.importColumnsDescription')}{' '}
            <a href={examMarksApi.importTemplateUrl(examSubjectIdNum)} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {t('marksEntry.downloadTemplate')}
            </a>
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) importMutation.mutate(file)
              e.target.value = ''
            }}
          />
          <Button type="button" variant="outline" isLoading={importMutation.isPending} onClick={() => fileInputRef.current?.click()}>
            <Download className="h-4 w-4" /> {t('marksEntry.chooseFileToImport')}
          </Button>

          {importResult && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
              <p>
                <span className="font-medium text-success">{t('marksEntry.importedCount', { count: importResult.imported_count })}</span>
                {importResult.failed_count > 0 && <span className="text-destructive"> · {t('marksEntry.failedCount', { count: importResult.failed_count })}</span>}
              </p>
              {importResult.failures.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {importResult.failures.map((f, i) => (
                    <li key={i}>{t('marksEntry.rowError', { row: f.row, attribute: f.attribute })} {f.errors.join(' ')}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
