<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

/**
 * QUEUE_CONNECTION=sync in testing (phpunit.xml) — GenerateDataExportJob
 * runs inline within the same request/test, no Queue::fake() needed to
 * observe its effect (the DataExport row is 'ready' by the time the
 * dispatching request returns).
 */
class DataExportTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_self_service_export_generates_and_downloads_only_the_requesters_own_data(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $this->actingAs($teacher);

        $store = $this->postJson('/api/v1/account/data-export')->assertCreated();
        $exportId = $store->json('data.id');
        $this->assertEquals('ready', $store->json('data.status'));

        $list = $this->getJson('/api/v1/account/data-export')->assertOk();
        $this->assertCount(1, $list->json('data'));

        $download = $this->get("/api/v1/data-exports/{$exportId}/download")->assertOk();
        $this->assertEquals('application/zip', $download->headers->get('Content-Type'));
    }

    public function test_school_wide_export_requires_the_data_export_school_permission(): void
    {
        $teacher = $this->createUserWithRole('Teacher');
        $admin = $this->createUserWithRole('School Admin');

        $this->actingAs($teacher);
        $this->postJson('/api/v1/data-exports')->assertStatus(403);

        $this->actingAs($admin);
        $store = $this->postJson('/api/v1/data-exports')->assertCreated();
        $this->assertEquals('school', $store->json('data.scope'));
        $this->assertEquals('ready', $store->json('data.status'));
    }

    public function test_a_user_cannot_download_another_users_self_service_export(): void
    {
        $owner = $this->createUserWithRole('Teacher');
        $otherUser = $this->createUserWithRole('Teacher');

        $this->actingAs($owner);
        $exportId = $this->postJson('/api/v1/account/data-export')->json('data.id');

        $this->actingAs($otherUser);
        $this->get("/api/v1/data-exports/{$exportId}/download")->assertStatus(403);
    }
}
