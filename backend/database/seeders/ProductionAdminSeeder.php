<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Creates this deployment's real School Admin account (the top role — see
 * architecture.md, there is no separate "Super Admin" layer above it).
 *
 * Unlike AdminUserSeeder (fixed demo credentials, safe to re-run on any
 * environment), this reads real credentials from ADMIN_EMAIL/ADMIN_PASSWORD/
 * ADMIN_FIRST_NAME/ADMIN_LAST_NAME env vars, falling back to interactive
 * prompts. Not called from DatabaseSeeder — run it explicitly, once, per new
 * customer deployment:
 *
 *   php artisan db:seed --class=ProductionAdminSeeder --force
 *
 * Requires RolePermissionSeeder to have already run (needs the "School
 * Admin" role to exist).
 */
class ProductionAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL') ?: $this->command?->ask('School Admin email');
        $firstName = env('ADMIN_FIRST_NAME') ?: $this->command?->ask('First name');
        $lastName = env('ADMIN_LAST_NAME') ?: $this->command?->ask('Last name');
        $password = env('ADMIN_PASSWORD') ?: $this->command?->secret('Password (min 10 chars, mixed case, numbers)');

        if (! $email || ! $password) {
            $this->command?->error('Email and password are required. Set ADMIN_EMAIL/ADMIN_PASSWORD env vars or run this seeder interactively.');

            return;
        }

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'first_name' => $firstName ?: 'School',
                'last_name' => $lastName ?: 'Admin',
                'password' => Hash::make($password),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $user->hasRole('School Admin')) {
            $user->assignRole('School Admin');
        }

        $this->command?->info("School Admin created: {$email}");
    }
}
