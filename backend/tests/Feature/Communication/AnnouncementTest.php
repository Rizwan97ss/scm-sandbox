<?php

namespace Tests\Feature\Communication;

use App\Jobs\SendPushJob;
use App\Jobs\SendSmsJob;
use App\Mail\AnnouncementMail;
use App\Models\AppNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Mail;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class AnnouncementTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_school_admin_can_send_an_announcement_to_students_and_it_creates_in_app_notifications(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $studentA = $this->createUserWithRole('Student');
        $studentB = $this->createUserWithRole('Student');
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Holiday Notice', 'body' => 'School closed Friday.', 'audience' => 'students', 'channels' => ['in_app'],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.recipient_count', 2);
        $this->assertDatabaseHas('app_notifications', ['user_id' => $studentA->id, 'title' => 'Holiday Notice']);
        $this->assertDatabaseHas('app_notifications', ['user_id' => $studentB->id, 'title' => 'Holiday Notice']);
        $this->assertDatabaseMissing('app_notifications', ['user_id' => $teacher->id]);
    }

    public function test_teacher_cannot_send_an_announcement(): void
    {
        $teacher = $this->createUserWithRole('Teacher');

        $response = $this->actingAs($teacher)->postJson('/api/v1/announcements', [
            'title' => 'X', 'body' => 'Y', 'audience' => 'all', 'channels' => ['in_app'],
        ]);

        $response->assertStatus(403);
    }

    public function test_email_channel_sends_mail_to_every_recipient_with_an_email(): void
    {
        Mail::fake();

        $admin = $this->createUserWithRole('School Admin');
        $staff = $this->createUserWithRole('Teacher', ['email' => 'staff@example.test']);

        $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Staff Meeting', 'body' => 'Meeting at 3pm.', 'audience' => 'staff', 'channels' => ['in_app', 'email'],
        ])->assertCreated();

        Mail::assertQueued(AnnouncementMail::class, fn ($mail) => $mail->recipient->id === $staff->id);
    }

    public function test_sms_channel_queues_a_job_per_recipient_with_a_phone_number(): void
    {
        $admin = $this->createUserWithRole('School Admin', ['phone' => null]);
        $this->createUserWithRole('Teacher', ['phone' => '+15551234567']);
        $this->createUserWithRole('Teacher', ['phone' => null]);

        Bus::fake();

        $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Staff Meeting', 'body' => 'Meeting at 3pm.', 'audience' => 'staff', 'channels' => ['in_app', 'sms'],
        ])->assertCreated();

        Bus::assertDispatched(SendSmsJob::class, fn (SendSmsJob $job) => $job->phone === '+15551234567');
        Bus::assertDispatchedTimes(SendSmsJob::class, 1);
    }

    public function test_push_channel_queues_a_job_for_every_recipient(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $this->createUserWithRole('Student');
        $this->createUserWithRole('Student');

        Bus::fake();

        $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Welcome', 'body' => 'Welcome back!', 'audience' => 'students', 'channels' => ['in_app', 'push'],
        ])->assertCreated();

        Bus::assertDispatchedTimes(SendPushJob::class, 2);
    }

    public function test_own_notification_inbox_can_be_marked_read(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $student = $this->createUserWithRole('Student');

        $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Welcome', 'body' => 'Welcome back!', 'audience' => 'students', 'channels' => ['in_app'],
        ])->assertCreated();

        $notification = AppNotification::query()->where('user_id', $student->id)->firstOrFail();

        $index = $this->actingAs($student)->getJson('/api/v1/notifications');
        $index->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame(1, $index->json('meta.unread_count'));

        $read = $this->actingAs($student)->postJson("/api/v1/notifications/{$notification->id}/read");
        $read->assertOk()->assertJsonPath('data.is_read', true);
    }

    public function test_a_user_cannot_mark_another_users_notification_read(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $studentA = $this->createUserWithRole('Student');
        $studentB = $this->createUserWithRole('Student');

        $this->actingAs($admin)->postJson('/api/v1/announcements', [
            'title' => 'Welcome', 'body' => 'Welcome back!', 'audience' => 'students', 'channels' => ['in_app'],
        ])->assertCreated();

        $notification = AppNotification::query()->where('user_id', $studentA->id)->firstOrFail();

        $response = $this->actingAs($studentB)->postJson("/api/v1/notifications/{$notification->id}/read");

        $response->assertStatus(404);
    }
}
