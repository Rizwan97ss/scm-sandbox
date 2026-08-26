<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * Before EnsureUserIsActive existed, UserStatus was only ever checked once,
 * at login (LoginRequest::authenticate()) — a user suspended mid-session
 * kept every existing request working indefinitely. This proves the
 * global middleware actually kills a suspended user's session on their
 * very next request, not just that a fresh login is blocked.
 */
class EnsureUserIsActiveTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_a_suspended_users_existing_session_is_rejected_on_the_next_request(): void
    {
        $user = $this->createUserWithRole('Teacher', ['status' => 'suspended']);

        $response = $this->actingAs($user)->getJson('/api/v1/dashboard/summary');

        $response->assertStatus(401);
    }

    public function test_an_active_users_session_still_works(): void
    {
        $user = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($user)->getJson('/api/v1/dashboard/summary');

        $response->assertOk();
    }
}
