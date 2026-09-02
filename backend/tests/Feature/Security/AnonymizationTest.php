<?php

namespace Tests\Feature\Security;

use App\Models\Guardian;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class AnonymizationTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_admin_deleting_a_user_anonymizes_pii_but_preserves_academic_identity(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $studentUser = $this->createUserWithRole('Student', [
            'first_name' => 'Real', 'last_name' => 'Name', 'phone' => '555-1234',
        ]);
        $student = Student::factory()->create([
            'user_id' => $studentUser->id, 'first_name' => 'Real', 'last_name' => 'Name',
            'medical_info' => 'Peanut allergy', 'emergency_contact_phone' => '555-9999',
        ]);

        $this->actingAs($admin);
        $this->deleteJson("/api/v1/users/{$studentUser->id}")->assertStatus(200);

        $studentUser->refresh();
        $this->assertSoftDeleted($studentUser);
        $this->assertEquals('Deleted', $studentUser->first_name);
        $this->assertStringContainsString('anonymized.invalid', $studentUser->email);
        $this->assertEquals('inactive', $studentUser->status->value);

        $student->refresh();
        $this->assertNull($student->medical_info);
        $this->assertNull($student->emergency_contact_phone);
        // Academic identity (name, FKs, enrollment) is deliberately NOT
        // scrubbed — see AnonymizationService's docblock.
        $this->assertEquals('Real', $student->first_name);
    }

    public function test_deleting_a_guardian_scrubs_their_own_identity_entirely(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $guardianUser = $this->createUserWithRole('Parent');
        $guardian = Guardian::factory()->create([
            'user_id' => $guardianUser->id, 'first_name' => 'Real', 'last_name' => 'Parent', 'national_id' => 'X123',
        ]);

        $this->actingAs($admin);
        $this->deleteJson("/api/v1/users/{$guardianUser->id}")->assertStatus(200);

        $guardian->refresh();
        $this->assertEquals('Deleted', $guardian->first_name);
        $this->assertNull($guardian->national_id);
        $this->assertNull($guardian->email);
    }

    public function test_self_service_account_deletion_logs_the_user_out(): void
    {
        $user = $this->createUserWithRole('Teacher', ['email' => 'self-delete@mfa.test']);
        $this->actingAs($user);

        $this->deleteJson('/api/v1/account', ['password' => 'password'])->assertStatus(200);

        $user->refresh();
        $this->assertSoftDeleted($user);
        $this->assertStringContainsString('anonymized.invalid', $user->email);

        $this->app['auth']->forgetGuards();
        $this->assertGuest();
    }
}