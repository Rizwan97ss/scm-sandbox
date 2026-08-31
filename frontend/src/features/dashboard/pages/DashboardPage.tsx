import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  GraduationCap,
  Users,
  School,
  CalendarCheck,
  ClipboardList,
  Wallet,
  BookOpen,
  NotebookPen,
  Building2,
  UserPlus,
  Receipt,
} from 'lucide-react'
import { dashboardApi } from '@/api/endpoints/dashboard'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { CHART_LTR_STYLE, useChartDirection } from '@/hooks/useChartDirection'
// Direct file imports, not the `@/components/ui` barrel — see docs/testing.md's
// Rolldown chunking gotcha. This page (lazy-loaded) was the first place to pull
// CardHeader/CardTitle/CardContent through the barrel, which fully re-exports
// every ui/ component; that new reachability path made Rolldown fold Button.tsx
// and Tooltip.tsx into this page's chunk (Button: 42.84KB → 136.62KB), even
// though dozens of other lazy pages already barrel-import unrelated components
// without issue. Confirmed by bisection: reverting only this import line fixes it.
import { Card, CardContent, CardHeader, CardTitle, StatCard, STAT_TONE_CLASSES, type StatTone } from '@/components/ui/Card'
import { cn } from '@/utils/cn'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { routePaths } from '@/routes/routePaths'
import type { AttendanceSummary } from '@/types/attendance'
import '../i18n'

/**
 * A StatCard that becomes a link when `to` is given. Deliberately not added
 * as a `to` prop on the shared `StatCard` itself (components/ui/Card.tsx) —
 * that file is barrel-exported and reachable from dozens of other lazy
 * pages; giving it a new `react-router-dom` dependency shifted Rolldown's
 * chunking enough to fold Button.tsx/Tooltip.tsx into unrelated chunks (see
 * the import-comment below). Duplicating StatCard's small render here keeps
 * that risk contained to this one already-isolated page.
 */
function DashboardStatCard({
  label,
  value,
  icon,
  to,
  tone = 'primary',
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  to?: string
  tone?: StatTone
}) {
  if (!to) return <StatCard label={label} value={value} icon={icon} tone={tone} />

  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
    >
      <CardContent className="flex items-center justify-between gap-4 pt-4 sm:pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold">{value}</span>
        </div>
        {icon && <div className={cn('rounded-full p-3', STAT_TONE_CLASSES[tone])}>{icon}</div>}
      </CardContent>
    </Link>
  )
}

/** Same isolation reasoning as DashboardStatCard above — a plain Link styled
 * to match Button's "outline" variant, instead of importing LinkButton
 * (which itself imports Button.tsx's buttonClasses). */
function QuickActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border bg-transparent px-4 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      {children}
    </Link>
  )
}

