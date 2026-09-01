import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
  FileWarning,
  ClipboardPlus,
  Receipt,
  Megaphone,
  ArrowRight,
} from 'lucide-react'
import { dashboardApi } from '@/api/endpoints/dashboard'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/context/AuthContext'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
// Direct file imports, not the `@/components/ui` barrel — see docs/testing.md's
// Rolldown chunking gotcha. This page (lazy-loaded) was the first place to pull
// CardHeader/CardTitle/CardContent through the barrel, which fully re-exports
// every ui/ component; that new reachability path made Rolldown fold Button.tsx
// and Tooltip.tsx into this page's chunk (Button: 42.84KB → 136.62KB), even
// though dozens of other lazy pages already barrel-import unrelated components
// without issue. Confirmed by bisection: reverting only this import line fixes it.
import { Card, CardContent, CardHeader, CardTitle, StatCard, type StatTone } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { routePaths } from '@/routes/routePaths'
import { CHART_LTR_STYLE, useChartDirection } from '@/hooks/useChartDirection'
import { cn } from '@/utils/cn'
import type { AttendanceSummary } from '@/types/attendance'
import '../i18n'

/**
 * Card.tsx's own StatCard tone classes aren't exported — a local copy for
 * the same "don't add a new export surface to a barrel-reachable file this
 * page is already isolated from" reasoning as the direct-file import above.
 * Must match Card.tsx's solid-tone values exactly.
 */
const STAT_TONE_CLASSES: Record<StatTone, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm shadow-primary/30',
  success: 'bg-success text-success-foreground shadow-sm shadow-success/30',
  warning: 'bg-warning text-warning-foreground shadow-sm shadow-warning/30',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm shadow-destructive/30',
  info: 'bg-info text-info-foreground shadow-sm shadow-info/30',
  violet: 'bg-violet-500 text-white shadow-sm shadow-violet-500/30',
  rose: 'bg-rose-500 text-white shadow-sm shadow-rose-500/30',
  cyan: 'bg-cyan-500 text-white shadow-sm shadow-cyan-500/30',
}

function ViewAllLink({ to }: { to: string }) {
  const { t } = useFeatureTranslation('dashboard')
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
      {t('page.viewAll')} <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  )
}

/**
 * A StatCard that becomes a link when `to` is given (only ever passed when
 * the viewer actually holds the permission that destination requires — see
 * every call site below). Without this, a stat card was just decorative
 * chrome even where a natural drill-down existed.
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

const QUICK_ACTION_TONE_CLASSES: Record<StatTone, string> = {
  primary: 'bg-primary/15 text-primary',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  destructive: 'bg-destructive/15 text-destructive',
  info: 'bg-info/15 text-info',
  violet: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  rose: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
  cyan: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
}

function QuickAction({ to, icon, label, tone = 'primary' }: { to: string; icon: ReactNode; label: string; tone?: StatTone }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <span className={cn('rounded-full p-2.5', QUICK_ACTION_TONE_CLASSES[tone])}>{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  )
}

/**
 * Trend/chart data lives behind its own endpoint (see dashboardApi.trends'
 * docblock) — a page that only needs the snapshot numbers never pays for
 * the date-range scans this computes. Only fetched once the summary query
 * has told us this viewer is on the staff dashboard, the only role that
 * renders any of it.
 */
function useDashboardTrends(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboardTrends,
    queryFn: dashboardApi.trends,
    enabled,
  })
}

