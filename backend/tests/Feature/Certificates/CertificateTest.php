<?php

namespace Tests\Feature\Certificates;

use App\Models\AcademicYear;
use App\Models\CertificateTemplate;
use App\Models\School;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class CertificateTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_school_admin_can_create_a_certificate_template(): void
    {
        $admin = $this->createUserWithRole('School Admin');

        $response = $this->actingAs($admin)->postJson('/api/v1/certificate-templates', [
            'name' => 'Bonafide Certificate',
            'type' => 'Bonafide',
            'body' => 'This certifies that {{student_name}} ({{admission_number}}) studies at {{school_name}}.',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('certificate_templates', ['name' => 'Bonafide Certificate']);
    }

    public function test_teacher_cannot_create_a_certificate_template(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->postJson('/api/v1/certificate-templates', [
            'name' => 'X', 'type' => 'Y', 'body' => 'Z',
        ]);

        $response->assertStatus(403);
    }

    public function test_issuing_a_certificate_renders_placeholders_and_generates_a_sequential_number(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $template = CertificateTemplate::factory()->create([
            'body' => 'This certifies that {{student_name}} ({{admission_number}}) is a student of {{school_name}}.',
        ]);
        $student = $this->makeStudent();

        $response = $this->actingAs($admin)->postJson("/api/v1/certificate-templates/{$template->id}/issue", [
            'student_id' => $student->id,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.certificate_number', 'CERT-'.now()->year.'-0001');
        $this->assertStringContainsString($student->full_name, $response->json('data.content'));
        $this->assertStringContainsString($student->admission_number, $response->json('data.content'));
        $this->assertStringNotContainsString('{{', $response->json('data.content'));
    }

    public function test_receptionist_cannot_issue_a_certificate(): void
    {
        $receptionist = $this->createUserWithRole('Receptionist');
        $template = CertificateTemplate::factory()->create();
        $student = $this->makeStudent();

        $response = $this->actingAs($receptionist)->postJson("/api/v1/certificate-templates/{$template->id}/issue", [
            'student_id' => $student->id,
        ]);

        $response->assertStatus(403);
    }

    public function test_student_sees_only_their_own_issued_certificates(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $template = CertificateTemplate::factory()->create();
        $studentA = $this->makeStudent();
        $studentB = $this->makeStudent();
        $studentAUser = $this->createUserWithRole('Student');
        $studentA->update(['user_id' => $studentAUser->id]);

        $this->actingAs($admin)->postJson("/api/v1/certificate-templates/{$template->id}/issue", ['student_id' => $studentA->id])->assertCreated();
        $this->actingAs($admin)->postJson("/api/v1/certificate-templates/{$template->id}/issue", ['student_id' => $studentB->id])->assertCreated();

        $response = $this->actingAs($studentAUser)->getJson('/api/v1/certificates?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_certificate_pdf_is_reachable(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $template = CertificateTemplate::factory()->create();
        $student = $this->makeStudent();

        $issue = $this->actingAs($admin)->postJson("/api/v1/certificate-templates/{$template->id}/issue", ['student_id' => $student->id]);
        $certificateId = $issue->json('data.id');

        $response = $this->actingAs($admin)->get("/api/v1/certificates/{$certificateId}/pdf");

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    public function test_student_id_card_pdf_is_reachable_for_a_permitted_staff_member(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $student = $this->makeStudent();

        $response = $this->actingAs($admin)->get("/api/v1/students/{$student->id}/id-card/pdf");

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    public function test_staff_id_card_pdf_is_reachable_for_self(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->get("/api/v1/users/{$teacher->id}/id-card/pdf");

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    /** An unreachable/misconfigured branding.logo_url must not break card generation -- the card falls back to a monogram, same as a missing photo already does. */
    public function test_staff_id_card_still_renders_when_the_branding_logo_url_is_unreachable(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        app(\App\Services\SettingsService::class)->set('branding.logo_url', 'https://this-domain-does-not-exist.invalid/logo.png', isPublic: true);

        $response = $this->actingAs($admin)->get("/api/v1/users/{$admin->id}/id-card/pdf");

        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    private function makeStudent(): Student
    {
        $year = AcademicYear::factory()->create();

        return Student::factory()->create(['academic_year_id' => $year->id]);
    }
}