function DashboardTrends() {
  const { t } = useFeatureTranslation('dashboard')
  const chartDir = useChartDirection()
  const { data: trends } = useQuery({
    queryKey: queryKeys.dashboardTrends,
    queryFn: dashboardApi.trends,
  })

  const attendancePoints = (trends?.attendance_trend ?? []).map((point) => ({
    date: formatDate(point.date, 'MMM d'),
    percentage: point.total_count > 0 ? Math.round((point.present_count / point.total_count) * 100) : null,
  }))

  const feePoints = (trends?.fee_collection_trend ?? []).map((point) => ({
    month: formatDate(`${point.month}-01`, 'MMM'),
    total: point.total,
  }))

  if (!trends?.attendance_trend && !trends?.fee_collection_trend) return null

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {trends.attendance_trend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('page.trends.attendanceTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={220}>
              <LineChart data={attendancePoints}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" fontSize={12} {...chartDir.horizontalAxisProps} />
                <YAxis domain={[0, 100]} fontSize={12} orientation={chartDir.startOrientation} />
                <Tooltip formatter={(value) => [value === null ? '—' : `${value}%`, t('fields.attendance')]} />
                <Line type="monotone" dataKey="percentage" stroke="var(--color-primary)" strokeWidth={2} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {trends.fee_collection_trend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('page.trends.feesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={220}>
              <BarChart data={feePoints}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" fontSize={12} {...chartDir.horizontalAxisProps} />
                <YAxis fontSize={12} orientation={chartDir.startOrientation} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), t('page.trends.feesTooltipLabel')]} />
                <Bar dataKey="total" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuth()
  const { can } = usePermission()
  const { t } = useFeatureTranslation('dashboard')
  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: dashboardApi.summary,
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t('page.welcomeBack', { name: user?.first_name })}</h1>
        <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!isLoading && summary?.role_context === 'super-admin' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label={t('page.stats.totalSchools')} value={String(summary.total_schools ?? 0)} icon={<Building2 className="h-5 w-5" />} tone="primary" />
          <StatCard label={t('page.stats.activeTrialing')} value={String(summary.active_schools ?? 0)} icon={<School className="h-5 w-5" />} tone="success" />
          <StatCard label={t('page.stats.currentlyTrialing')} value={String(summary.trialing_schools ?? 0)} icon={<ClipboardList className="h-5 w-5" />} tone="warning" />
        </div>
      )}

      {!isLoading && summary?.role_context === 'staff' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            label={t('page.stats.activeStudents')}
            value={String(summary.student_count ?? 0)}
            icon={<GraduationCap className="h-5 w-5" />}
            to={can('students.view') ? routePaths.students : undefined}
            tone="primary"
          />
          <DashboardStatCard
            label={t('page.stats.staffMembers')}
            value={String(summary.staff_count ?? 0)}
            icon={<Users className="h-5 w-5" />}
            to={can('users.view') ? routePaths.users : undefined}
            tone="violet"
          />
          <DashboardStatCard
            label={t('page.stats.sections')}
            value={String(summary.section_count ?? 0)}
            icon={<School className="h-5 w-5" />}
            to={can('academic-structure.view') ? routePaths.sections : undefined}
            tone="cyan"
          />
          <DashboardStatCard
            label={t('page.stats.attendanceMarkedToday')}
            value={String(summary.todays_attendance_marked_count ?? 0)}
            icon={<CalendarCheck className="h-5 w-5" />}
            to={routePaths.attendanceTake}
            tone="success"
          />
          {summary.pending_leave_requests_count != null && (
            <DashboardStatCard
              label={t('page.stats.pendingLeaveRequests')}
              value={String(summary.pending_leave_requests_count)}
              icon={<ClipboardList className="h-5 w-5" />}
              to={routePaths.leaveRequests}
              tone="warning"
            />
          )}
          {summary.fee_collected_this_month != null && (
            <DashboardStatCard
              label={t('page.stats.feesCollectedThisMonth')}
              value={formatCurrency(summary.fee_collected_this_month as number)}
              icon={<Wallet className="h-5 w-5" />}
              to={can('invoices.view') ? routePaths.invoices : undefined}
              tone="success"
            />
          )}
          {summary.library_overdue_count != null && (
            <DashboardStatCard
              label={t('page.stats.overdueBooks')}
              value={String(summary.library_overdue_count)}
              icon={<BookOpen className="h-5 w-5" />}
              to={can('library.view') ? routePaths.books : undefined}
              tone="rose"
            />
          )}
        </div>
      )}

      {!isLoading && summary?.role_context === 'teacher' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardStatCard
            label={t('page.stats.assignedSections')}
            value={String(summary.assigned_section_count ?? 0)}
            icon={<School className="h-5 w-5" />}
            to={can('academic-structure.view') ? routePaths.sections : undefined}
            tone="cyan"
          />
          <DashboardStatCard
            label={t('page.stats.students')}
            value={String(summary.student_count ?? 0)}
            icon={<GraduationCap className="h-5 w-5" />}
            to={can('students.view') ? routePaths.students : undefined}
            tone="primary"
          />
          <DashboardStatCard
            label={t('page.stats.attendanceMarkedToday')}
            value={String(summary.todays_attendance_marked_count ?? 0)}
            icon={<CalendarCheck className="h-5 w-5" />}
            to={routePaths.attendanceTake}
            tone="success"
          />
          <DashboardStatCard
            label={t('page.stats.homeworkAwaitingGrading')}
            value={String(summary.pending_homework_grading_count ?? 0)}
            icon={<NotebookPen className="h-5 w-5" />}
            to={can('homework.view') ? routePaths.homework : undefined}
            tone="warning"
          />
        </div>
      )}

      {!isLoading && (summary?.role_context === 'staff' || summary?.role_context === 'teacher') && (
        <div className="flex flex-wrap gap-2">
          {can('student-attendance.mark') && (
            <QuickActionLink to={routePaths.attendanceTake}>
              <CalendarCheck className="h-4 w-4" /> {t('page.quickActions.takeAttendance')}
            </QuickActionLink>
          )}
          {summary.role_context === 'staff' && can('students.create') && (
            <QuickActionLink to={routePaths.studentAdmission}>
              <UserPlus className="h-4 w-4" /> {t('page.quickActions.newAdmission')}
            </QuickActionLink>
          )}
          {summary.role_context === 'staff' && can('invoices.view') && (
            <QuickActionLink to={routePaths.invoices}>
              <Receipt className="h-4 w-4" /> {t('page.quickActions.invoices')}
            </QuickActionLink>
          )}
          {summary.role_context === 'teacher' && can('homework.view') && (
            <QuickActionLink to={routePaths.homework}>
              <NotebookPen className="h-4 w-4" /> {t('fields.homework')}
            </QuickActionLink>
          )}
        </div>
      )}

      {!isLoading && (summary?.role_context === 'staff' || summary?.role_context === 'teacher') && <DashboardTrends />}

      {!isLoading && summary?.role_context === 'student' && (
        <>
          {(summary.attendance_this_month as AttendanceSummary | null) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard
                label={t('page.stats.attendanceThisMonth')}
                value={
                  (summary.attendance_this_month as AttendanceSummary).percentage !== null
                    ? `${(summary.attendance_this_month as AttendanceSummary).percentage}%`
                    : '—'
                }
                icon={<CalendarCheck className="h-5 w-5" />}
                tone="success"
              />
              <StatCard label={t('fields.daysMarked')} value={String((summary.attendance_this_month as AttendanceSummary).total_marked)} />
              <StatCard label={t('fields.absences')} value={String((summary.attendance_this_month as AttendanceSummary).counts.absent)} />
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DashboardStatCard
              label={t('page.stats.homeworkDue')}
              value={String(summary.pending_homework_count ?? 0)}
              icon={<NotebookPen className="h-5 w-5" />}
              to={routePaths.homework}
              tone="warning"
            />
            <DashboardStatCard
              label={t('page.stats.upcomingExams')}
              value={String(summary.upcoming_exam_count ?? 0)}
              icon={<ClipboardList className="h-5 w-5" />}
              to={routePaths.myOnlineTests}
              tone="violet"
            />
          </div>
        </>
      )}

      {!isLoading && summary?.role_context === 'parent' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DashboardStatCard
            label={t('page.stats.linkedChildren')}
            value={String(summary.children_count ?? 0)}
            icon={<GraduationCap className="h-5 w-5" />}
            to={routePaths.parentChildren}
            tone="primary"
          />
          <DashboardStatCard
            label={t('page.stats.outstandingFees')}
            value={formatCurrency((summary.children_pending_fees_total as number) ?? 0)}
            icon={<Wallet className="h-5 w-5" />}
            to={routePaths.invoices}
            tone="destructive"
          />
        </div>
      )}
    </div>
  )
}
