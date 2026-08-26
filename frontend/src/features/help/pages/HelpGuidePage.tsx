import type { ReactNode } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle, Tabs, Badge } from '@/components/ui'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import type { TFunction } from 'i18next'
import '../i18n'

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{n}</span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </li>
  )
}

function Phase({ title, blocked, t, children }: { title: string; blocked?: string; t: TFunction; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          {blocked && <Badge variant="warning">{t('requires', { phase: blocked })}</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">{children}</ol>
      </CardContent>
    </Card>
  )
}

function GettingStartedTab({ t }: { t: TFunction }) {
  const p1 = 'gettingStarted.phase1.steps'
  const p2 = 'gettingStarted.phase2.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('gettingStarted.phase1.title')} t={t}>
        <Step n={1} title={t(`${p1}.academicYear.title`)}>{t(`${p1}.academicYear.description`)}</Step>
        <Step n={2} title={t(`${p1}.terms.title`)}>{t(`${p1}.terms.description`)}</Step>
        <Step n={3} title={t(`${p1}.departments.title`)}>{t(`${p1}.departments.description`)}</Step>
        <Step n={4} title={t(`${p1}.gradeLevels.title`)}>{t(`${p1}.gradeLevels.description`)}</Step>
        <Step n={5} title={t(`${p1}.rooms.title`)}>{t(`${p1}.rooms.description`)}</Step>
        <Step n={6} title={t(`${p1}.sections.title`)}>
          {t(`${p1}.sections.description`)} <strong>{t(`${p1}.sections.bold`)}</strong>
        </Step>
        <Step n={7} title={t(`${p1}.subjects.title`)}>{t(`${p1}.subjects.description`)}</Step>
        <Step n={8} title={t(`${p1}.timetablePeriods.title`)}>{t(`${p1}.timetablePeriods.description`)}</Step>
      </Phase>

      <Phase title={t('gettingStarted.phase2.title')} blocked={t('gettingStarted.phase2.blocked')} t={t}>
        <Step n={1} title={t(`${p2}.inviteStaff.title`)}>{t(`${p2}.inviteStaff.description`)}</Step>
        <Step n={2} title={t(`${p2}.designations.title`)}>{t(`${p2}.designations.description`)}</Step>
        <Step n={3} title={t(`${p2}.classTeachers.title`)}>{t(`${p2}.classTeachers.description`)}</Step>
      </Phase>
    </div>
  )
}

function ClassesTab({ t }: { t: TFunction }) {
  const p3 = 'classes.phase3.steps'
  const p4 = 'classes.phase4.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('classes.phase3.title')} blocked={t('classes.phase3.blocked')} t={t}>
        <Step n={1} title={t(`${p3}.assignments.title`)}>{t(`${p3}.assignments.description`)}</Step>
        <Step n={2} title={t(`${p3}.timetableEntries.title`)}>{t(`${p3}.timetableEntries.description`)}</Step>
      </Phase>

      <Phase title={t('classes.phase4.title')} blocked={t('classes.phase4.blocked')} t={t}>
        <Step n={1} title={t(`${p4}.admitStudents.title`)}>{t(`${p4}.admitStudents.description`)}</Step>
        <Step n={2} title={t(`${p4}.addGuardians.title`)}>{t(`${p4}.addGuardians.description`)}</Step>
      </Phase>
    </div>
  )
}

function OperationsTab({ t }: { t: TFunction }) {
  const p5 = 'operations.phase5.steps'
  const p6 = 'operations.phase6.steps'
  const p7 = 'operations.phase7.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('operations.phase5.title')} t={t}>
        <Step n={1} title={t(`${p5}.nothingToConfigure.title`)}>{t(`${p5}.nothingToConfigure.description`)}</Step>
      </Phase>

      <Phase title={t('operations.phase6.title')} blocked={t('operations.phase6.blocked')} t={t}>
        <Step n={1} title={t(`${p6}.gradingScale.title`)}>{t(`${p6}.gradingScale.description`)}</Step>
        <Step n={2} title={t(`${p6}.exams.title`)}>{t(`${p6}.exams.description`)}</Step>
        <Step n={3} title={t(`${p6}.examSubjects.title`)}>{t(`${p6}.examSubjects.description`)}</Step>
        <Step n={4} title={t(`${p6}.enterPublishMarks.title`)}>{t(`${p6}.enterPublishMarks.description`)}</Step>
      </Phase>

      <Phase title={t('operations.phase7.title')} blocked={t('operations.phase7.blocked')} t={t}>
        <Step n={1} title={t(`${p7}.createHomework.title`)}>{t(`${p7}.createHomework.description`)}</Step>
      </Phase>
    </div>
  )
}

function FeesTab({ t }: { t: TFunction }) {
  const p8 = 'fees.phase8.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('fees.phase8.title')} t={t}>
        <Step n={1} title={t(`${p8}.feeCategories.title`)}>{t(`${p8}.feeCategories.description`)}</Step>
        <Step n={2} title={t(`${p8}.feeStructures.title`)}>{t(`${p8}.feeStructures.description`)}</Step>
        <Step n={3} title={t(`${p8}.feeAssignments.title`)}>
          {t(`${p8}.feeAssignments.description`)} <strong>{t(`${p8}.feeAssignments.bold`)}</strong> {t(`${p8}.feeAssignments.suffix`)}
        </Step>
        <Step n={4} title={t(`${p8}.invoices.title`)}>{t(`${p8}.invoices.description`)}</Step>
        <Step n={5} title={t(`${p8}.payments.title`)}>{t(`${p8}.payments.description`)}</Step>
      </Phase>
    </div>
  )
}

