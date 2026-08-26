<?php

namespace Tests\Unit\Services;

use App\Enums\SettingType;
use App\Services\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_typed_values_are_cast_correctly(): void
    {
        $service = app(SettingsService::class);

        $service->set('students.admission_number_padding', 5, SettingType::Integer, 'students');
        $service->set('notifications.email_enabled', true, SettingType::Boolean, 'notifications');

        $this->assertSame(5, $service->get('students.admission_number_padding'));
        $this->assertSame(true, $service->get('notifications.email_enabled'));
    }

    public function test_only_public_settings_are_returned_by_public(): void
    {
        $service = app(SettingsService::class);

        $service->set('branding.primary_color', '#123456', SettingType::String, 'branding', true);
        $service->set('students.admission_number_format', '{YEAR}-{SEQ}', SettingType::String, 'students', false);

        $public = $service->public();

        $this->assertArrayHasKey('branding.primary_color', $public);
        $this->assertArrayNotHasKey('students.admission_number_format', $public);
    }

    public function test_cache_is_invalidated_after_set(): void
    {
        $service = app(SettingsService::class);

        $service->set('branding.primary_color', '#111111', SettingType::String, 'branding', true);
        $this->assertEquals('#111111', $service->get('branding.primary_color'));

        $service->set('branding.primary_color', '#999999', SettingType::String, 'branding', true);
        $this->assertEquals('#999999', $service->get('branding.primary_color'));
    }
}