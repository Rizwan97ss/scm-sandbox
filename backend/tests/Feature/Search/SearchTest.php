<?php

namespace Tests\Feature\Search;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Section;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_search_finds_a_student_by_name(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $section = $this->makeSection();
        Student::factory()->create([
            'academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id,
            'first_name' => 'Zephyrine', 'last_name' => 'Quibble',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=Zephyrine');

        $response->assertOk();
        $this->assertCount(1, $response->json('data.results.students'));
        $this->assertSame('Zephyrine Quibble', $response->json('data.results.students.0.label'));
    }

    public function test_search_finds_a_student_by_full_first_and_last_name(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $section = $this->makeSection();
        Student::factory()->create([
            'academic_year_id' => $section->academic_year_id, 'current_section_id' => $section->id,
            'first_name' => 'Sam', 'last_name' => 'Student',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/v1/search?q='.urlencode('Sam Student'));

        $response->assertOk();
        $this->assertCount(1, $response->json('data.results.students'));
        $this->assertSame('Sam Student', $response->json('data.results.students.0.label'));
    }

    public function test_search_omits_a_category_the_caller_lacks_permission_for(): void
    {
        $librarian = $this->createUserWithRole('Librarian');

        $response = $this->actingAs($librarian)->getJson('/api/v1/search?q=anything');

        $response->assertOk();
        // Librarian holds library.view (so 'books' is present) and students.view
        // (needed to look up a student when issuing a book, see Phase 10), but
        // not users.view/invoices.view/guardians.view.
        $this->assertArrayHasKey('books', $response->json('data.results'));
        $this->assertArrayNotHasKey('staff', $response->json('data.results'));
        $this->assertArrayNotHasKey('invoices', $response->json('data.results'));
        $this->assertArrayNotHasKey('guardians', $response->json('data.results'));
    }

    public function test_search_requires_at_least_two_characters(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->getJson('/api/v1/search?q=a');

        $response->assertOk()->assertJsonPath('data.results', []);
    }

    private function makeSection(): Section
    {
        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();

        return Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
    }
}
