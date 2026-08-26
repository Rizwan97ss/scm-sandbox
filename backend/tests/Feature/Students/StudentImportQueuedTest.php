<?php

namespace Tests\Feature\Students;

use App\Enums\ImportLogStatus;
use App\Jobs\ProcessStudentImportJob;
use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\ImportLog;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * A file over StudentImportController::ASYNC_THRESHOLD_BYTES (256 KB) is
 * handed to ProcessStudentImportJob instead of processed inline — see that
 * controller's docblock. CSV, not XLSX, on purpose: XLSX is a zip, so a
 * padded column compresses away and never reliably crosses the byte
 * threshold; a raw CSV's size on disk is exactly its content length.
 */
class StudentImportQueuedTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function bigCsv(): UploadedFile
    {
        Storage::fake('local');

        $headings = ['first_name', 'last_name', 'gender', 'date_of_birth', 'grade_level_code', 'section_name', 'previous_school_name'];
        // previous_school_name carries no length rule in StudentsImport::rules() — safe padding that won't fail validation.
        $padding = str_repeat('x', 300_000);
        $csv = implode(',', $headings)."\n".implode(',', ['Big', 'File', 'male', '2015-01-01', 'G1', 'A', $padding])."\n";

        Storage::disk('local')->put('big-import-test.csv', $csv);

        return new UploadedFile(Storage::disk('local')->path('big-import-test.csv'), 'big-import-test.csv', 'text/csv', null, true);
    }

    private function setUpAcademicStructure(): void
    {
        $year = AcademicYear::factory()->create(['is_current' => true]);
        $gradeLevel = GradeLevel::factory()->create(['code' => 'G1']);
        Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A']);
    }

    public function test_a_large_file_is_queued_instead_of_processed_inline(): void
    {
        Bus::fake();
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $this->bigCsv()], ['Accept' => 'application/json']);

        $response->assertStatus(202);
        $this->assertTrue($response->json('data.queued'));
        $logId = $response->json('data.import_log_id');
        $this->assertNotNull($logId);

        $log = ImportLog::query()->findOrFail($logId);
        $this->assertEquals(ImportLogStatus::Queued, $log->status);
        $this->assertDatabaseCount('students', 0); // the job hasn't actually run — Bus::fake() intercepted it.

        Bus::assertDispatched(ProcessStudentImportJob::class);
    }

    public function test_a_dry_run_is_never_queued_regardless_of_file_size(): void
    {
        Bus::fake();
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();

        $response = $this->actingAs($admin)->post('/api/v1/students/import', [
            'file' => $this->bigCsv(),
            'dry_run' => true,
        ], ['Accept' => 'application/json']);

        $response->assertOk(); // not 202 — ran inline, same as any other dry run.
        $this->assertTrue($response->json('data.dry_run'));
        $this->assertEquals(1, $response->json('data.imported_count'));

        Bus::assertNotDispatched(ProcessStudentImportJob::class);
    }

    /**
     * QUEUE_CONNECTION=sync in the test environment (see phpunit.xml), so
     * dispatch() here actually runs ProcessStudentImportJob::handle()
     * synchronously, in-process — proving the job's own logic end-to-end
     * (not just that dispatch happened), without needing a real worker.
     */
    public function test_the_queued_job_actually_creates_the_student_and_completes_the_log(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $this->bigCsv()], ['Accept' => 'application/json']);

        $response->assertStatus(202);
        $log = ImportLog::query()->findOrFail($response->json('data.import_log_id'));

        $this->assertEquals(ImportLogStatus::Completed, $log->status);
        $this->assertEquals(1, $log->created_count);
        $this->assertEquals(0, $log->failed_count);
        $this->assertDatabaseHas('students', ['first_name' => 'Big', 'last_name' => 'File']);
        // ProcessStudentImportJob stores its own working copy under imports/ (separate from the
        // original test fixture above) and deletes it once done — confirm that cleanup happened.
        $this->assertEmpty(Storage::disk('local')->files('imports'));
    }

    public function test_a_failed_row_in_a_queued_import_is_recorded_on_the_log(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();
        Storage::fake('local');

        $headings = ['first_name', 'last_name', 'gender', 'date_of_birth', 'grade_level_code', 'section_name', 'previous_school_name'];
        $padding = str_repeat('x', 300_000);
        // date_of_birth left blank — fails StudentsImport::rules()'s required rule.
        $csv = implode(',', $headings)."\n".implode(',', ['Broken', 'Row', 'male', '', 'G1', 'A', $padding])."\n";
        Storage::disk('local')->put('big-broken-import-test.csv', $csv);
        $file = new UploadedFile(Storage::disk('local')->path('big-broken-import-test.csv'), 'big-broken-import-test.csv', 'text/csv', null, true);

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $file], ['Accept' => 'application/json']);

        $response->assertStatus(202);
        $log = ImportLog::query()->findOrFail($response->json('data.import_log_id'));

        $this->assertEquals(ImportLogStatus::Completed, $log->status);
        $this->assertEquals(0, $log->created_count);
        $this->assertEquals(1, $log->failed_count);
        $this->assertCount(1, $log->failures);
        $this->assertEquals('date_of_birth', $log->failures[0]['attribute']);
        $this->assertDatabaseCount('students', 0);
    }

    public function test_import_log_show_endpoint_is_what_the_frontend_polls(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->setUpAcademicStructure();

        $response = $this->actingAs($admin)->post('/api/v1/students/import', ['file' => $this->bigCsv()], ['Accept' => 'application/json']);
        $logId = $response->json('data.import_log_id');

        $show = $this->actingAs($admin)->getJson("/api/v1/import-logs/{$logId}");

        $show->assertOk();
        $this->assertEquals('completed', $show->json('data.status'));
        $this->assertEquals(1, $show->json('data.created_count'));
    }
}
