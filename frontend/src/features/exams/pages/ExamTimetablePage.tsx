import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Save } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { examsApi } from '@/api/endpoints/exams'
import { sectionsApi } from '@/api/endpoints/academics'
import { studentsApi } from '@/api/endpoints/students'
import { queryKeys } from '@/api/queryKeys'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, Card, CardContent, EmptyState, FormField, Select, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import type { ExamTimetableItemInput } from '@/types/exam'
import type { ApiError } from '@/api/client'
import '../i18n'

/** exam_subject_id -> the row's currently-edited (not yet saved) date/start/end. */
type DraftRows = Record<number, { exam_date: string; start_time: string; end_time: string }>

export function ExamTimetablePage() {
  const { t } = useFeatureTranslation('exams')
  const { hasRole } = usePermission()
  const queryClient = useQueryClient()
  const isStudent = hasRole('Student')

  const [examId, setExamId] = useState<number | null>(null)
  const [sectionId, setSectionId] = useState<number | null>(null)
  const [draft, setDraft] = useState<DraftRows>({})

  // No dedicated "my student record" endpoint — Student::scopeVisibleTo()
  // already restricts this list to exactly the caller's own row when logged
  // in as Student, same idiom as MyResultsPage.
  const { data: ownStudents, isLoading: ownStudentLoading } = useQuery({
    queryKey: queryKeys.students({ per_page: 1 }),
    queryFn: () => studentsApi.list({ per_page: 1 }),
    enabled: isStudent,
  })
  const studentId = ownStudents?.data[0]?.id ?? null

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: queryKeys.exams({ per_page: 100 }),
    queryFn: () => examsApi.list({ per_page: 100 }),
  })

  const { data: sections } = useQuery({
    queryKey: queryKeys.sections({ per_page: 100 }),
    queryFn: () => sectionsApi.list({ per_page: 100 }),
    enabled: !isStudent,
  })

  useEffect(() => {
    if (examId === null && exams?.data?.length) setExamId(exams.data[0].id)
  }, [examId, exams])

  useEffect(() => {
    if (!isStudent && sectionId === null && sections?.data?.length) setSectionId(sections.data[0].id)
  }, [isStudent, sectionId, sections])

  const timetableParams = isStudent ? (studentId ? { studentId } : undefined) : sectionId ? { sectionId } : undefined
  const { data: timetable, isLoading: timetableLoading } = useQuery({
    queryKey: queryKeys.examTimetable(examId ?? 0, timetableParams ?? {}),
    queryFn: () => examsApi.timetable(examId!, timetableParams!),
    enabled: !!examId && !!timetableParams,
  })

  useEffect(() => {
    if (!timetable) return
    const next: DraftRows = {}
    for (const row of timetable.rows) {
      next[row.exam_subject_id] = { exam_date: row.exam_date ?? '', start_time: row.start_time?.slice(0, 5) ?? '', end_time: row.end_time?.slice(0, 5) ?? '' }
    }
    setDraft(next)
  }, [timetable])

  const saveMutation = useMutation({
    mutationFn: () => {
      const items: ExamTimetableItemInput[] = Object.entries(draft).map(([id, values]) => ({
        exam_subject_id: Number(id),
        exam_date: values.exam_date || null,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
      }))
      return examsApi.saveTimetable(examId!, sectionId!, items)
    },
    onSuccess: () => {
      toast.success(t('timetable.savedToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.examTimetable(examId ?? 0, timetableParams ?? {}) })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  function updateDraft(examSubjectId: number, field: 'exam_date' | 'start_time' | 'end_time', value: string) {
    setDraft((prev) => ({ ...prev, [examSubjectId]: { ...prev[examSubjectId], [field]: value } }))
  }

  if (isStudent && ownStudentLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('timetable.title')} description={t('timetable.description')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t('timetable.examLabel')} htmlFor="exam_id">
          <Select
            id="exam_id"
            value={examId ? String(examId) : undefined}
            onValueChange={(v) => setExamId(Number(v))}
            options={(exams?.data ?? []).map((exam) => ({ value: String(exam.id), label: exam.name }))}
            placeholder={examsLoading ? t('common:feedback.loading') : t('timetable.selectExam')}
          />
        </FormField>
        {!isStudent && (
          <FormField label={t('detail.section')} htmlFor="section_id">
            <Select
              id="section_id"
              value={sectionId ? String(sectionId) : undefined}
              onValueChange={(v) => setSectionId(Number(v))}
              options={(sections?.data ?? []).map((s) => ({ value: String(s.id), label: `${s.grade_level?.name ?? ''} - ${s.name}` }))}
            />
          </FormField>
        )}
      </div>

      {timetableLoading && <Skeleton className="h-64 w-full" />}

      {!timetableLoading && timetable && timetable.rows.length === 0 && (
        <EmptyState title={t('detail.noSubjectsYet')} />
      )}

      {!timetableLoading && timetable && timetable.rows.length > 0 && (
        <Card>
          <CardContent className="overflow-x-auto pt-4 sm:pt-6">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{timetable.section.name}</p>
              {timetable.can_edit && (
                <Button size="sm" onClick={() => saveMutation.mutate()} isLoading={saveMutation.isPending}>
                  <Save className="h-3.5 w-3.5" /> {t('timetable.save')}
                </Button>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.columnComponent')}</TableHead>
                  <TableHead>{t('detail.examDate')}</TableHead>
                  <TableHead>{t('timetable.startTime')}</TableHead>
                  <TableHead>{t('timetable.endTime')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timetable.rows.map((row) => {
                  const values = draft[row.exam_subject_id] ?? { exam_date: '', start_time: '', end_time: '' }
                  return (
                    <TableRow key={row.exam_subject_id}>
                      <TableCell className="font-medium">
                        {row.subject_name}
                        {row.component_name && <span className="ml-1 text-xs font-normal text-muted-foreground">({row.component_name})</span>}
                      </TableCell>
                      {timetable.can_edit ? (
                        <>
                          <TableCell>
                            <input
                              type="date"
                              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                              value={values.exam_date}
                              onChange={(e) => updateDraft(row.exam_subject_id, 'exam_date', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                              value={values.start_time}
                              onChange={(e) => updateDraft(row.exam_subject_id, 'start_time', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="time"
                              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                              value={values.end_time}
                              onChange={(e) => updateDraft(row.exam_subject_id, 'end_time', e.target.value)}
                            />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.exam_date ?? t('timetable.dateTBA')}</TableCell>
                          <TableCell>{row.start_time?.slice(0, 5) ?? '—'}</TableCell>
                          <TableCell>{row.end_time?.slice(0, 5) ?? '—'}</TableCell>
                        </>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
