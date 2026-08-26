<?php

namespace Tests\Feature\Academic;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Section;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class SectionTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_admin_can_list_and_create_sections(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();

        $this->actingAs($admin)->getJson('/api/v1/sections')->assertOk();

        $response = $this->actingAs($admin)->postJson('/api/v1/sections', [
            'academic_year_id' => $year->id,
            'grade_level_id' => $gradeLevel->id,
            'name' => 'A',
            'capacity' => 30,
        ]);

        $response->assertCreated()->assertJsonPath('data.name', 'A');
        $this->assertDatabaseHas('sections', ['name' => 'A']);
    }

    /**
     * Regression test for a Section-update fatal error: SectionPolicy::update()
     * once narrowed its parameter type from the base policy's Model to Section,
     * which PHP treats as a fatal class-declaration error the moment the class
     * is loaded — breaking every request that touched SectionPolicy at all,
     * including a plain index list. No test exercised Section endpoints via
     * HTTP before, so it went uncaught until manual browser testing found it.
     */
    public function test_class_teacher_can_update_their_own_section_without_blanket_permission(): void
    {
        $classTeacher = $this->createUserWithRole('Class Teacher');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create([
            'academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'class_teacher_id' => $classTeacher->id,
        ]);

        $response = $this->actingAs($classTeacher)->putJson("/api/v1/sections/{$section->id}", [
            'academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A', 'capacity' => 28,
        ]);

        $response->assertOk()->assertJsonPath('data.capacity', 28);
    }

    public function test_teacher_cannot_update_a_section_they_do_not_lead(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);

        $response = $this->actingAs($teacher)->putJson("/api/v1/sections/{$section->id}", [
            'academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'B',
        ]);

        $response->assertStatus(403);
    }
}
