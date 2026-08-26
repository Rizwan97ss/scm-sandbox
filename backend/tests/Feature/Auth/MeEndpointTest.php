<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class MeEndpointTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_authenticated_user_can_fetch_own_profile_with_roles_and_permissions(): void
    {
        $user = $this->createUserWithRole('School Admin', ['first_name' => 'Alice']);

        $response = $this->actingAs($user)->getJson('/api/v1/auth/me');

        $response->assertOk()
            ->assertJsonPath('data.first_name', 'Alice')
            ->assertJsonPath('data.roles.0', 'School Admin');

        $this->assertContains('students.view', $response->json('data.permissions'));
    }

    public function test_guest_cannot_fetch_profile(): void
    {
        $response = $this->getJson('/api/v1/auth/me');

        $response->assertStatus(401)->assertJsonPath('success', false);
    }

    public function test_logout_invalidates_session(): void
    {
        $user = $this->createUserWithRole('Teacher');

        $this->actingAs($user);

        $this->postJson('/api/v1/auth/logout')->assertOk();

        // Assert the 'web' guard explicitly: the auth:sanctum middleware that
        // authenticated the logout request itself switches the default guard to
        // 'sanctum' (Illuminate\Auth\Middleware\Authenticate::shouldUse()), whose
        // RequestGuard caches its resolved user independently of the 'web'
        // session guard this controller actually logs out — a testing-harness
        // artifact of the shared app instance, not something that happens
        // across real, separately-booted HTTP requests.
        $this->assertGuest('web');
    }
}