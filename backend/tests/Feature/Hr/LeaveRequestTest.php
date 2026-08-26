<?php

namespace Tests\Feature\Hr;

use App\Models\LeaveType;
use App\Models\StaffAttendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class LeaveRequestTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_teacher_can_apply_for_their_own_leave(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $leaveType = LeaveType::factory()->create();

        $response = $this->actingAs($teacher)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->addDays(2)->toDateString(),
            'reason' => 'Family event',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.days', 3);
        $response->assertJsonPath('data.status', 'pending');
        $this->assertDatabaseHas('leave_requests', ['user_id' => $teacher->id, 'status' => 'pending']);
    }

    public function test_student_cannot_apply_for_leave(): void
    {
        $student = $this->createUserWithRole('Student');
        $leaveType = LeaveType::factory()->create();

        $response = $this->actingAs($student)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id,
            'start_date' => now()->addWeek()->toDateString(),
            'end_date' => now()->addWeek()->toDateString(),
            'reason' => 'n/a',
        ]);

        $response->assertStatus(403);
    }

    public function test_staff_member_only_sees_their_own_leave_requests_without_leave_view(): void
    {
        $teacherA = $this->createUserWithRole('Teacher');
        $teacherB = $this->createUserWithRole('Teacher');
        $leaveType = LeaveType::factory()->create();

        $this->actingAs($teacherA)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'reason' => 'A',
        ])->assertCreated();
        $this->actingAs($teacherB)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'reason' => 'B',
        ])->assertCreated();

        $response = $this->actingAs($teacherA)->getJson('/api/v1/leave-requests?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_hr_staff_sees_every_leave_request(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $hr = $this->createUserWithRole('HR Staff');
        $leaveType = LeaveType::factory()->create();

        $this->actingAs($teacher)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'reason' => 'A',
        ])->assertCreated();

        $response = $this->actingAs($hr)->getJson('/api/v1/leave-requests?per_page=50');

        $response->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_approving_a_leave_request_marks_staff_attendance_as_on_leave_for_each_day(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $hr = $this->createUserWithRole('HR Staff');
        $leaveType = LeaveType::factory()->create();

        $start = now()->addWeek()->startOfWeek();
        $end = (clone $start)->addDays(1);

        $create = $this->actingAs($teacher)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'reason' => 'Trip',
        ]);
        $leaveRequestId = $create->json('data.id');

        $response = $this->actingAs($hr)->postJson("/api/v1/leave-requests/{$leaveRequestId}/review", [
            'status' => 'approved',
        ]);

        $response->assertOk()->assertJsonPath('data.status', 'approved');
        $this->assertSame(2, StaffAttendance::query()->where('user_id', $teacher->id)->where('status', 'on_leave')->count());
    }

    public function test_teacher_cannot_approve_their_own_leave_request(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $leaveType = LeaveType::factory()->create();

        $create = $this->actingAs($teacher)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'reason' => 'A',
        ]);
        $leaveRequestId = $create->json('data.id');

        $response = $this->actingAs($teacher)->postJson("/api/v1/leave-requests/{$leaveRequestId}/review", [
            'status' => 'approved',
        ]);

        $response->assertStatus(403);
    }

    public function test_staff_member_can_cancel_their_own_pending_request_but_not_after_review(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $hr = $this->createUserWithRole('HR Staff');
        $leaveType = LeaveType::factory()->create();

        $create = $this->actingAs($teacher)->postJson('/api/v1/leave-requests', [
            'leave_type_id' => $leaveType->id, 'start_date' => now()->toDateString(), 'end_date' => now()->toDateString(), 'reason' => 'A',
        ]);
        $leaveRequestId = $create->json('data.id');

        $this->actingAs($hr)->postJson("/api/v1/leave-requests/{$leaveRequestId}/review", ['status' => 'approved'])->assertOk();

        $response = $this->actingAs($teacher)->postJson("/api/v1/leave-requests/{$leaveRequestId}/cancel");

        $response->assertStatus(403);
    }
}
