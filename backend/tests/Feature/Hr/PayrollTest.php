<?php

namespace Tests\Feature\Hr;

use App\Models\Payslip;
use App\Models\SalaryStructure;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class PayrollTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_hr_can_create_a_salary_structure_and_a_new_one_closes_the_previous(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacher = $this->createUserWithRole('Teacher');

        $first = $this->actingAs($hr)->postJson('/api/v1/salary-structures', [
            'user_id' => $teacher->id, 'basic_salary' => 3000, 'effective_from' => now()->subMonth()->toDateString(),
        ]);
        $first->assertCreated()->assertJsonPath('data.is_active', true);

        $second = $this->actingAs($hr)->postJson('/api/v1/salary-structures', [
            'user_id' => $teacher->id, 'basic_salary' => 3500, 'effective_from' => now()->toDateString(),
        ]);
        $second->assertCreated();

        $this->assertSame(1, SalaryStructure::query()->where('user_id', $teacher->id)->where('is_active', true)->count());
        $this->assertDatabaseHas('salary_structures', ['id' => $first->json('data.id'), 'is_active' => false]);
    }

    public function test_bulk_payroll_generation_creates_one_payslip_per_active_structure_and_is_idempotent(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacherA = $this->createUserWithRole('Teacher');
        $teacherB = $this->createUserWithRole('Teacher');

        SalaryStructure::factory()->create(['user_id' => $teacherA->id, 'basic_salary' => 3000, 'allowances' => 200, 'deductions' => 50]);
        SalaryStructure::factory()->create(['user_id' => $teacherB->id, 'basic_salary' => 4000, 'allowances' => 0, 'deductions' => 0]);

        $payload = ['month' => now()->month, 'year' => now()->year];

        $first = $this->actingAs($hr)->postJson('/api/v1/payslips/generate', $payload);
        $first->assertOk()->assertJsonPath('data.created_count', 2);

        $this->assertDatabaseHas('payslips', ['user_id' => $teacherA->id, 'net_salary' => 3150]);

        $second = $this->actingAs($hr)->postJson('/api/v1/payslips/generate', $payload);
        $second->assertOk()->assertJsonPath('data.created_count', 0)->assertJsonPath('data.skipped_count', 2);

        $this->assertSame(2, Payslip::query()->count());
    }

    public function test_staff_member_sees_only_their_own_payslips(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $teacherA = $this->createUserWithRole('Teacher');
        $teacherB = $this->createUserWithRole('Teacher');

        Payslip::factory()->create(['user_id' => $teacherA->id, 'generated_by' => $hr->id]);
        Payslip::factory()->create(['user_id' => $teacherB->id, 'generated_by' => $hr->id]);

        $response = $this->actingAs($teacherA)->getJson('/api/v1/payslips?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_principal_cannot_view_payroll(): void
    {
        $principal = $this->createUserWithRole('Principal');

        $response = $this->actingAs($principal)->getJson('/api/v1/salary-structures');

        $response->assertStatus(403);
    }

    public function test_marking_a_payslip_paid_twice_is_rejected(): void
    {
        $hr = $this->createUserWithRole('HR Staff');
        $payslip = Payslip::factory()->create(['generated_by' => $hr->id]);

        $this->actingAs($hr)->postJson("/api/v1/payslips/{$payslip->id}/mark-paid")->assertOk()->assertJsonPath('data.status', 'paid');

        $response = $this->actingAs($hr)->postJson("/api/v1/payslips/{$payslip->id}/mark-paid");

        $response->assertStatus(422);
    }
}
