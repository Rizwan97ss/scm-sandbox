<?php

namespace Tests\Feature\Exams;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSubject;
use App\Models\GradeLevel;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\School;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * OnlineExamTest already covers the auto-grading math itself; this file is
 * purely about the visibility gate — OnlineTestAttemptResource must agree
 * with every other component type's Draft/Calculated/Published rule
 * (ExamSubjectGroup::status()), not just "has this attempt been submitted."
 */
class OnlineTestResultMaskingTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    /** @return array{0: Exam, 1: \App\Models\ExamSubjectGroup, 2: ExamSubject, 3: Student, 4: User} */
    private function makeSubmittedAttempt(): array
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $subject = Subject::factory()->create();
        $exam = Exam::factory()->create(['academic_year_id' => $year->id]);
        $examSubject = ExamSubject::factory()->create([
            'exam_id' => $exam->id, 'subject_id' => $subject->id, 'section_id' => $section->id,
            'max_marks' => 5, 'is_online' => true, 'max_attempts' => 1,
        ]);

        $admin = $this->createUserWithRole('School Admin');
        $question = Question::factory()->create(['created_by' => $admin->id, 'type' => 'mcq', 'default_marks' => 5]);
        foreach (['A', 'B'] as $i => $label) {
            QuestionOption::factory()->create(['question_id' => $question->id, 'option_text' => $label, 'is_correct' => $i === 0, 'sequence' => $i]);
        }
        $this->actingAs($admin)->postJson("/api/v1/exam-subjects/{$examSubject->id}/online-test-questions", [
            'questions' => [['question_id' => $question->id]],
        ])->assertOk();

        $studentUser = User::factory()->create();
        $studentUser->assignRole('Student');
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
            'user_id' => $studentUser->id,
        ]);

        $attemptId = $this->actingAs($studentUser)->postJson("/api/v1/exam-subjects/{$examSubject->id}/attempts")->json('data.attempt.id');
        $correctOption = $question->options()->where('is_correct', true)->first();
        $this->actingAs($studentUser)->putJson("/api/v1/online-test-attempts/{$attemptId}/answers", [
            'question_id' => $question->id, 'selected_option_id' => $correctOption->id,
        ])->assertOk();
        $this->actingAs($studentUser)->postJson("/api/v1/online-test-attempts/{$attemptId}/submit")->assertOk();

        $examSubject->refresh();
        $group = $examSubject->examSubjectGroup;

        return [$exam, $group, $examSubject, $student, $studentUser, $admin, $attemptId];
    }

    public function test_submit_response_masks_score_and_answers_before_declare(): void
    {
        [, , , , $studentUser, , $attemptId] = $this->makeSubmittedAttempt();

        $response = $this->actingAs($studentUser)->getJson("/api/v1/online-test-attempts/{$attemptId}");

        $response->assertOk()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonMissingPath('data.score')
            ->assertJsonMissingPath('data.max_score')
            ->assertJsonMissingPath('data.answers');
    }

    public function test_group_publish_reveals_the_result_to_the_student(): void
    {
        [$exam, $group, , , $studentUser, $admin, $attemptId] = $this->makeSubmittedAttempt();

        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/exam-subject-groups/{$group->id}/publish")->assertOk();

        $response = $this->actingAs($studentUser)->getJson("/api/v1/online-test-attempts/{$attemptId}");

        $response->assertOk()
            ->assertJsonPath('data.score', 5)
            ->assertJsonPath('data.max_score', 5)
            ->assertJsonCount(1, 'data.answers');
    }

    public function test_whole_exam_publish_also_reveals_the_result(): void
    {
        [$exam, , , , $studentUser, $admin, $attemptId] = $this->makeSubmittedAttempt();

        // Whole-exam publish, no per-group declare — composes by OR with the group's own flag.
        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/publish")->assertOk();

        $response = $this->actingAs($studentUser)->getJson("/api/v1/online-test-attempts/{$attemptId}");

        $response->assertOk()->assertJsonPath('data.score', 5);
    }

    public function test_staff_viewer_sees_the_result_regardless_of_publish_state(): void
    {
        [, , , , , $admin, $attemptId] = $this->makeSubmittedAttempt();

        $response = $this->actingAs($admin)->getJson("/api/v1/online-test-attempts/{$attemptId}");

        $response->assertOk()->assertJsonPath('data.score', 5);
    }

    public function test_my_tests_list_masks_best_score_until_declared(): void
    {
        [$exam, $group, , , $studentUser, $admin] = $this->makeSubmittedAttempt();

        $before = $this->actingAs($studentUser)->getJson('/api/v1/online-tests/mine');
        $before->assertOk()
            ->assertJsonPath('data.0.result_declared', false)
            ->assertJsonPath('data.0.best_score', null)
            ->assertJsonPath('data.0.attempts_used', 1);

        $this->actingAs($admin)->postJson("/api/v1/exams/{$exam->id}/exam-subject-groups/{$group->id}/publish")->assertOk();

        $after = $this->actingAs($studentUser)->getJson('/api/v1/online-tests/mine');
        $after->assertOk()
            ->assertJsonPath('data.0.result_declared', true)
            ->assertJsonPath('data.0.best_score', 5);
    }
}
