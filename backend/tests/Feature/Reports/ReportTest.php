<?php

namespace Tests\Feature\Reports;

use App\Models\AcademicYear;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\Exam;
use App\Models\ExamMark;
use App\Models\ExamSubject;
use App\Models\GradeLevel;
use App\Models\GradingScale;
use App\Models\School;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class ReportTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_school_admin_can_view_the_attendance_report(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $section = $this->makeSection();
        $student = Student::factory()->create(['academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id]);
        StudentAttendance::factory()->create([
            'student_id' => $student->id, 'section_id' => $section->id, 'academic_year_id' => $section->academic_year_id,
            'marked_by' => $admin->id, 'date' => now()->toDateString(), 'status' => 'present',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/reports/attendance');

        $response->assertOk();
        $this->assertNotNull($response->json('data.student'));
        $this->assertNotNull($response->json('data.staff'));
    }

    public function test_receptionist_without_attendance_permissions_cannot_view_the_attendance_report(): void
    {
        $receptionist = $this->createUserWithRole('Receptionist');

        $response = $this->actingAs($receptionist)->getJson('/api/v1/reports/attendance');

        $response->assertStatus(403);
    }

    public function test_teacher_only_sees_the_student_attendance_section_not_staff(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->getJson('/api/v1/reports/attendance');

        $response->assertOk();
        $this->assertNotNull($response->json('data.student'));
        $this->assertNull($response->json('data.staff'));
    }

    public function test_academic_performance_report_computes_average_and_pass_rate(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $section = $this->makeSection();
        $scale = GradingScale::factory()->create();
        $exam = Exam::factory()->create(['academic_year_id' => $section->academic_year_id, 'is_published' => true]);
        $examSubject = ExamSubject::factory()->create([
            'exam_id' => $exam->id, 'section_id' => $section->id, 'max_marks' => 100,
        ]);
        // grading_scale_id/passing_marks now live on the subject's group, not the component.
        $examSubject->examSubjectGroup->update(['grading_scale_id' => $scale->id, 'passing_marks' => 40]);
        $studentA = Student::factory()->create(['academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id]);
        $studentB = Student::factory()->create(['academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id]);
        ExamMark::factory()->create(['exam_subject_id' => $examSubject->id, 'student_id' => $studentA->id, 'marks_obtained' => 80, 'is_absent' => false]);
        ExamMark::factory()->create(['exam_subject_id' => $examSubject->id, 'student_id' => $studentB->id, 'marks_obtained' => 20, 'is_absent' => false]);

        $response = $this->actingAs($admin)->getJson('/api/v1/reports/academic-performance');

        $response->assertOk();
        $exams = $response->json('data.exams');
        $this->assertCount(1, $exams);
        $this->assertEquals(50, $exams[0]['average_percentage']);
        $this->assertEquals(50, $exams[0]['pass_rate']);
    }

    public function test_enrollment_report_counts_active_students_by_grade(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $section = $this->makeSection();
        Student::factory()->count(2)->create([
            'academic_year_id' => $section->academic_year_id, 'current_grade_level_id' => $section->grade_level_id, 'current_section_id' => $section->id, 'status' => 'active',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/reports/enrollment');

        $response->assertOk()->assertJsonPath('data.active_total', 2);
    }

    public function test_operations_report_computes_library_overdue_count(): void
    {
        $librarian = $this->createUserWithRole('Librarian');
        $book = Book::factory()->create(['total_copies' => 2, 'available_copies' => 1]);
        $section = $this->makeSection();
        $student = Student::factory()->create(['academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id]);
        BookIssue::factory()->create([
            'book_id' => $book->id, 'student_id' => $student->id, 'user_id' => null,
            'status' => 'issued', 'due_date' => now()->subDays(2)->toDateString(), 'issued_by' => $librarian->id,
        ]);

        $response = $this->actingAs($librarian)->getJson('/api/v1/reports/operations');

        $response->assertOk()->assertJsonPath('data.library.currently_overdue', 1);
        $this->assertNull($response->json('data.transport'));
        $this->assertNull($response->json('data.hostel'));
    }

    private function makeSection(): Section
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();

        return Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
    }
}
