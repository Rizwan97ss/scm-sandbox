<?php

namespace Tests\Feature\Dashboard;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\LeaveRequest;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentAttendance;
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
            ->assertJsonPath('data.library_overdue_count', null);
    }

    public function test_staff_dashboard_shows_pending_leave_count_for_hr(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacher = $this->createUserWithRole('Teacher');
        LeaveRequest::factory()->create(['user_id' => $teacher->id, 'status' => 'pending']);

        $response = $this->actingAs($hr)->getJson('/api/v1/dashboard/summary');

        $response->assertOk()->assertJsonPath('data.pending_leave_requests_count', 1);
    }
}
