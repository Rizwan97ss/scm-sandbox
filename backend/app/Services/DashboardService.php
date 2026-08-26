<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Models\BookIssue;
use App\Models\ClassSubjectTeacher;
use App\Models\ExamSubject;
use App\Models\Guardian;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Payment;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Role-aware dashboard summary. Phase 0-3 only had identity/academic/student
 * data to report on; each later phase's data slots in here the same way,
 * one optional field at a time — gated by the same permission that module's
 * own pages already require, so a widget never leaks data its role couldn't
 * otherwise see (e.g. fee/library counts on the staff dashboard only appear
 * for a caller who actually holds invoices.view-reports/library.view).
 */
class DashboardService
{
    public function __construct(private readonly AttendanceService $attendance) {}

    public function summaryFor(User $user): array
    {
        if ($user->hasRole('Student')) {
            return $this->studentSummary($user);
        }

        if ($user->hasRole('Parent')) {
            return $this->parentSummary($user);
        }

        if ($user->hasAnyRole(['Teacher', 'Class Teacher'])) {
            return $this->teacherSummary($user);
        }

        return $this->staffSummary($user);
    }

    /**
     * Time-series data for dashboard trend charts — split from summaryFor()
     * because every summary field there is a cheap single aggregate, while
     * these scan a date range; keeping them in a separate, opt-in endpoint
     * means a page that only needs the snapshot numbers never pays for it.
     * Same permission-gated-null pattern as summaryFor(): a field is only
     * populated if the caller holds the permission that field's own report
     * page already requires, so this never leaks data behind an unrelated
     * dashboard widget.
     */
    public function trendsFor(User $user): array
    {
        return [
            'attendance_trend' => $user->can('student-attendance.view') ? $this->attendanceTrend() : null,
            'fee_collection_trend' => $user->can('invoices.view-reports') ? $this->feeCollectionTrend() : null,
        ];
    }

    private function attendanceTrend(): array
    {
        $start = now()->subDays(13)->startOfDay();

        $rows = StudentAttendance::query()
            ->whereNull('timetable_period_id')
            ->where('date', '>=', $start)
            ->selectRaw('date, status, count(*) as count')
            ->groupBy('date', 'status')
            ->get()
            ->groupBy(fn ($row) => $row->date->toDateString());

        $days = [];
        for ($i = 13; $i >= 0; $i--) {
            $date = now()->subDays($i)->toDateString();
            $dayRows = $rows->get($date, collect());
            $presentCount = (int) $dayRows->firstWhere('status', AttendanceStatus::Present)?->count;
            $totalCount = (int) $dayRows->sum('count');

            $days[] = [
                'date' => $date,
                'present_count' => $presentCount,
                'total_count' => $totalCount,
            ];
        }

        return $days;
    }

    private function feeCollectionTrend(): array
    {
        $start = now()->subMonths(5)->startOfMonth();

        // Grouped in PHP rather than via a raw DATE_FORMAT()/strftime() SQL
        // expression — that syntax differs between MySQL (production) and
        // SQLite (the test suite's driver), and this project has already
        // been burned once by a date query that only worked on one of them
        // (see AttendanceService's docblock on whereDate() vs where('date')).
        $totalsByMonth = Payment::query()
            ->where('paid_at', '>=', $start)
            ->get(['amount', 'paid_at'])
            ->reduce(function (array $totals, Payment $payment) {
                $month = Carbon::parse($payment->paid_at)->format('Y-m');
                $totals[$month] = ($totals[$month] ?? 0) + $payment->amount;

                return $totals;
            }, []);

        $months = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i)->format('Y-m');
            $months[] = [
                'month' => $month,
                'total' => round((float) ($totalsByMonth[$month] ?? 0), 2),
            ];
        }

        return $months;
    }

    private function staffSummary(User $user): array
    {
        // whereDate(), not where('date', ...) — see AttendanceService's docblock.
        $todayCount = StudentAttendance::query()->whereDate('date', now())->whereNull('timetable_period_id')->count();

        return [
            'role_context' => 'staff',
            'student_count' => Student::query()->where('status', 'active')->count(),
            'staff_count' => User::query()->whereHas('roles', fn ($q) => $q->whereNotIn('name', ['Student', 'Parent']))->count(),
            'section_count' => Section::query()->count(),
            'todays_attendance_marked_count' => $todayCount,
            'pending_leave_requests_count' => $user->can('leave.manage')
                ? LeaveRequest::query()->where('status', 'pending')->count()
                : null,
            'fee_collected_this_month' => $user->can('invoices.view-reports')
                ? round(Payment::query()->whereDate('paid_at', '>=', now()->startOfMonth())->sum('amount'), 2)
                : null,
            'library_overdue_count' => $user->can('library.view')
                ? BookIssue::query()->where('status', 'issued')->whereDate('due_date', '<', now())->count()
                : null,
        ];
    }

    private function teacherSummary(User $user): array
    {
        $sectionIds = Section::query()->where('class_teacher_id', $user->id)->pluck('id')
            ->merge(ClassSubjectTeacher::query()->where('teacher_id', $user->id)->pluck('section_id'))
            ->unique();

        $todaysAttendance = StudentAttendance::query()
            ->whereIn('section_id', $sectionIds)
            ->whereDate('date', now())
            ->whereNull('timetable_period_id')
            ->get();

        return [
            'role_context' => 'teacher',
            'assigned_section_count' => $sectionIds->count(),
            'student_count' => Student::query()->whereIn('current_section_id', $sectionIds)->count(),
            'is_class_teacher_of' => Section::query()->where('class_teacher_id', $user->id)->pluck('name', 'id'),
            'todays_attendance_marked_count' => $todaysAttendance->count(),
            'pending_homework_grading_count' => HomeworkSubmission::query()
                ->where('status', 'submitted')
                ->whereHas('homework', fn ($q) => $q->where('teacher_id', $user->id))
                ->count(),
        ];
    }

    private function studentSummary(User $user): array
    {
        $student = Student::query()->where('user_id', $user->id)->first();

        return [
            'role_context' => 'student',
            'student' => $student ? [
                'id' => $student->id,
                'admission_number' => $student->admission_number,
                'grade_level' => $student->currentGradeLevel?->name,
                'section' => $student->currentSection?->name,
            ] : null,
            'attendance_this_month' => $student
                ? $this->attendance->studentSummary($student, now()->startOfMonth(), now())
                : null,
            'pending_homework_count' => $student
                ? Homework::query()->where('section_id', $student->current_section_id)
                    ->whereDoesntHave('submissions', fn ($q) => $q->where('student_id', $student->id))
                    ->count()
                : null,
            'upcoming_exam_count' => $student
                ? ExamSubject::query()->where('section_id', $student->current_section_id)
                    ->whereDate('exam_date', '>=', now())
                    ->count()
                : null,
        ];
    }

    private function parentSummary(User $user): array
    {
        $guardian = Guardian::query()->where('user_id', $user->id)->first();
        $childIds = $guardian?->students()->pluck('students.id') ?? collect();

        return [
            'role_context' => 'parent',
            'children_count' => $childIds->count(),
            'children_pending_fees_total' => $childIds->isNotEmpty()
                ? round(Invoice::query()->whereIn('student_id', $childIds)->get()->sum(fn (Invoice $invoice) => $invoice->balance), 2)
                : 0,
        ];
    }
}
