<?php

namespace Tests\Feature\Hr;

use App\Models\Designation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class DesignationTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_hr_staff_can_create_a_designation(): void
    {
        $hr = $this->createUserWithRole('HR Staff');

        $response = $this->actingAs($hr)->postJson('/api/v1/designations', ['name' => 'Math Teacher']);

        $response->assertCreated();
        $this->assertDatabaseHas('designations', ['name' => 'Math Teacher']);
    }

    public function test_teacher_cannot_create_a_designation(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->postJson('/api/v1/designations', ['name' => 'Math Teacher']);

        $response->assertStatus(403);
    }

    public function test_a_user_can_be_assigned_a_designation(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacher = $this->createUserWithRole('Teacher');
        $designation = Designation::factory()->create();

        $response = $this->actingAs($hr)->putJson("/api/v1/users/{$teacher->id}", [
            'designation_id' => $designation->id,
            'employee_id' => 'EMP-0001',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('users', ['id' => $teacher->id, 'designation_id' => $designation->id, 'employee_id' => 'EMP-0001']);
    }
}
