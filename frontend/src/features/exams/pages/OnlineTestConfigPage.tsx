import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFieldArray, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import { examsApi, onlineTestsApi, questionsApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Button, Checkbox, ConfirmDialog, FormField, Input, Modal, Select, Skeleton,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import { QUESTION_TYPES, getQuestionTypeLabels } from '@/types/exam'
import type { Question, QuestionImportResult, QuestionOptionInput, QuestionPayload } from '@/types/exam'
import { formatApiError, type ApiError } from '@/api/client'
import '../i18n'

const EMPTY_OPTIONS: QuestionOptionInput[] = [
  { option_text: '', is_correct: true },
  { option_text: '', is_correct: false },
]

export function OnlineTestConfigPage() {
  const { t } = useFeatureTranslation('exams')
  const { examId, examSubjectId } = useParams<{ examId: string; examSubjectId: string }>()
  const examSubjectIdNum = Number(examSubjectId)
  const { can } = usePermission()
  const queryClient = useQueryClient()

  const { data: exam } = useQuery({ queryKey: queryKeys.exam(Number(examId)), queryFn: () => examsApi.get(Number(examId)) })
  // The component (what the test is configured on) and its parent group
  // (what subject/section it's under) — see ExamSubjectGroup in types/exam.ts.
  const group = exam?.exam_subject_groups.find((g) => g.components.some((c) => c.id === examSubjectIdNum))
  const examSubject = group?.components.find((c) => c.id === examSubjectIdNum)
  const subjectId = group?.subject?.id

  // Scoped to THIS test, not the subject at large — a question only shows up
  // here once it's been created or imported directly into this test (see
  // QuestionController::attachToTest / McqQuestionsImport's optional
  // exam-subject attach). There's no shared question bank to browse anymore:
  // a brand-new test starts with an empty list until you import or add one.
  const questionsQuery = useQuery({
    queryKey: queryKeys.onlineTestQuestions(examSubjectIdNum),
    queryFn: () => onlineTestsApi.questions(examSubjectIdNum),
    enabled: Number.isFinite(examSubjectIdNum),
  })
  const questions = questionsQuery.data ?? []

  function invalidateQuestions() {
    queryClient.invalidateQueries({ queryKey: queryKeys.onlineTestQuestions(examSubjectIdNum) })
  }

  const createMutation = useMutation({
    mutationFn: (payload: QuestionPayload) => questionsApi.create(payload),
    onSuccess: () => { toast.success(t('onlineTestConfig.questionCreatedToast')); invalidateQuestions() },
    onError: (error) => toast.error(formatApiError(error as ApiError)),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<QuestionPayload> }) => questionsApi.update(id, payload),
    onSuccess: () => { toast.success(t('onlineTestConfig.questionUpdatedToast')); invalidateQuestions() },
    onError: (error) => toast.error(formatApiError(error as ApiError)),
  })
  const removeMutation = useMutation({
    mutationFn: (id: number) => questionsApi.remove(id),
    onSuccess: () => { toast.success(t('onlineTestConfig.questionDeletedToast')); invalidateQuestions() },
    onError: (error) => toast.error(formatApiError(error as ApiError)),
  })

  // ---- Question CRUD ----
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Question | null>(null)
  const [deleting, setDeleting] = useState<Question | null>(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<QuestionPayload>({
    defaultValues: { type: 'mcq', text: '', default_marks: 1, negative_marks: null, options: EMPTY_OPTIONS },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'options' })
  const type = watch('type')

  function openCreate() {
    setEditing(null)
    reset({ type: 'mcq', text: '', default_marks: 1, negative_marks: null, subject_id: subjectId, options: EMPTY_OPTIONS })
    setModalOpen(true)
  }

  function openEdit(question: Question) {
    setEditing(question)
    reset({
      subject_id: question.subject?.id ?? subjectId,
      type: question.type,
      text: question.text,
      default_marks: question.default_marks,
      negative_marks: question.negative_marks,
      explanation: question.explanation,
      options: question.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct })),
    })
    setModalOpen(true)
  }

  function switchType(nextType: 'mcq' | 'true_false') {
    setValue('type', nextType)
    if (nextType === 'true_false') {
      setValue('options', [
        { option_text: 'True', is_correct: true },
        { option_text: 'False', is_correct: false },
      ])
    }
  }

  function setCorrectOption(index: number) {
    fields.forEach((_, i) => setValue(`options.${i}.is_correct`, i === index))
  }

  async function onSubmitQuestion(values: QuestionPayload) {
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: values })
      else await createMutation.mutateAsync({ ...values, subject_id: subjectId, exam_subject_id: examSubjectIdNum })
      setModalOpen(false)
    } catch {
      toast.error(t('onlineTestConfig.validationErrorToast'))
    }
  }

  // ---- Excel import — attaches straight into this test, not a subject-wide bank ----
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importResult, setImportResult] = useState<QuestionImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = useMutation({
    mutationFn: (file: File) => questionsApi.import(file, subjectId!, examSubjectIdNum),
    onSuccess: (result) => {
      setImportResult(result)
      invalidateQuestions()
      if (result.failed_count === 0) toast.success(t('onlineTestConfig.importSuccessToast', { count: result.imported_count }))
      else toast.warning(t('onlineTestConfig.importPartialToast', { imported: result.imported_count, failed: result.failed_count }))
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
        title={t('onlineTestConfig.title', { subject: group?.subject?.name })}
        description={t('onlineTestConfig.description', { exam: exam.name, section: group?.section?.name })}
        breadcrumbs={[{ label: t('onlineTestConfig.breadcrumbExams'), to: routePaths.exams }, { label: exam.name, to: routePaths.examDetail(exam.id) }, { label: group?.subject?.name ?? '' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            {can('questions.import') && (
              <Button variant="outline" onClick={() => { setImportResult(null); setImportModalOpen(true) }}>
                <Download className="h-4 w-4" /> {t('onlineTestConfig.importFromExcel')}
              </Button>
            )}
            {can('questions.create') && (
              <Button variant="outline" onClick={openCreate}>
                <Plus className="h-4 w-4" /> {t('onlineTestConfig.newQuestion')}
              </Button>
            )}
          </div>
        }
      />

      {questionsQuery.isLoading && <Skeleton className="h-64 w-full" />}

      {!questionsQuery.isLoading && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('onlineTestConfig.columnQuestion')}</TableHead>
              <TableHead>{t('onlineTestConfig.columnType')}</TableHead>
              <TableHead>{t('onlineTestConfig.columnMarks')}</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id}>
                <TableCell className="max-w-md">
                  <span className="line-clamp-2">{question.text}</span>
                </TableCell>
                <TableCell>{getQuestionTypeLabels(t)[question.type]}</TableCell>
                <TableCell>{question.default_marks}</TableCell>
                <TableCell className="text-end">
                  <div className="flex justify-end gap-2">
                    {can('questions.edit') && <Button variant="outline" size="sm" onClick={() => openEdit(question)}>{t('fields.edit')}</Button>}
                    {can('questions.delete') && (
                      <Button variant="outline" size="sm" onClick={() => setDeleting(question)} aria-label={t('onlineTestConfig.deleteQuestionAria')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {questions.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">{t('onlineTestConfig.noQuestionsYet')}</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('onlineTestConfig.modalTitleEdit') : t('onlineTestConfig.modalTitleCreate')} size="lg">
        <form onSubmit={handleSubmit(onSubmitQuestion)} className="flex flex-col gap-4" noValidate>
          <FormField label={t('onlineTestConfig.type')} htmlFor="type" required>
            <Select
              id="type"
              value={type}
              onValueChange={(value) => switchType(value as 'mcq' | 'true_false')}
              options={QUESTION_TYPES.map((qt) => ({ value: qt, label: getQuestionTypeLabels(t)[qt] }))}
            />
          </FormField>
          <FormField label={t('onlineTestConfig.questionText')} htmlFor="text" required error={errors.text?.message}>
            <Textarea id="text" required {...register('text', { required: t('gradingScales.requiredError') })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('onlineTestConfig.defaultMarks')} htmlFor="default_marks" required>
              <Input id="default_marks" type="number" step="0.01" min="0.01" {...register('default_marks', { valueAsNumber: true, required: true, min: 0.01 })} />
            </FormField>
            <FormField label={t('onlineTestConfig.negativeMarks')} htmlFor="negative_marks" hint={t('onlineTestConfig.negativeMarksHint')}>
              <Input id="negative_marks" type="number" step="0.01" min="0" {...register('negative_marks', { valueAsNumber: true, min: 0 })} />
            </FormField>
          </div>
          <FormField label={t('onlineTestConfig.explanation')} htmlFor="explanation" hint={t('onlineTestConfig.explanationHint')}>
            <Textarea id="explanation" {...register('explanation')} />
          </FormField>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t('onlineTestConfig.optionsHeading')}</h3>
              {type === 'mcq' && (
                <Button type="button" variant="outline" size="sm" onClick={() => append({ option_text: '', is_correct: false })}>
                  <Plus className="h-3.5 w-3.5" /> {t('onlineTestConfig.addOption')}
                </Button>
              )}
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <Checkbox checked={watch(`options.${index}.is_correct`)} onCheckedChange={() => setCorrectOption(index)} aria-label={t('onlineTestConfig.markOptionCorrectAria', { index: index + 1 })} />
                <Input
                  className="flex-1"
                  placeholder={t('onlineTestConfig.optionPlaceholder', { index: index + 1 })}
                  disabled={type === 'true_false'}
                  {...register(`options.${index}.option_text`, { required: true })}
                />
                {type === 'mcq' && (
                  <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} disabled={fields.length <= 2} aria-label={t('onlineTestConfig.removeOptionAria')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-xs text-muted-foreground">{t('onlineTestConfig.correctOptionHint')}</p>
          </div>

          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('onlineTestConfig.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('onlineTestConfig.deleteConfirmTitle')}
        description={t('onlineTestConfig.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />

      <Modal open={importModalOpen} onOpenChange={setImportModalOpen} title={t('onlineTestConfig.importModalTitle', { subject: group?.subject?.name })}>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {t('onlineTestConfig.importColumnsDescription')}{' '}
            <a href={questionsApi.importTemplateUrl()} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
              <FileSpreadsheet className="h-3.5 w-3.5" /> {t('onlineTestConfig.downloadTemplate')}
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
            <Download className="h-4 w-4" /> {t('onlineTestConfig.chooseFileToImport')}
          </Button>

          {importResult && (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm">
              <p>
                <span className="font-medium text-success">{t('onlineTestConfig.importedCount', { count: importResult.imported_count })}</span>
                {importResult.failed_count > 0 && <span className="text-destructive"> · {t('onlineTestConfig.failedCount', { count: importResult.failed_count })}</span>}
              </p>
              {importResult.failures.length > 0 && (
                <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {importResult.failures.map((f, i) => (
                    <li key={i}>{t('onlineTestConfig.rowError', { row: f.row, attribute: f.attribute })} {f.errors.join(' ')}</li>
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
