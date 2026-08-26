<?php

namespace Tests\Feature\Library;

use App\Enums\SettingType;
use App\Models\AcademicYear;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\School;
use App\Models\Student;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class LibraryTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_librarian_can_create_a_book(): void
    {
        $librarian = $this->createUserWithRole('Librarian');

        $response = $this->actingAs($librarian)->postJson('/api/v1/books', [
            'title' => 'Introduction to Algorithms', 'author' => 'Cormen', 'total_copies' => 3,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.available_copies', 3);
        $this->assertDatabaseHas('books', ['title' => 'Introduction to Algorithms', 'available_copies' => 3]);
    }

    public function test_teacher_cannot_create_a_book(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->postJson('/api/v1/books', ['title' => 'X', 'total_copies' => 1]);

        $response->assertStatus(403);
    }

    public function test_issuing_a_book_decrements_available_copies_and_returning_it_restores_them(): void
    {
        $librarian = $this->createUserWithRole('Librarian');
        $book = Book::factory()->create(['total_copies' => 2, 'available_copies' => 2]);
        $student = $this->makeStudent();

        $issue = $this->actingAs($librarian)->postJson("/api/v1/books/{$book->id}/issue", [
            'student_id' => $student->id, 'due_date' => now()->addWeek()->toDateString(),
        ]);
        $issue->assertCreated();
        $this->assertSame(1, $book->fresh()->available_copies);

        $return = $this->actingAs($librarian)->postJson("/api/v1/book-issues/{$issue->json('data.id')}/return");
        $return->assertOk()->assertJsonPath('data.status', 'returned');
        $this->assertSame(2, $book->fresh()->available_copies);
    }

    public function test_a_late_return_incurs_a_fine_based_on_the_library_fine_per_day_setting(): void
    {
        $librarian = $this->createUserWithRole('Librarian');
        app(SettingsService::class)->set('library.fine_per_day', 5, SettingType::Integer, 'library');
        $book = Book::factory()->create(['total_copies' => 1, 'available_copies' => 1]);
        $student = $this->makeStudent();

        $issue = BookIssue::factory()->create([
            'book_id' => $book->id, 'student_id' => $student->id, 'user_id' => null,
            'due_date' => now()->subDays(3)->toDateString(), 'issued_by' => $librarian->id,
        ]);

        $response = $this->actingAs($librarian)->postJson("/api/v1/book-issues/{$issue->id}/return");

        $response->assertOk();
        $this->assertGreaterThanOrEqual(10, $response->json('data.fine_amount'));
    }

    public function test_cannot_issue_a_book_with_no_available_copies(): void
    {
        $librarian = $this->createUserWithRole('Librarian');
        $book = Book::factory()->create(['total_copies' => 1, 'available_copies' => 0]);
        $student = $this->makeStudent();

        $response = $this->actingAs($librarian)->postJson("/api/v1/books/{$book->id}/issue", [
            'student_id' => $student->id, 'due_date' => now()->addWeek()->toDateString(),
        ]);

        $response->assertStatus(422);
    }

    public function test_issue_requires_exactly_one_of_student_or_user(): void
    {
        $librarian = $this->createUserWithRole('Librarian');
        $book = Book::factory()->create(['total_copies' => 1, 'available_copies' => 1]);
        $student = $this->makeStudent();

        $response = $this->actingAs($librarian)->postJson("/api/v1/books/{$book->id}/issue", [
            'student_id' => $student->id, 'user_id' => $librarian->id, 'due_date' => now()->addWeek()->toDateString(),
        ]);

        $response->assertStatus(422);
    }

    private function makeStudent(): Student
    {
        $year = AcademicYear::factory()->create();

        return Student::factory()->create(['academic_year_id' => $year->id]);
    }
}
