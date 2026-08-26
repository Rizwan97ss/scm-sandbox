<?php

namespace Tests\Feature\Users;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class UserExportTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    /**
     * The real regression this guards against: /users/{user} was registered
     * before /users/export, so a request to /users/export was matched as
     * {user}="export" (a nonexistent user id) and 404'd before ever reaching
     * UserExportController — a route-declaration-order bug that route:list
     * inspection alone doesn't make obvious, only an actual request does.
     */
    public function test_export_route_is_not_shadowed_by_the_show_route(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->get('/api/v1/users/export');

        $response->assertOk();
        $this->assertStringContainsString('spreadsheetml', $response->headers->get('Content-Type'));
    }

    public function test_export_respects_the_ids_filter(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $included = $this->createUserWithRole('Teacher', ['first_name' => 'Included']);
        $this->createUserWithRole('Teacher', ['first_name' => 'Excluded']);

        $response = $this->actingAs($admin)->get("/api/v1/users/export?ids={$included->id}");

        $response->assertOk();
        $tmp = tempnam(sys_get_temp_dir(), 'user-export-test').'.xlsx';
        file_put_contents($tmp, $response->streamedContent());
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
        $sheet = $reader->load($tmp)->getActiveSheet();
        unlink($tmp);

        $this->assertEquals('Included', $sheet->getCell('A2')->getValue());
        $this->assertNull($sheet->getCell('A3')->getValue());
    }

    public function test_export_requires_the_export_permission(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $this->actingAs($teacher)->get('/api/v1/users/export')->assertForbidden();
    }
}
