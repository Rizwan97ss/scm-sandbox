<?php

namespace Tests\Feature\Exams;

use App\Models\AcademicYear;
use App\Models\Exam;
use App\Models\ExamSubject;
use App\Models\GradeLevel;
use App\Models\OnlineTestAttempt;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class AutoSubmitExpiredOnlineTestsCommandTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_command_auto_submits_an_expired_in_progress_attempt_and_scores_it(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $subject = Subject::factory()->create();
        $exam = Exam::factory()->create(['academic_year_id' => $year->id]);
        $examSubject = ExamSubject::factory()->create([
            'exam_id' => $exam->id, 'subject_id' => $subject->id, 'section_id' => $section->id,
            'max_marks' => 5, 'is_online' => true, 'max_attempts' => 1,
            'online_ends_at' => now()->subMinutes(10),
        ]);
        $studentUser = User::factory()->create();
        $studentUser->assignRole('Student');
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
            'user_id' => $studentUser->id,
        ]);

        $question = Question::factory()->create(['created_by' => $admin->id, 'type' => 'mcq', 'default_marks' => 5]);
        foreach (['A', 'B'] as $i => $label) {
            QuestionOption::factory()->create(['question_id' => $question->id, 'option_text' => $label, 'is_correct' => $i === 0, 'sequence' => $i]);
        }
        $examSubject->onlineTestQuestions()->create(['question_id' => $question->id, 'sequence' => 0]);

        $attempt = OnlineTestAttempt::query()->create([
            'exam_subject_id' => $examSubject->id, 'student_id' => $student->id,
            'attempt_number' => 1, 'status' => 'in_progress', 'started_at' => now()->subMinutes(20),
        ]);

        $this->artisan('exams:auto-submit-expired')->assertExitCode(0);

        $this->assertSame('submitted', $attempt->fresh()->status);
        // Never answered — auto-submit scores it 0, not a penalty.
        $this->assertDatabaseHas('exam_marks', [
            'exam_subject_id' => $examSubject->id, 'student_id' => $student->id, 'marks_obtained' => 0,
        ]);
    }

    /** Degrade-don't-crash: no School Admin to attribute the sweep to means it's skipped, not fatal. */
    public function test_command_skips_when_no_school_admin_exists_without_crashing(): void
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $subject = Subject::factory()->create();
        $exam = Exam::factory()->create(['academic_year_id' => $year->id]);
        $examSubject = ExamSubject::factory()->create([
            'exam_id' => $exam->id, 'subject_id' => $subject->id, 'section_id' => $section->id,
            'max_marks' => 5, 'is_online' => true, 'max_attempts' => 1,
            'online_ends_at' => now()->subMinutes(10),
        ]);
        $studentUser = User::factory()->create();
        $studentUser->assignRole('Student');
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
            'user_id' => $studentUser->id,
        ]);
        $attempt = OnlineTestAttempt::query()->create([
            'exam_subject_id' => $examSubject->id, 'student_id' => $student->id,
            'attempt_number' => 1, 'status' => 'in_progress', 'started_at' => now()->subMinutes(20),
        ]);

        $this->artisan('exams:auto-submit-expired')->assertExitCode(0);

        $this->assertSame('in_progress', $attempt->fresh()->status);
    }
}
