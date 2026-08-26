<?php

namespace Tests\Concerns;

use App\Models\User;

trait InteractsWithUsers
{
    protected function createUserWithRole(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->assignRole($role);

        return $user;
    }
}