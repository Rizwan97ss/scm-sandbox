<?php

namespace Tests\Feature\Security;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Homework;
use App\Models\HomeworkSubmission;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * MediaController (app/Http/Controllers/Api/V1/MediaController.php) is the
 * single authenticated gate every uploaded file goes through — added along
 * with switching MEDIA_DISK to the private 'local' disk (previously
 * 'public', web-served with no auth check at all, completely bypassing
 * every model Policy). This had zero test coverage before; proves the
 * polymorphic Gate::authorize('view', $media->model) dispatch actually
 * holds for a real Student-owned file, not just that the route exists.
 */
class MediaAccessTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake(config('media-library.disk_name'));
    }

    private function makeStudentWithPhoto(string $firstName): Student
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);

        $student = Student::factory()->create([
            'first_name' => $firstName,
            'academic_year_id' => $year->id,
            'current_grade_level_id' => $gradeLevel->id,
            'current_section_id' => $section->id,
        ]);

        $student->addMedia(UploadedFile::fake()->image(strtolower($firstName).'.jpg'))->toMediaCollection('photo');

        return $student->fresh();
    }

    public function test_admin_can_fetch_a_students_photo(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $student = $this->makeStudentWithPhoto('Alpha');
        $media = $student->getFirstMedia('photo');

        $response = $this->actingAs($admin)->get("/api/v1/media/{$media->id}");

        $response->assertOk();
        $this->assertSame('image/jpeg', $response->headers->get('Content-Type'));
    }

    public function test_a_teacher_without_view_access_to_the_student_cannot_fetch_their_photo(): void
    {
        // A plain Teacher has no class-subject-teacher assignment to this
        // student's section at all, so StudentPolicy::view() must deny them.
        $teacher = $this->createUserWithRole('Teacher');
        $student = $this->makeStudentWithPhoto('Alpha');
        $media = $student->getFirstMedia('photo');

        $response = $this->actingAs($teacher)->get("/api/v1/media/{$media->id}");

        $response->assertStatus(403);
    }

    public function test_unauthenticated_request_cannot_fetch_a_photo(): void
    {
        $student = $this->makeStudentWithPhoto('Alpha');
        $media = $student->getFirstMedia('photo');

        $response = $this->get("/api/v1/media/{$media->id}");

        $response->assertStatus(401);
    }

    /** @return array{0: HomeworkSubmission, 1: User} */
    private function makeSubmissionWithAttachment(): array
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $subject = Subject::factory()->create();
        $homework = Homework::factory()->create(['academic_year_id' => $year->id, 'section_id' => $section->id, 'subject_id' => $subject->id]);

        $studentUser = $this->createUserWithRole('Student');
        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
            'user_id' => $studentUser->id,
        ]);

        $submission = HomeworkSubmission::factory()->create(['homework_id' => $homework->id, 'student_id' => $student->id]);
        $submission->addMedia(UploadedFile::fake()->create('answer.pdf', 10, 'application/pdf'))->toMediaCollection('attachments');

        return [$submission->fresh(), $studentUser];
    }

    /**
     * Regression coverage for the previously-missing HomeworkSubmissionPolicy
     * — without it, Gate::authorize('view', $media->model) had no policy to
     * resolve to for a HomeworkSubmission and denied everyone, including the
     * student who submitted it.
     */
    public function test_the_submitting_student_can_fetch_their_own_submission_attachment(): void
    {
        [$submission, $studentUser] = $this->makeSubmissionWithAttachment();
        $media = $submission->getFirstMedia('attachments');

        $response = $this->actingAs($studentUser)->get("/api/v1/media/{$media->id}");

        $response->assertOk();
    }

    public function test_a_teacher_who_does_not_teach_the_subject_section_cannot_fetch_the_attachment(): void
    {
        [$submission] = $this->makeSubmissionWithAttachment();
        $media = $submission->getFirstMedia('attachments');
        $unrelatedTeacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($unrelatedTeacher)->get("/api/v1/media/{$media->id}");

        $response->assertStatus(403);
    }
}