export function DashboardPage() {
  const { t } = useFeatureTranslation('dashboard')
  const { user } = useAuth()
  const { can } = usePermission()
  const chartDir = useChartDirection()
  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.dashboardSummary,
    queryFn: dashboardApi.summary,
  })
  const { data: trends } = useDashboardTrends(summary?.role_context === 'staff')

  const attendancePoints = (trends?.attendance_trend ?? []).map((point) => ({
    label: formatDate(point.date, 'MMM d'),
    percentage: point.total_count > 0 ? Math.round((point.present_count / point.total_count) * 100) : null,
  }))
  const feePoints = (trends?.fee_collection_trend ?? []).map((point) => ({
    label: formatDate(`${point.month}-01`, 'MMM'),
    amount: point.total,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">{t('page.welcomeBack', { name: user?.first_name })}</h1>
        <p className="text-sm text-muted-foreground">{t('page.subtitle')}</p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
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
        <>
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
              to={can('student-attendance.mark') ? routePaths.attendanceTake : undefined}
              tone="success"
            />
            {summary.pending_leave_requests_count != null && (
              <DashboardStatCard
                label={t('page.stats.pendingLeaveRequests')}
                value={String(summary.pending_leave_requests_count)}
                icon={<ClipboardList className="h-5 w-5" />}
                to={can('leave.manage') ? routePaths.leaveRequests : undefined}
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
            {summary.outstanding_fees_total != null && (
              <DashboardStatCard
                label={t('page.stats.outstandingFees')}
                value={formatCurrency(summary.outstanding_fees_total as number)}
                icon={<FileWarning className="h-5 w-5" />}
                to={can('invoices.view') ? routePaths.invoices : undefined}
                tone="destructive"
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

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('page.quickActionsTitle')}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {can('student-attendance.mark') && (
                <QuickAction to={routePaths.attendanceTake} icon={<CalendarCheck className="h-4 w-4" />} label={t('page.quickActions.takeAttendance')} tone="success" />
              )}
              {can('students.create') && (
                <QuickAction to={routePaths.studentAdmission} icon={<ClipboardPlus className="h-4 w-4" />} label={t('page.quickActions.newAdmission')} tone="primary" />
              )}
              {can('invoices.create') && (
                <QuickAction to={routePaths.invoices} icon={<Receipt className="h-4 w-4" />} label={t('page.quickActions.createInvoice')} tone="warning" />
              )}
              {can('notice-board.create') && (
                <QuickAction to={routePaths.noticeBoard} icon={<Megaphone className="h-4 w-4" />} label={t('page.quickActions.postAnnouncement')} tone="violet" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {trends?.attendance_trend && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('page.trends.attendanceTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={220}>
                    <LineChart data={attendancePoints}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} {...chartDir.horizontalAxisProps} />
                      <YAxis domain={[0, 100]} fontSize={12} tickLine={false} axisLine={false} width={32} orientation={chartDir.startOrientation} />
                      <Tooltip formatter={(value) => [value == null ? '—' : `${value}%`, t('page.trends.attendanceTitle')]} />
                      <Line type="monotone" dataKey="percentage" stroke="var(--color-primary)" strokeWidth={2} dot={false} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {trends?.fee_collection_trend && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('page.trends.feesTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={220}>
                    <BarChart data={feePoints}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} {...chartDir.horizontalAxisProps} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} width={40} orientation={chartDir.startOrientation} />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), t('page.trends.feesTooltipLabel')]} />
                      <Bar dataKey="amount" fill="var(--color-success)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {trends?.enrollment_trend && trends.enrollment_trend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('page.trends.enrollmentTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={200}>
                    <LineChart data={trends.enrollment_trend}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} {...chartDir.horizontalAxisProps} />
                      <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={28} orientation={chartDir.startOrientation} />
                      <Tooltip formatter={(value) => [value, t('page.trends.enrollmentTitle')]} />
                      <Line type="monotone" dataKey="count" stroke="var(--color-info)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {trends?.grade_distribution && trends.grade_distribution.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('page.trends.gradeDistributionTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: Math.max(320, trends.grade_distribution.length * 70) }}>
                      <ResponsiveContainer style={CHART_LTR_STYLE} width="100%" height={240}>
                        <BarChart data={trends.grade_distribution}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                          <XAxis dataKey="grade_level" fontSize={12} tickLine={false} axisLine={false} {...chartDir.horizontalAxisProps} />
                          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={28} orientation={chartDir.startOrientation} />
                          <Tooltip formatter={(value) => [value, t('page.stats.activeStudents')]} />
                          <Bar dataKey="count" fill="var(--color-violet-500)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {summary.upcoming_exams && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t('page.stats.upcomingExams')}</CardTitle>
                  <ViewAllLink to={routePaths.exams} />
                </CardHeader>
                <CardContent>
                  {summary.upcoming_exams.length === 0 ? (
                    <EmptyState title={t('page.noUpcomingExams')} icon={<ClipboardList className="h-5 w-5" />} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {summary.upcoming_exams.map((exam) => (
                        <li key={exam.id}>
                          <Link to={routePaths.examDetail(exam.id)} className="flex items-center justify-between gap-2 text-sm hover:text-primary">
                            <span className="font-medium">{exam.name}</span>
                            <span className="text-muted-foreground">{formatDate(exam.date)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {can('notice-board.view') && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t('page.recentAnnouncements')}</CardTitle>
                  <ViewAllLink to={routePaths.noticeBoard} />
                </CardHeader>
                <CardContent>
                  {!summary.recent_announcements || summary.recent_announcements.length === 0 ? (
                    <EmptyState title={t('page.noAnnouncements')} icon={<Megaphone className="h-5 w-5" />} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {summary.recent_announcements.map((announcement) => (
                        <li key={announcement.id}>
                          <Link to={routePaths.noticeBoard} className="flex items-center justify-between gap-2 text-sm hover:text-primary">
                            <span className="font-medium">{announcement.title}</span>
                            <span className="text-muted-foreground">{formatDate(announcement.sent_at)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}

            {summary.pending_leave_requests && (
              <Card>
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle>{t('page.stats.pendingLeaveRequests')}</CardTitle>
                  <ViewAllLink to={routePaths.leaveRequests} />
                </CardHeader>
                <CardContent>
                  {summary.pending_leave_requests.length === 0 ? (
                    <EmptyState title={t('page.noPendingLeave')} icon={<ClipboardList className="h-5 w-5" />} />
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {summary.pending_leave_requests.map((leave) => (
                        <li key={leave.id}>
                          <Link to={routePaths.leaveRequests} className="flex items-center justify-between gap-2 text-sm hover:text-primary">
                            <span className="font-medium">{leave.staff_name}</span>
                            <span className="text-muted-foreground">
                              {formatDate(leave.from)} – {formatDate(leave.to)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </>
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
            to={can('student-attendance.mark') ? routePaths.attendanceTake : undefined}
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
              <StatCard label={t('fields.daysMarked')} value={String((summary.attendance_this_month as AttendanceSummary).total_marked)} tone="cyan" />
              <StatCard label={t('fields.absences')} value={String((summary.attendance_this_month as AttendanceSummary).counts.absent)} tone="destructive" />
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
