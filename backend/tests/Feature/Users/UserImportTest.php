<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class UserImportTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function uploadRows(array $rows, array $headings = ['first_name', 'last_name', 'email', 'role', 'phone', 'designation_name', 'employee_id', 'hire_date']): UploadedFile
    {
        Storage::fake('local');

        Excel::store(new class($rows, $headings) implements FromArray, WithHeadings
        {
            public function __construct(private array $rows, private array $headings) {}

            public function array(): array
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return $this->headings;
            }
        }, 'user-import-test.xlsx', 'local');

        return new UploadedFile(
            Storage::disk('local')->path('user-import-test.xlsx'),
            'user-import-test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );
    }

    public function test_admin_can_import_staff_and_role_is_assigned(): void
    {
        Notification::fake();
        $admin = $this->createUserWithRole('School Admin');

        $file = $this->uploadRows([
            ['Jane', 'Doe', 'jane.doe@example.com', 'Teacher', '', '', '', ''],
        ]);

        $response = $this->actingAs($admin)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.imported_count'));
        $this->assertEquals(0, $response->json('data.failed_count'));

        $user = User::query()->where('email', 'jane.doe@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('Teacher'));
        $this->assertTrue($user->must_change_password);
    }

    public function test_duplicate_email_within_the_same_file_fails_the_second_row(): void
    {
        Notification::fake();
        $admin = $this->createUserWithRole('School Admin');

        $file = $this->uploadRows([
            ['Jane', 'Doe', 'dup@example.com', 'Teacher', '', '', '', ''],
            ['Janet', 'Doe', 'dup@example.com', 'Teacher', '', '', '', ''],
        ]);

        $response = $this->actingAs($admin)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.imported_count'));
        $this->assertEquals(1, $response->json('data.failed_count'));
        $this->assertDatabaseCount('users', 2); // admin + the one successful import
    }

    public function test_row_with_unknown_role_fails_without_creating_a_user(): void
    {
        Notification::fake();
        $admin = $this->createUserWithRole('School Admin');

        $file = $this->uploadRows([
            ['Jane', 'Doe', 'jane.doe@example.com', 'Not A Real Role', '', '', '', ''],
        ]);

        $response = $this->actingAs($admin)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(0, $response->json('data.imported_count'));
        $this->assertEquals(1, $response->json('data.failed_count'));
        $this->assertDatabaseMissing('users', ['email' => 'jane.doe@example.com']);
    }

    /**
     * The actual regression this test guards against: users.import is
     * granted to HR Staff, who is deliberately NOT granted roles.edit
     * (UserPolicy::RESTRICTED_ROLES). Without UsersImport routing every
     * row's role through the same UserPolicy::create() check the single-
     * record POST /users endpoint uses, a bulk file would be a silent
     * privilege-escalation bypass letting HR Staff mint a School Admin
     * account.
     */
    public function test_hr_staff_cannot_use_import_to_grant_school_admin_role(): void
    {
        Notification::fake();
        $hr = $this->createUserWithRole('HR Staff');

        $file = $this->uploadRows([
            ['Evil', 'Admin', 'evil.admin@example.com', 'School Admin', '', '', '', ''],
        ]);

        $response = $this->actingAs($hr)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(0, $response->json('data.imported_count'));
        $this->assertEquals(1, $response->json('data.failed_count'));
        $this->assertDatabaseMissing('users', ['email' => 'evil.admin@example.com']);
    }

    public function test_school_admin_can_grant_school_admin_role_via_import(): void
    {
        Notification::fake();
        $admin = $this->createUserWithRole('School Admin');

        $file = $this->uploadRows([
            ['New', 'Admin', 'new.admin@example.com', 'School Admin', '', '', '', ''],
        ]);

        $response = $this->actingAs($admin)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.imported_count'));

        $user = User::query()->where('email', 'new.admin@example.com')->firstOrFail();
        $this->assertTrue($user->hasRole('School Admin'));
    }

    public function test_import_never_accepts_a_password_column(): void
    {
        Notification::fake();
        $admin = $this->createUserWithRole('School Admin');

        $file = $this->uploadRows(
            [['Jane', 'Doe', 'jane.doe@example.com', 'Teacher', '', '', '', '', 'attacker-chosen-password']],
            ['first_name', 'last_name', 'email', 'role', 'phone', 'designation_name', 'employee_id', 'hire_date', 'password'],
        );

        $response = $this->actingAs($admin)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $user = User::query()->where('email', 'jane.doe@example.com')->firstOrFail();
        $this->assertFalse(\Illuminate\Support\Facades\Hash::check('attacker-chosen-password', $user->password));
    }

    public function test_import_requires_the_import_permission(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $file = $this->uploadRows([
            ['Jane', 'Doe', 'jane.doe@example.com', 'Teacher', '', '', '', ''],
        ]);

        $response = $this->actingAs($teacher)->post('/api/v1/users/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertForbidden();
    }

    public function test_import_template_can_be_downloaded(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->get('/api/v1/users/import/template');

        $response->assertOk();
    }
}
