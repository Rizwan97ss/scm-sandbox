<?php

namespace Tests\Feature\Roles;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class RoleCrudTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_school_admin_can_create_a_custom_role_with_permissions(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/roles', [
            'name' => 'Exam Coordinator',
            'permissions' => ['students.view', 'academic-years.view'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Exam Coordinator');

        $this->assertEqualsCanonicalizing(
            ['students.view', 'academic-years.view'],
            $response->json('data.permissions'),
        );
    }

    public function test_role_index_lists_every_role(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->getJson('/api/v1/roles');

        $response->assertOk();
        $roleNames = collect($response->json('data'))->pluck('name');

        $this->assertTrue($roleNames->contains('School Admin'));
        $this->assertCount(\Spatie\Permission\Models\Role::query()->count(), $roleNames);
    }

    public function test_teacher_cannot_view_roles(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->getJson('/api/v1/roles');

        $response->assertStatus(403);
    }
}
