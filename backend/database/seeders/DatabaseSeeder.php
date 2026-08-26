<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * Order matters: each seeder depends on state the previous one created
     * (permissions before roles, roles before the admin user gets one
     * assigned, academic structure before students can be admitted into a
     * section).
     */
    public function run(): void
    {
        $this->call([
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            AdminUserSeeder::class,
            SettingSeeder::class,
            ExamConfigSeeder::class,
            TenantDemoDataSeeder::class,
        ]);
    }
}