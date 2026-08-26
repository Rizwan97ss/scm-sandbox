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

class StudentImportExportTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_admin_can_import_students_with_partial_failure_report(): void
    {
        Storage::fake('local');

        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create(['is_current' => true]);
        $gradeLevel = GradeLevel::factory()->create(['code' => 'G1']);
        Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A']);

        $rows = [
            ['Valid', 'Student', 'female', '2018-05-01', 'G1', 'A', '', now()->toDateString(), '', '', '', '', ''],
            ['Invalid', 'Student', 'female', '', 'G1', 'A', '', now()->toDateString(), '', '', '', '', ''],
        ];

        Excel::store(new class($rows) implements FromArray, WithHeadings
        {
            public function __construct(private array $rows) {}

            public function array(): array
            {
                return $this->rows;
            }

            public function headings(): array
            {
                return [
                    'first_name', 'last_name', 'gender', 'date_of_birth', 'grade_level_code', 'section_name',
                    'roll_number', 'admission_date', 'blood_group', 'nationality', 'previous_school_name',
                    'emergency_contact_name', 'emergency_contact_phone',
                ];
            }
        }, 'import-test.xlsx', 'local');

        $uploadedFile = new UploadedFile(
            Storage::disk('local')->path('import-test.xlsx'),
            'import-test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($admin)->post('/api/v1/students/import', [
            'file' => $uploadedFile,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(1, $response->json('data.imported_count'));
        $this->assertEquals(1, $response->json('data.failed_count'));
        $this->assertDatabaseHas('students', ['first_name' => 'Valid']);
        $this->assertDatabaseMissing('students', ['first_name' => 'Invalid']);
    }

    public function test_admin_can_import_students_with_guardians_via_guardian_slots(): void
    {
        Storage::fake('local');

        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create(['is_current' => true]);
        $gradeLevel = GradeLevel::factory()->create(['code' => 'G1']);
        Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A']);

        $headings = [
            'first_name', 'last_name', 'gender', 'date_of_birth', 'grade_level_code', 'section_name',
            'roll_number', 'admission_date', 'blood_group', 'nationality', 'previous_school_name',
            'emergency_contact_name', 'emergency_contact_phone', 'address_line1', 'city',
            'guardian1_first_name', 'guardian1_last_name', 'guardian1_email', 'guardian1_phone',
            'guardian1_relationship', 'guardian1_is_primary', 'guardian1_can_pickup',
            'guardian2_first_name', 'guardian2_last_name', 'guardian2_email', 'guardian2_phone',
            'guardian2_relationship', 'guardian2_is_primary', 'guardian2_can_pickup',
        ];

        $rows = [
            [
                'Sam', 'Sibling', 'male', '2017-01-01', 'G1', 'A',
                '', now()->toDateString(), '', '', '',
                '', '', '123 Riverside Avenue', 'Springfield',
                'John', 'Sibling', 'john.sibling@example.com', '+1-555-0101',
                'father', 'yes', 'yes',
                'Mary', 'Sibling', 'mary.sibling@example.com', '+1-555-0102',
                'mother', 'no', 'yes',
            ],
            [
                'Sally', 'Sibling', 'female', '2019-01-01', 'G1', 'A',
                '', now()->toDateString(), '', '', '',
                '', '', '', '',
                'John', 'Sibling', 'john.sibling@example.com', '+1-555-0101',
                'father', 'yes', 'yes',
                '', '', '', '',
                '', '', '',
            ],
        ];

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
        }, 'import-guardians-test.xlsx', 'local');

        $uploadedFile = new UploadedFile(
            Storage::disk('local')->path('import-guardians-test.xlsx'),
            'import-guardians-test.xlsx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            null,
            true
        );

        $response = $this->actingAs($admin)->post('/api/v1/students/import', [
            'file' => $uploadedFile,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $this->assertEquals(2, $response->json('data.imported_count'));
        $this->assertEquals(0, $response->json('data.failed_count'));

        $sam = Student::query()->where('first_name', 'Sam')->firstOrFail();
        $this->assertEquals('123 Riverside Avenue', $sam->address_line1);
        $this->assertEquals('Springfield', $sam->city);
        $this->assertCount(2, $sam->guardians);

        $father = $sam->guardians()->where('email', 'john.sibling@example.com')->firstOrFail();
        $this->assertEquals('father', $father->pivot->relationship_type->value);
        $this->assertTrue((bool) $father->pivot->is_primary);
        $this->assertTrue((bool) $father->pivot->can_pickup);

        $mother = $sam->guardians()->where('email', 'mary.sibling@example.com')->firstOrFail();
        $this->assertEquals('mother', $mother->pivot->relationship_type->value);
        $this->assertFalse((bool) $mother->pivot->is_primary);

        // The second row's father matches the first row's by email — reused, not duplicated.
        $this->assertDatabaseCount('guardians', 2);
        $sally = Student::query()->where('first_name', 'Sally')->firstOrFail();
        $this->assertCount(1, $sally->guardians);
        $this->assertEquals($father->id, $sally->guardians()->first()->id);
    }

    public function test_admin_can_export_students_to_excel(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        Student::factory()->create([
            'academic_year_id' => $year->id,
            'current_grade_level_id' => $gradeLevel->id,
            'current_section_id' => $section->id,
        ]);

        $response = $this->actingAs($admin)->get('/api/v1/students/export');

        $response->assertOk();
        $this->assertStringContainsString(
            'spreadsheetml',
            $response->headers->get('Content-Type')
        );
    }

    /** Backs the Students list page's "Export selected" bulk action — the ids filter must scope the file to exactly those rows, not silently export everyone. */
    public function test_export_with_ids_filter_only_includes_the_selected_students(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $included = Student::factory()->create([
            'first_name' => 'Included', 'academic_year_id' => $year->id,
            'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);
        Student::factory()->create([
            'first_name' => 'Excluded', 'academic_year_id' => $year->id,
            'current_grade_level_id' => $gradeLevel->id, 'current_section_id' => $section->id,
        ]);

        $response = $this->actingAs($admin)->get("/api/v1/students/export?ids={$included->id}");

        $response->assertOk();
        $tmp = tempnam(sys_get_temp_dir(), 'export-ids-test').'.xlsx';
        file_put_contents($tmp, $response->streamedContent());
        $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReader('Xlsx');
        $sheet = $reader->load($tmp)->getActiveSheet();
        unlink($tmp);

        $this->assertEquals('Included', $sheet->getCell('B2')->getValue());
        $this->assertNull($sheet->getCell('B3')->getValue()); // no second data row
    }

    public function test_import_template_can_be_downloaded(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->get('/api/v1/students/import/template');

        $response->assertOk();
    }
}
