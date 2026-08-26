<?php

namespace Tests\Feature\Exams;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/** Plain lookup CRUD, gated on grading.view/grading.manage like GradingScale — see ExamTypeController/AssessmentComponentTypeController. */
class ExamConfigurationLookupsTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_admin_can_create_an_exam_type(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/exam-types', [
            'name' => 'Trimester', 'code' => 'trimester',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('exam_types', ['name' => 'Trimester', 'code' => 'trimester']);
    }

    public function test_admin_can_create_an_assessment_component_type(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/assessment-component-types', [
            'name' => 'Practical', 'code' => 'practical', 'is_auto_graded' => false,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('assessment_component_types', ['name' => 'Practical', 'code' => 'practical', 'is_auto_graded' => false]);
    }

    public function test_teacher_cannot_manage_exam_types_or_component_types(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $this->actingAs($teacher)->postJson('/api/v1/exam-types', ['name' => 'Trimester', 'code' => 'trimester'])
            ->assertStatus(403);
        $this->actingAs($teacher)->postJson('/api/v1/assessment-component-types', ['name' => 'Practical', 'code' => 'practical'])
            ->assertStatus(403);
    }

    public function test_exam_type_code_must_be_unique(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $this->actingAs($admin)->postJson('/api/v1/exam-types', ['name' => 'Trimester 1', 'code' => 'trimester'])->assertCreated();
        $response = $this->actingAs($admin)->postJson('/api/v1/exam-types', ['name' => 'Trimester 2', 'code' => 'trimester']);

        $response->assertStatus(422)->assertJsonValidationErrors('code');
    }
}
