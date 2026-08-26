<?php

namespace Tests\Feature\Users;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class UserCrudTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_school_admin_can_create_a_user_with_roles(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/users', [
            'first_name' => 'Tina',
            'last_name' => 'Teacher',
            'email' => 'tina.teacher@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'roles' => ['Teacher'],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.email', 'tina.teacher@example.com')
            ->assertJsonPath('data.roles.0', 'Teacher');

        $this->assertDatabaseHas('users', ['email' => 'tina.teacher@example.com']);
    }

    public function test_teacher_cannot_create_a_user(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->postJson('/api/v1/users', [
            'first_name' => 'Tina',
            'last_name' => 'Teacher',
            'email' => 'tina.teacher@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'roles' => ['Teacher'],
        ]);

        $response->assertStatus(403);
    }

    public function test_user_index_lists_created_users(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->createUserWithRole('Teacher', ['first_name' => 'Tanya']);

        $response = $this->actingAs($admin)->getJson('/api/v1/users?per_page=50');

        $response->assertOk();
        $names = collect($response->json('data'))->pluck('first_name');

        $this->assertTrue($names->contains('Tanya'));
    }

    public function test_user_cannot_delete_self(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->deleteJson("/api/v1/users/{$admin->id}");

        $response->assertStatus(403);
    }

    public function test_admin_can_update_user_status(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($admin)->postJson("/api/v1/users/{$teacher->id}/status", [
            'status' => 'suspended',
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'suspended');
        $this->assertDatabaseHas('users', ['id' => $teacher->id, 'status' => 'suspended']);
    }

    /**
     * UserPolicy::update()'s "or it's my own account" fallback is meant for
     * self-service profile edits (name/email/etc.) — status is how a
     * suspension is enforced, so it must go through the dedicated
     * updateStatus() ability instead, which never permits self-targeting.
     * Uses a still-Active admin deliberately: an already-suspended user's
     * request would be intercepted even earlier by EnsureUserIsActive
     * (401, before this ability is ever checked) — this proves the policy
     * itself blocks self-targeting, independent of that middleware.
     */
    public function test_user_cannot_change_their_own_status(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson("/api/v1/users/{$admin->id}/status", [
            'status' => 'inactive',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'status' => 'active']);
    }
}
