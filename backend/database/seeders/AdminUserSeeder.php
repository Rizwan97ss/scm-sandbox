<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds the first School Admin account. Must run after RolePermissionSeeder
 * (needs the "School Admin" role to exist) and before TenantDemoDataSeeder,
 * which reuses this exact account rather than creating a second admin.
 */
class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'admin@riverside-demo.test'],
            [
                'first_name' => 'Alice',
                'last_name' => 'Admin',
                'password' => Hash::make('password'),
                'status' => 'active',
                'email_verified_at' => now(),
            ]
        );

        if (! $user->hasRole('School Admin')) {
            $user->assignRole('School Admin');
        }

        $this->command?->info('School Admin seeded: admin@riverside-demo.test / password');
    }
}