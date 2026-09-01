<?php

namespace Tests\Feature\Dashboard;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Invoice;
use App\Models\Payment;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class DashboardTrendsTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_attendance_trend_reports_todays_present_and_total_counts(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $present = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);
        $absent = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);

        StudentAttendance::factory()->create([
            'student_id' => $present->id, 'section_id' => $section->id, 'academic_year_id' => $year->id,
            'marked_by' => $admin->id, 'date' => now()->toDateString(), 'status' => 'present',
        ]);
        StudentAttendance::factory()->create([
            'student_id' => $absent->id, 'section_id' => $section->id, 'academic_year_id' => $year->id,
            'marked_by' => $admin->id, 'date' => now()->toDateString(), 'status' => 'absent',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/trends');

        $response->assertOk();
        $trend = collect($response->json('data.attendance_trend'));
        $today = $trend->firstWhere('date', now()->toDateString());

        $this->assertNotNull($today);
        $this->assertSame(1, $today['present_count']);
        $this->assertSame(2, $today['total_count']);
        $this->assertCount(14, $trend);
    }

    public function test_fee_collection_trend_sums_this_months_payments(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $student = Student::factory()->create(['academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id]);
        $invoice = Invoice::factory()->create(['student_id' => $student->id]);

        Payment::factory()->create(['invoice_id' => $invoice->id, 'amount' => 150, 'paid_at' => now()]);
        Payment::factory()->create(['invoice_id' => $invoice->id, 'amount' => 50, 'paid_at' => now()]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/trends');

        $response->assertOk();
        $trend = collect($response->json('data.fee_collection_trend'));
        $thisMonth = $trend->firstWhere('month', now()->format('Y-m'));

        $this->assertNotNull($thisMonth);
        // assertEquals, not assertSame: JSON drops the trailing .0 for a
        // whole-number float, so this round-trips as an int, not a float.
        $this->assertEquals(200.0, $thisMonth['total']);
        $this->assertCount(6, $trend);
    }

    public function test_trends_are_null_without_the_matching_permission(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->getJson('/api/v1/dashboard/trends');

        $response->assertOk()->assertJsonPath('data.fee_collection_trend', null);
    }

    /** enrollment_trend/grade_distribution are never permission-gated (unlike the two above) -- every staff member sees them, same as the student/staff counts on the summary endpoint. */
    public function test_enrollment_trend_and_grade_distribution_report_current_state(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create(['name' => 'Grade 5']);
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id,
            'current_section_id' => $section->id, 'status' => 'active', 'admission_date' => now()->toDateString(),
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/dashboard/trends');

        $response->assertOk()
            ->assertJsonPath('data.grade_distribution.0.grade_level', 'Grade 5')
            ->assertJsonPath('data.grade_distribution.0.count', 1)
            ->assertJsonCount(6, 'data.enrollment_trend');
    }
}
