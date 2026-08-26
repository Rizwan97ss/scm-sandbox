<?php

namespace Tests\Feature\Students;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Facades\Excel;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class StudentDuplicateWarningTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function setUpAcademicStructure(): void
    {
        $year = AcademicYear::factory()->create(['is_current' => true]);
        $gradeLevel = GradeLevel::factory()->create(['code' => 'G1']);
        Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A']);
    }

    private function uploadedFile(array $rows, string $name = 'dup-warning-test.xlsx'): UploadedFile
    {
        Storage::fake('local');
        $headings = ['first_name', 'last_name', 'gender', 'date_of_birth', 'grade_level_code', 'section_name'];

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
        }, $name, 'local');

        return new UploadedFile(
            Storage::disk('local')->path($name),
            $name,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );
    }

    public function test_a_close_name_match_with_the_same_date_of_birth_is_warned_but_still_imported(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();
        Student::factory()->create(['first_name' => 'Rahul', 'last_name' => 'Sharma', 'date_of_birth' => '2015-06-14']);

        // Typo-distance name, exact same DOB.
        $file = $this->uploadedFile([['Rahull', 'Sharma', 'male', '2015-06-14', 'G1', 'A']]);

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.imported_count'));
        $this->assertEquals(0, $response->json('data.failed_count'));
        $this->assertCount(1, $response->json('data.warnings'));
        $this->assertStringContainsString('Rahul Sharma', $response->json('data.warnings.0.message'));
        $this->assertDatabaseCount('students', 2); // both exist — never auto-merged
    }

    public function test_same_date_of_birth_but_a_clearly_different_name_is_not_warned(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();
        Student::factory()->create(['first_name' => 'Rahul', 'last_name' => 'Sharma', 'date_of_birth' => '2015-06-14']);

        $file = $this->uploadedFile([['Priya', 'Patel', 'female', '2015-06-14', 'G1', 'A']]);

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertCount(0, $response->json('data.warnings'));
    }

    public function test_same_name_but_a_different_date_of_birth_is_not_warned(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();
        Student::factory()->create(['first_name' => 'Rahul', 'last_name' => 'Sharma', 'date_of_birth' => '2015-06-14']);

        $file = $this->uploadedFile([['Rahul', 'Sharma', 'male', '2016-01-01', 'G1', 'A']]);

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertCount(0, $response->json('data.warnings'));
    }

    public function test_dry_run_detects_the_same_warnings_as_a_real_import(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();
        Student::factory()->create(['first_name' => 'Rahul', 'last_name' => 'Sharma', 'date_of_birth' => '2015-06-14']);

        $file = $this->uploadedFile([['Rahul', 'Sharma', 'male', '2015-06-14', 'G1', 'A']]);

        $response = $this->actingAs($admin)->post('/api/v1/students/import', [
            'file' => $file,
            'dry_run' => true,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertCount(1, $response->json('data.warnings'));
        $this->assertDatabaseCount('students', 1); // dry run: nothing written
    }
}
