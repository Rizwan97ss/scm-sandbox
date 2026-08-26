<?php

namespace Tests\Feature\Homework;

use App\Models\AcademicYear;
use App\Models\ClassSubjectTeacher;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\School;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class HomeworkTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function makeSectionAndSubject(?int $teacherId = null): array
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $subject = Subject::factory()->create();

        if ($teacherId) {
            ClassSubjectTeacher::query()->create([
                'academic_year_id' => $year->id,
                'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacherId,
            ]);
        }

        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);

        return [$year, $section, $subject, $student];
    }

    public function test_teacher_can_create_homework_for_a_subject_they_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [$year, $section, $subject] = $this->makeSectionAndSubject($teacher->id);

        $response = $this->actingAs($teacher)->postJson('/api/v1/homework', [
            'academic_year_id' => $year->id,
            'section_id' => $section->id,
            'subject_id' => $subject->id,
            'title' => 'Chapter 5 exercises',
            'due_date' => now()->addWeek()->toDateString(),
            'max_score' => 20,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('homeworks', ['title' => 'Chapter 5 exercises', 'teacher_id' => $teacher->id]);
    }

    public function test_teacher_cannot_create_homework_for_a_subject_they_do_not_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [$year, $section, $subject] = $this->makeSectionAndSubject(); // no teacher assigned

        $response = $this->actingAs($teacher)->postJson('/api/v1/homework', [
            'academic_year_id' => $year->id,
            'section_id' => $section->id,
            'subject_id' => $subject->id,
            'title' => 'Chapter 5 exercises',
            'due_date' => now()->addWeek()->toDateString(),
        ]);

        $response->assertStatus(403);
    }

    public function test_student_only_sees_homework_for_their_own_section(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [$year, $section, $subject, $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
        ]);

        [, $otherSection, $otherSubject] = $this->makeSectionAndSubject();
        Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $otherSection->id, 'subject_id' => $otherSubject->id, 'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($studentUser)->getJson('/api/v1/homework?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_student_can_submit_homework_and_resubmitting_updates_instead_of_duplicating(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [$year, $section, $subject, $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        $homework = Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
        ]);

        $submit = fn (string $content) => $this->actingAs($studentUser)->postJson("/api/v1/homework/{$homework->id}/submit", ['content' => $content]);

        $submit('first draft')->assertOk();
        $submit('final answer')->assertOk();

        $this->assertSame(1, HomeworkSubmission::query()->where('homework_id', $homework->id)->where('student_id', $student->id)->count());
        $this->assertDatabaseHas('homework_submissions', ['homework_id' => $homework->id, 'student_id' => $student->id, 'content' => 'final answer']);
    }

    public function test_student_cannot_submit_homework_outside_their_section(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [$year, , , $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        [, $otherSection, $otherSubject] = $this->makeSectionAndSubject();
        $homework = Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $otherSection->id, 'subject_id' => $otherSubject->id, 'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($studentUser)->postJson("/api/v1/homework/{$homework->id}/submit", ['content' => 'sneaky']);

        $response->assertStatus(403);
    }

    public function test_teacher_can_grade_a_submission_for_a_subject_they_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [$year, $section, $subject, $student] = $this->makeSectionAndSubject($teacher->id);

        $homework = Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
        ]);
        $submission = HomeworkSubmission::factory()->create(['homework_id' => $homework->id, 'student_id' => $student->id]);

        $response = $this->actingAs($teacher)->putJson("/api/v1/homework-submissions/{$submission->id}/grade", [
            'score' => 18, 'feedback' => 'Great work!',
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'graded');
        $this->assertDatabaseHas('homework_submissions', ['id' => $submission->id, 'score' => 18, 'status' => 'graded']);
    }

    public function test_teacher_cannot_grade_a_submission_for_a_subject_they_do_not_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [$year, $section, $subject, $student] = $this->makeSectionAndSubject(); // no teacher assigned

        $otherTeacher = $this->createUserWithRole('Teacher');
        $homework = Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $otherTeacher->id,
        ]);
        $submission = HomeworkSubmission::factory()->create(['homework_id' => $homework->id, 'student_id' => $student->id]);

        $response = $this->actingAs($teacher)->putJson("/api/v1/homework-submissions/{$submission->id}/grade", ['score' => 18]);

        $response->assertStatus(403);
    }

    public function test_parent_can_view_childs_homework(): void
    {
        $parentUser = $this->createUserWithRole('Parent');
        [$year, $section, $subject, $student] = $this->makeSectionAndSubject();
        $guardian = Guardian::factory()->create(['user_id' => $parentUser->id]);
        $guardian->students()->attach($student->id, ['relationship_type' => 'mother', 'is_primary' => true]);

        $teacher = $this->createUserWithRole('Teacher');
        Homework::factory()->create([
            'academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id,
        ]);

        $response = $this->actingAs($parentUser)->getJson("/api/v1/parent/children/{$student->id}/homework");

        $response->assertOk()->assertJsonCount(1, 'data');
    }
}
