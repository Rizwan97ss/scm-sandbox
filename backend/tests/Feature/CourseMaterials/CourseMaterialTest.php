<?php

namespace Tests\Feature\CourseMaterials;

use App\Models\AcademicYear;
use App\Models\ClassSubjectTeacher;
use App\Models\CourseMaterial;
use App\Models\CourseMaterialProgress;
use App\Models\GradeLevel;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class CourseMaterialTest extends TestCase
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

    public function test_teacher_can_create_material_for_a_subject_they_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [, $section, $subject] = $this->makeSectionAndSubject($teacher->id);

        $response = $this->actingAs($teacher)->postJson('/api/v1/course-materials', [
            'section_id' => $section->id,
            'subject_id' => $subject->id,
            'title' => 'Photosynthesis Notes',
            'type' => 'document',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('course_materials', ['title' => 'Photosynthesis Notes', 'teacher_id' => $teacher->id]);
    }

    public function test_teacher_cannot_create_material_for_a_subject_they_do_not_teach(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [, $section, $subject] = $this->makeSectionAndSubject(); // no teacher assigned

        $response = $this->actingAs($teacher)->postJson('/api/v1/course-materials', [
            'section_id' => $section->id,
            'subject_id' => $subject->id,
            'title' => 'Photosynthesis Notes',
            'type' => 'document',
        ]);

        $response->assertStatus(403);
    }

    public function test_a_link_material_requires_a_url(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        [, $section, $subject] = $this->makeSectionAndSubject($teacher->id);

        $response = $this->actingAs($teacher)->postJson('/api/v1/course-materials', [
            'section_id' => $section->id,
            'subject_id' => $subject->id,
            'title' => 'Khan Academy Video',
            'type' => 'video',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('url');
    }

    public function test_student_only_sees_published_material_for_their_own_section(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [, $section, $subject, $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        CourseMaterial::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id, 'is_published' => true]);
        CourseMaterial::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id, 'is_published' => false]);

        [, $otherSection, $otherSubject] = $this->makeSectionAndSubject();
        CourseMaterial::factory()->create(['section_id' => $otherSection->id, 'subject_id' => $otherSubject->id, 'teacher_id' => $teacher->id]);

        $response = $this->actingAs($studentUser)->getJson('/api/v1/course-materials?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_student_can_mark_progress_and_marking_twice_updates_instead_of_duplicating(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [, $section, $subject, $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        $material = CourseMaterial::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id]);

        $this->actingAs($studentUser)->postJson("/api/v1/course-materials/{$material->id}/progress")->assertOk();
        $response = $this->actingAs($studentUser)->postJson("/api/v1/course-materials/{$material->id}/progress", ['completed' => true]);

        $response->assertOk()->assertJsonPath('data.completed_at', fn ($value) => $value !== null);
        $this->assertSame(1, CourseMaterialProgress::query()->where('course_material_id', $material->id)->where('student_id', $student->id)->count());
    }

    public function test_student_cannot_mark_progress_on_material_outside_their_section(): void
    {
        $studentUser = $this->createUserWithRole('Student');
        [, , , $student] = $this->makeSectionAndSubject();
        $student->update(['user_id' => $studentUser->id]);

        $teacher = $this->createUserWithRole('Teacher');
        [, $otherSection, $otherSubject] = $this->makeSectionAndSubject();
        $material = CourseMaterial::factory()->create(['section_id' => $otherSection->id, 'subject_id' => $otherSubject->id, 'teacher_id' => $teacher->id]);

        $response = $this->actingAs($studentUser)->postJson("/api/v1/course-materials/{$material->id}/progress");

        $response->assertStatus(403);
    }

    public function test_parent_can_view_childs_section_material(): void
    {
        $parentUser = $this->createUserWithRole('Parent');
        [, $section, $subject, $student] = $this->makeSectionAndSubject();
        $guardian = Guardian::factory()->create(['user_id' => $parentUser->id]);
        $guardian->students()->attach($student->id, ['relationship_type' => 'mother', 'is_primary' => true]);

        $teacher = $this->createUserWithRole('Teacher');
        CourseMaterial::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id]);

        $response = $this->actingAs($parentUser)->getJson('/api/v1/course-materials?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_school_admin_can_delete_any_material(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $teacher = $this->createUserWithRole('Teacher');
        [, $section, $subject] = $this->makeSectionAndSubject();
        $material = CourseMaterial::factory()->create(['section_id' => $section->id, 'subject_id' => $subject->id, 'teacher_id' => $teacher->id]);

        $response = $this->actingAs($admin)->deleteJson("/api/v1/course-materials/{$material->id}");

        $response->assertOk();
        $this->assertSoftDeleted('course_materials', ['id' => $material->id]);
    }
}
