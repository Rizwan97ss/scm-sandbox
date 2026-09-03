<?php

namespace Tests\Feature\Dashboard;

use App\Models\AcademicYear;
use App\Models\Announcement;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\ExamSubjectGroup;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Invoice;
use App\Models\LeaveRequest;
use App\Models\Payslip;
use App\Models\Route;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentTransportAssignment;
use App\Models\Subject;
use App\Models\Vehicle;
use App\Models\Visitor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_staff_dashboard_reports_student_and_staff_counts(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        Student::factory()->count(3)->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id, 'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.role_context', 'staff')
            ->assertJsonPath('data.student_count', 3);
    }

    /**
     * Regression test: DashboardService::staffSummary()/teacherSummary() once
     * matched "today" via where('date', now()->toDateString()) — an exact
     * string comparison against a column that stores a time-suffixed value on
     * SQLite (see AttendanceService's docblock) — so today's marked count
     * silently read 0 even right after marking attendance.
     */
    public function test_staff_dashboard_counts_todays_attendance_correctly(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);

        StudentAttendance::factory()->create([
            'student_id' => $student->id, 'section_id' => $section->id, 'academic_year_id' => $year->id,
            'marked_by' => $admin->id, 'date' => now()->toDateString(), 'status' => 'present',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()->assertJsonPath('data.todays_attendance_marked_count', 1);
    }

    public function test_teacher_dashboard_only_counts_their_assigned_section(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $mySection = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A', 'class_teacher_id' => $teacher->id]);
        $otherSection = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'B']);

        Student::factory()->count(2)->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $mySection->id]);
        Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $otherSection->id]);

        $response = $this->actingAs($teacher)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.role_context', 'teacher')
            ->assertJsonPath('data.student_count', 2);
    }

    public function test_parent_dashboard_reports_linked_children_count(): void
    {
        $parentUser = $this->createUserWithRole('Parent');
        $guardian = Guardian::factory()->create(['user_id' => $parentUser->id]);
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $child = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);
        $guardian->students()->attach($child->id, ['relationship_type' => 'mother', 'is_primary' => true]);

        $response = $this->actingAs($parentUser)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.role_context', 'parent')
            ->assertJsonPath('data.children_count', 1);
    }

    public function test_staff_dashboard_widgets_are_null_without_the_matching_permission(): void
    {
        $receptionist = $this->createUserWithRole('Receptionist');

        $response = $this->actingAs($receptionist)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.pending_leave_requests_count', null)
            ->assertJsonPath('data.fee_collected_this_month', null)
            ->assertJsonPath('data.library_overdue_count', null)
            ->assertJsonPath('data.outstanding_invoices', null)
            ->assertJsonPath('data.library_due_soon', null)
            ->assertJsonPath('data.transport_summary', null)
            ->assertJsonPath('data.hostel_summary', null)
            ->assertJsonPath('data.payroll_summary', null)
            ->assertJsonPath('data.recent_exam_performance', null);
    }

    public function test_staff_dashboard_reports_outstanding_invoices_and_library_due_soon_for_a_permitted_role(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $student = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'total' => 500, 'amount_paid' => 0, 'status' => 'issued']);
        $book = Book::factory()->create(['title' => 'Algebra Basics']);
        BookIssue::factory()->create(['book_id' => $book->id, 'student_id' => $student->id, 'due_date' => now()->addDays(3)->toDateString()]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.outstanding_invoices.total_outstanding', 500)
            ->assertJsonPath('data.outstanding_invoices.top.0.balance', 500)
            ->assertJsonPath('data.library_due_soon.0.book_title', 'Algebra Basics')
            ->assertJsonPath('data.library_due_soon.0.borrower_name', $student->full_name);
    }

    public function test_staff_dashboard_reports_transport_and_hostel_summaries_for_a_permitted_role(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $route = Route::factory()->create(['name' => 'North Loop']);
        $vehicle = Vehicle::factory()->create(['registration_number' => 'BUS-01']);
        $student = Student::factory()->create();
        StudentTransportAssignment::factory()->create([
            'student_id' => $student->id, 'route_id' => $route->id, 'vehicle_id' => $vehicle->id, 'is_active' => true, 'effective_from' => now()->subDay()->toDateString(),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.transport_summary.students_assigned', 1)
            ->assertJsonPath('data.transport_today_assignments.0.route', 'North Loop')
            ->assertJsonPath('data.transport_today_assignments.0.vehicle', 'BUS-01')
            ->assertJsonPath('data.hostel_summary.room_count', 0);
    }

    public function test_staff_dashboard_reports_payroll_summary_for_a_role_with_payroll_permission(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $staffMember = $this->createUserWithRole('Teacher');
        Payslip::factory()->create(['user_id' => $staffMember->id, 'month' => now()->month, 'year' => now()->year, 'status' => 'paid', 'net_salary' => 3000]);
        Payslip::factory()->create(['user_id' => $hr->id, 'month' => now()->month, 'year' => now()->year, 'status' => 'generated', 'net_salary' => 2500]);

        $response = $this->actingAs($hr)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.payroll_summary.paid_count', 1)
            ->assertJsonPath('data.payroll_summary.pending_count', 1)
            ->assertJsonPath('data.payroll_summary.total_net', 5500);
    }

    public function test_staff_dashboard_reports_visitors_today_for_front_desk(): void
    {
        $receptionist = $this->createUserWithRole('Receptionist');
        Visitor::factory()->create(['check_in_time' => now(), 'check_out_time' => null, 'logged_by' => $receptionist->id]);
        Visitor::factory()->create(['check_in_time' => now(), 'check_out_time' => now(), 'logged_by' => $receptionist->id]);

        $response = $this->actingAs($receptionist)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.visitors_today.total_today', 2)
            ->assertJsonPath('data.visitors_today.checked_in_now', 1);
    }

    public function test_teacher_dashboard_reports_section_today_attendance_for_a_class_teacher(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'class_teacher_id' => $teacher->id]);
        $student = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);
        StudentAttendance::factory()->create([
            'student_id' => $student->id, 'section_id' => $section->id, 'academic_year_id' => $year->id,
            'marked_by' => $teacher->id, 'date' => now()->toDateString(), 'status' => 'present',
        ]);

        $response = $this->actingAs($teacher)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.section_today.0.section_name', $section->name)
            ->assertJsonPath('data.section_today.0.summary.percentage', 100);
    }

    public function test_student_dashboard_reports_upcoming_exams_and_recent_grades_scoped_to_their_section(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        Student::factory()->create([
            'user_id' => $studentUser->id, 'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);
        $subject = Subject::factory()->create(['name' => 'Physics']);
        ExamSubjectGroup::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'published_at' => now()]);

        $response = $this->actingAs($studentUser)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.recent_grades.0.subject', 'Physics');
    }

    public function test_parent_dashboard_reports_a_per_child_breakdown(): void
    {
        $parentUser = $this->createUserWithRole('Parent');
        $guardian = Guardian::factory()->create(['user_id' => $parentUser->id]);
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $child = Student::factory()->create([
            'first_name' => 'Amy', 'last_name' => 'Lane', 'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);
        $guardian->students()->attach($child->id, ['relationship_type' => 'mother', 'is_primary' => true]);
        Invoice::factory()->create(['student_id' => $child->id, 'academic_year_id' => $year->id, 'total' => 300, 'amount_paid' => 100, 'status' => 'partially_paid']);

        $response = $this->actingAs($parentUser)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.children.0.name', 'Amy Lane')
            ->assertJsonPath('data.children.0.pending_fees', 200);
    }

    public function test_staff_dashboard_shows_pending_leave_count_for_hr(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacher = $this->createUserWithRole('Teacher');
        LeaveRequest::factory()->create(['user_id' => $teacher->id, 'status' => 'pending']);

        $response = $this->actingAs($hr)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()->assertJsonPath('data.pending_leave_requests_count', 1);
    }

    public function test_staff_dashboard_reports_lists_and_totals_for_an_admin(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create(['name' => 'Grade 5']);
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id,
            'current_section_id' => $section->id, 'status' => 'active',
        ]);
        Invoice::factory()->create(['student_id' => $student->id, 'academic_year_id' => $year->id, 'total' => 1000, 'amount_paid' => 400, 'status' => 'partially_paid']);
        Announcement::factory()->create(['title' => 'Sports Day', 'sent_at' => now()]);
        LeaveRequest::factory()->create(['user_id' => $admin->id, 'status' => 'pending']);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()
            ->assertJsonPath('data.outstanding_fees_total', 600)
            ->assertJsonPath('data.recent_announcements.0.title', 'Sports Day')
            ->assertJsonCount(1, 'data.pending_leave_requests');
    }
}
