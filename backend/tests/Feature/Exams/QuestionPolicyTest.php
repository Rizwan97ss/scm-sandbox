<?php

namespace Tests\Feature\Exams;

use App\Models\AcademicYear;
use App\Models\ClassSubjectTeacher;
use App\Models\GradeLevel;
use App\Models\Question;
use App\Models\Section;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * QuestionPolicy used to be permission-only (questions.view/edit/delete),
 * which let any Teacher holding those permissions read, edit, or delete
 * another teacher's question bank for a subject they don't teach —
 * including answer keys. Now requires actually owning (created_by) or
 * teaching (ClassSubjectTeacher) the question's subject.
 */
class QuestionPolicyTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function assignTeacherToSubject(int $teacherId, int $subjectId): void
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);

        ClassSubjectTeacher::query()->create([
            'academic_year_id' => $year->id,
            'section_id' => $section->id,
            'subject_id' => $subjectId,
            'teacher_id' => $teacherId,
        ]);
    }

    public function test_teacher_can_view_a_question_for_a_subject_they_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $subject = Subject::factory()->create();
        $this->assignTeacherToSubject($teacher->id, $subject->id);
        $question = Question::factory()->create(['subject_id' => $subject->id]);

        $response = $this->actingAs($teacher)->getJson("/api/v1/questions/{$question->id}");

        $response->assertOk();
    }

    public function test_teacher_cannot_view_another_subjects_question_they_neither_authored_nor_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $otherSubject = Subject::factory()->create();
        $question = Question::factory()->create(['subject_id' => $otherSubject->id]);

        $response = $this->actingAs($teacher)->getJson("/api/v1/questions/{$question->id}");

        $response->assertStatus(403);
    }

    public function test_teacher_cannot_delete_another_teachers_question_for_a_subject_they_dont_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $otherSubject = Subject::factory()->create();
        $question = Question::factory()->create(['subject_id' => $otherSubject->id]);

        $response = $this->actingAs($teacher)->deleteJson("/api/v1/questions/{$question->id}");

        $response->assertStatus(403);
        $this->assertDatabaseHas('questions', ['id' => $question->id]);
    }

    public function test_question_list_excludes_other_teachers_subjects(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $mySubject = Subject::factory()->create();
        $otherSubject = Subject::factory()->create();
        $this->assignTeacherToSubject($teacher->id, $mySubject->id);

        $mine = Question::factory()->create(['subject_id' => $mySubject->id]);
        $notMine = Question::factory()->create(['subject_id' => $otherSubject->id]);

        $response = $this->actingAs($teacher)->getJson('/api/v1/questions?per_page=50');

        $response->assertOk();
        $ids = collect($response->json('data'))->pluck('id');
        $this->assertTrue($ids->contains($mine->id));
        $this->assertFalse($ids->contains($notMine->id));
    }
}
