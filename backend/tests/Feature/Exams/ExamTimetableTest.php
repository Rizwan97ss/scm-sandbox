<?php

namespace Tests\Feature\Exams;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSubject;
use App\Models\GradeLevel;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * The exam timetable (date + start/end time per subject, one section at a
 * time): reading it is open to any exam-timetable.view holder (or a
 * Student/Parent viewing their own section via ?student_id=), but writing
 * it is restricted to Admin/Principal or that section's own class teacher —
 * same "narrow, section-scoped edit right" shape as
 * ExamSubjectGroupResultTest's publish/unpublish tests, just for scheduling
 * instead of results.
 */
class ExamTimetableTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    /** @return array{0: Exam, 1: ExamSubject, 2: Section, 3: Student} */
    private function makeExamWithSubject(?int $classTeacherId = null): array
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create([
            'academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'class_teacher_id' => $classTeacherId,
        ]);
        $subject = Subject::factory()->create();
        $exam = Exam::factory()->create(['academic_year_id' => $year->id]);
        $examSubject = ExamSubject::factory()->create([
            'exam_id' => $exam->id, 'subject_id' => $subject->id, 'section_id' => $section->id, 'max_marks' => 100,
        ]);
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);

        return [$exam, $examSubject, $section, $student];
    }

    public function test_admin_can_view_and_edit_any_sections_timetable(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        [$exam, $examSubject, $section] = $this->makeExamWithSubject();

        $response = $this->actingAs($admin)->putJson("/api/v1/exams/{$exam->id}/timetable", [
            'section_id' => $section->id,
            'items' => [['exam_subject_id' => $examSubject->id, 'exam_date' => '2026-09-10', 'start_time' => '09:00', 'end_time' => '12:00']],
        ]);

        $response->assertOk()
            ->assertJsonPath('data.can_edit', true)
            ->assertJsonPath('data.rows.0.exam_date', '2026-09-10')
            ->assertJsonPath('data.rows.0.start_time', '09:00:00')
            ->assertJsonPath('data.rows.0.end_time', '12:00:00');
    }

    public function test_class_teacher_can_edit_their_own_sections_timetable(): void
    {
        $classTeacher = $this->createUserWithRole('Class Teacher');
        [$exam, $examSubject, $section] = $this->makeExamWithSubject(classTeacherId: $classTeacher->id);

        $response = $this->actingAs($classTeacher)->putJson("/api/v1/exams/{$exam->id}/timetable", [
            'section_id' => $section->id,
            'items' => [['exam_subject_id' => $examSubject->id, 'exam_date' => '2026-09-10', 'start_time' => '09:00', 'end_time' => '12:00']],
        ]);

        $response->assertOk()->assertJsonPath('data.rows.0.start_time', '09:00:00');
    }

    public function test_class_teacher_cannot_edit_a_section_they_do_not_teach(): void
    {
        $classTeacher = $this->createUserWithRole('Class Teacher');
        [$exam, $examSubject, $section] = $this->makeExamWithSubject();

        $response = $this->actingAs($classTeacher)->putJson("/api/v1/exams/{$exam->id}/timetable", [
            'section_id' => $section->id,
            'items' => [['exam_subject_id' => $examSubject->id, 'exam_date' => '2026-09-10']],
        ]);

        $response->assertStatus(403);
    }

    public function test_plain_teacher_can_view_but_not_edit_the_timetable(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [$exam, , $section] = $this->makeExamWithSubject(classTeacherId: $teacher->id);

        $this->actingAs($teacher)->getJson("/api/v1/exams/{$exam->id}/timetable?section_id={$section->id}")
            ->assertOk()
            ->assertJsonPath('data.can_edit', false);

        $this->actingAs($teacher)->putJson("/api/v1/exams/{$exam->id}/timetable", ['section_id' => $section->id, 'items' => []])
            ->assertStatus(403);
    }

    public function test_a_student_can_view_their_own_sections_timetable(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [$exam, $examSubject, , $student] = $this->makeExamWithSubject();
        $student->update(['user_id' => $studentUser->id]);

        $examSubject->update(['exam_date' => '2026-09-10', 'start_time' => '09:00:00', 'end_time' => '12:00:00']);

        $response = $this->actingAs($studentUser)->getJson("/api/v1/exams/{$exam->id}/timetable?student_id={$student->id}");

        $response->assertOk()->assertJsonPath('data.rows.0.subject_name', $examSubject->fresh()->subject->name);
    }

    public function test_a_student_cannot_view_another_students_timetable(): void
    {
        $studentUserA = $this->createUserWithRole('Student');
        [$exam, , , $studentB] = $this->makeExamWithSubject();

        $response = $this->actingAs($studentUserA)->getJson("/api/v1/exams/{$exam->id}/timetable?student_id={$studentB->id}");

        $response->assertStatus(403);
    }

    public function test_updating_rejects_an_exam_subject_from_a_different_section(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        [$exam, , $section] = $this->makeExamWithSubject();
        [, $otherExamSubject] = $this->makeExamWithSubject();

        $response = $this->actingAs($admin)->putJson("/api/v1/exams/{$exam->id}/timetable", [
            'section_id' => $section->id,
            'items' => [['exam_subject_id' => $otherExamSubject->id, 'exam_date' => '2026-09-10']],
        ]);

        $response->assertStatus(422);
    }

    public function test_end_time_must_be_after_start_time(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        [$exam, $examSubject, $section] = $this->makeExamWithSubject();

        $response = $this->actingAs($admin)->putJson("/api/v1/exams/{$exam->id}/timetable", [
            'section_id' => $section->id,
            'items' => [['exam_subject_id' => $examSubject->id, 'start_time' => '12:00', 'end_time' => '09:00']],
        ]);

        $response->assertStatus(422);
    }
}
