<?php

namespace Tests\Feature\Homework;

use App\Models\AcademicYear;
use App\Models\ClassSubjectTeacher;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\School;
use App\Models\Section;
use App\Models\Student;
use App\Models\StudentRemark;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class StudentRemarkTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function makeStudentInSection(?int $teacherId = null): array
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);

        if ($teacherId) {
            $subject = Subject::factory()->create();
            ClassSubjectTeacher::query()->create([
                'academic_year_id' => $year->id,
                'section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacherId,
            ]);
        }

        $student = Student::factory()->create([
            'academic_year_id' => $year->id, 'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);

        return [$section, $student];
    }

    public function test_teacher_can_add_a_remark_for_a_student_in_a_section_they_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [, $student] = $this->makeStudentInSection($teacher->id);

        $response = $this->actingAs($teacher)->postJson('/api/v1/student-remarks', [
            'student_id' => $student->id,
            'category' => 'behavioral',
            'body' => 'Excellent participation in class today.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('student_remarks', ['student_id' => $student->id, 'author_id' => $teacher->id, 'category' => 'behavioral']);
    }

    public function test_teacher_cannot_add_a_remark_for_a_student_outside_their_section(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [, $student] = $this->makeStudentInSection(); // no teacher assigned

        $response = $this->actingAs($teacher)->postJson('/api/v1/student-remarks', [
            'student_id' => $student->id,
            'body' => 'Should not be allowed.',
        ]);

        $response->assertStatus(403);
    }

    public function test_student_can_view_remarks_about_themselves(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        $teacher = $this->createUserWithRole('Teacher');
        [, $student] = $this->makeStudentInSection();
        $student->update(['user_id' => $studentUser->id]);

        StudentRemark::factory()->create(['student_id' => $student->id, 'author_id' => $teacher->id]);

        $response = $this->actingAs($studentUser)->getJson('/api/v1/student-remarks?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_parent_only_sees_remarks_marked_visible_to_guardian(): void
    {
        $parentUser = $this->createUserWithRole('Parent');
        $teacher = $this->createUserWithRole('Teacher');
        [, $student] = $this->makeStudentInSection();
        $guardian = Guardian::factory()->create(['user_id' => $parentUser->id]);
        $guardian->students()->attach($student->id, ['relationship_type' => 'father', 'is_primary' => true]);

        StudentRemark::factory()->create(['student_id' => $student->id, 'author_id' => $teacher->id, 'visible_to_guardian' => true]);
        StudentRemark::factory()->create(['student_id' => $student->id, 'author_id' => $teacher->id, 'visible_to_guardian' => false]);

        $response = $this->actingAs($parentUser)->getJson("/api/v1/parent/children/{$student->id}/remarks");

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_school_admin_can_filter_remarks_by_student(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $teacher = $this->createUserWithRole('Teacher');
        [, $studentA] = $this->makeStudentInSection();
        [, $studentB] = $this->makeStudentInSection();

        StudentRemark::factory()->create(['student_id' => $studentA->id, 'author_id' => $teacher->id]);
        StudentRemark::factory()->create(['student_id' => $studentB->id, 'author_id' => $teacher->id]);

        $response = $this->actingAs($admin)->getJson("/api/v1/student-remarks?filter[student_id]={$studentA->id}");

        $response->assertOk()->assertJsonCount(1, 'data');
    }
}
