<?php

namespace Tests\Feature\Communication;

use App\Models\PushSubscription;
use App\Services\Communication\WebPushGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Minishlink\WebPush\MessageSentReport;
use Minishlink\WebPush\WebPush;
use RuntimeException;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class WebPushGatewayTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    private function configureVapid(): void
    {
        config([
            'communication.vapid.public_key' => 'test-public-key',
            'communication.vapid.private_key' => 'test-private-key',
            'communication.vapid.subject' => 'mailto:test@example.test',
        ]);
    }

    public function test_send_does_nothing_and_makes_no_network_call_when_the_user_has_no_subscriptions(): void
    {
        $this->configureVapid();
        $user = $this->createUserWithRole('Teacher');

        $client = \Mockery::mock(WebPush::class);
        $client->shouldNotReceive('queueNotification');
        $client->shouldNotReceive('flush');

        (new WebPushGateway($client))->send($user, 'Title', 'Body');

        $this->assertTrue(true);
    }

    public function test_send_throws_when_vapid_keys_are_not_configured(): void
    {
        config(['communication.vapid.public_key' => null, 'communication.vapid.private_key' => null]);
        $user = $this->createUserWithRole('Teacher');

        $this->expectException(RuntimeException::class);

        (new WebPushGateway)->send($user, 'Title', 'Body');
    }

    public function test_send_queues_one_notification_per_subscription_and_prunes_expired_ones(): void
    {
        $this->configureVapid();
        $user = $this->createUserWithRole('Teacher');

        PushSubscription::query()->create(['user_id' => $user->id, 'endpoint' => 'https://push.example.test/expired', 'p256dh' => 'key1', 'auth' => 'auth1']);
        PushSubscription::query()->create(['user_id' => $user->id, 'endpoint' => 'https://push.example.test/alive', 'p256dh' => 'key2', 'auth' => 'auth2']);

        $expiredReport = \Mockery::mock(MessageSentReport::class);
        $expiredReport->shouldReceive('isSuccess')->andReturn(false);
        $expiredReport->shouldReceive('isSubscriptionExpired')->andReturn(true);
        $expiredReport->shouldReceive('getEndpoint')->andReturn('https://push.example.test/expired');

        $aliveReport = \Mockery::mock(MessageSentReport::class);
        $aliveReport->shouldReceive('isSuccess')->andReturn(true);
        $aliveReport->shouldReceive('isSubscriptionExpired')->andReturn(false);

        $client = \Mockery::mock(WebPush::class);
        $client->shouldReceive('queueNotification')->twice();
        $client->shouldReceive('flush')->once()->andReturn((function () use ($expiredReport, $aliveReport) {
            yield $expiredReport;
            yield $aliveReport;
        })());

        (new WebPushGateway($client))->send($user->fresh(), 'Title', 'Body');

        $this->assertDatabaseMissing('push_subscriptions', ['endpoint' => 'https://push.example.test/expired']);
        $this->assertDatabaseHas('push_subscriptions', ['endpoint' => 'https://push.example.test/alive']);
    }
}