function OtherModulesTab({ t }: { t: TFunction }) {
  const p9 = 'modules.phase9.steps'
  const p10 = 'modules.phase10.steps'
  const p11 = 'modules.phase11.steps'
  const p12 = 'modules.phase12.steps'
  const p13 = 'modules.phase13.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('modules.phase9.title')} t={t}>
        <Step n={1} title={t(`${p9}.addBooks.title`)}>{t(`${p9}.addBooks.description`)}</Step>
        <Step n={2} title={t(`${p9}.issueReturn.title`)}>{t(`${p9}.issueReturn.description`)}</Step>
      </Phase>

      <Phase title={t('modules.phase10.title')} t={t}>
        <Step n={1} title={t(`${p10}.vehiclesRoutes.title`)}>{t(`${p10}.vehiclesRoutes.description`)}</Step>
        <Step n={2} title={t(`${p10}.studentAssignments.title`)}>{t(`${p10}.studentAssignments.description`)}</Step>
      </Phase>

      <Phase title={t('modules.phase11.title')} t={t}>
        <Step n={1} title={t(`${p11}.hostels.title`)}>{t(`${p11}.hostels.description`)}</Step>
        <Step n={2} title={t(`${p11}.rooms.title`)}>{t(`${p11}.rooms.description`)}</Step>
        <Step n={3} title={t(`${p11}.allocations.title`)}>{t(`${p11}.allocations.description`)}</Step>
      </Phase>

      <Phase title={t('modules.phase12.title')} blocked={t('modules.phase12.blocked')} t={t}>
        <Step n={1} title={t(`${p12}.salaryStructures.title`)}>{t(`${p12}.salaryStructures.description`)}</Step>
        <Step n={2} title={t(`${p12}.payslips.title`)}>{t(`${p12}.payslips.description`)}</Step>
        <Step n={3} title={t(`${p12}.leaveTypes.title`)}>{t(`${p12}.leaveTypes.description`)}</Step>
      </Phase>

      <Phase title={t('modules.phase13.title')} t={t}>
        <Step n={1} title={t(`${p13}.templates.title`)}>
          {t(`${p13}.templates.description`)}{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{student_name}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{admission_number}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{grade_level}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{section}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{school_name}}'}</code>,{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{date}}'}</code>.
        </Step>
        <Step n={2} title={t(`${p13}.issue.title`)}>{t(`${p13}.issue.description`)}</Step>
      </Phase>
    </div>
  )
}

function CommunicationTab({ t }: { t: TFunction }) {
  const p14 = 'communication.phase14.steps'
  return (
    <div className="flex flex-col gap-4">
      <Phase title={t('communication.phase14.title')} t={t}>
        <Step n={1} title={t(`${p14}.noticeBoard.title`)}>{t(`${p14}.noticeBoard.description`)}</Step>
        <Step n={2} title={t(`${p14}.announcements.title`)}>{t(`${p14}.announcements.description`)}</Step>
        <Step n={3} title={t(`${p14}.studentRemarks.title`)}>{t(`${p14}.studentRemarks.description`)}</Step>
      </Phase>
    </div>
  )
}

const ROLE_KEYS = [
  'schoolAdmin',
  'principal',
  'management',
  'accountant',
  'hrStaff',
  'receptionist',
  'teacher',
  'classTeacher',
  'librarian',
  'transportStaff',
  'student',
  'parent',
] as const

function RolesTab({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('roles.intro')}</p>
      <Card>
        <CardContent className="overflow-x-auto pt-4 sm:pt-6">
          <table className="w-full text-start text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pe-4">{t('roles.columnRole')}</th>
                <th className="py-2 pe-4">{t('roles.columnUse')}</th>
                <th className="py-2">{t('roles.columnAccess')}</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_KEYS.map((key) => (
                <tr key={key} className="border-b border-border last:border-0">
                  <td className="py-2 pe-4 font-medium">{t(`roles.rows.${key}.role`)}</td>
                  <td className="py-2 pe-4 text-muted-foreground">{t(`roles.rows.${key}.use`)}</td>
                  <td className="py-2 text-muted-foreground">{t(`roles.rows.${key}.access`)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

const FAQ_KEYS = ['tooManyAttempts', 'emptyDropdown', 'discountNotShowing', 'recordDisappeared'] as const

function FaqTab({ t }: { t: TFunction }) {
  return (
    <div className="flex flex-col gap-4">
      {FAQ_KEYS.map((key) => (
        <Card key={key}>
          <CardContent className="flex gap-3 pt-4 sm:pt-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{t(`faq.items.${key}.q`)}</p>
              <p className="text-sm text-muted-foreground">{t(`faq.items.${key}.a`)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function HelpGuidePage() {
  const { t } = useFeatureTranslation('help')

  return (
    <div>
      <PageHeader title={t('page.title')} description={t('page.description')} />

      <Tabs
        items={[
          { value: 'start', label: t('tabs.start'), content: <GettingStartedTab t={t} /> },
          { value: 'classes', label: t('tabs.classes'), content: <ClassesTab t={t} /> },
          { value: 'operations', label: t('tabs.operations'), content: <OperationsTab t={t} /> },
          { value: 'fees', label: t('tabs.fees'), content: <FeesTab t={t} /> },
          { value: 'modules', label: t('tabs.modules'), content: <OtherModulesTab t={t} /> },
          { value: 'communication', label: t('tabs.communication'), content: <CommunicationTab t={t} /> },
          { value: 'roles', label: t('tabs.roles'), content: <RolesTab t={t} /> },
          { value: 'faq', label: t('tabs.faq'), content: <FaqTab t={t} /> },
        ]}
      />

      <p className="mt-8 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ArrowRight className="h-3 w-3" />
        {t('page.footer')}
      </p>
    </div>
  )
}
