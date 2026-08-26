<?php

namespace Tests\Unit\Services;

use App\Services\IdSequenceService;
use App\Services\SettingsService;
use App\Services\StudentIdGeneratorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StudentIdGeneratorServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_generates_sequential_padded_admission_numbers_per_year(): void
    {
        $service = new StudentIdGeneratorService(app(SettingsService::class), app(IdSequenceService::class));

        $first = $service->generate(\Carbon\Carbon::create(2026, 1, 1));
        $second = $service->generate(\Carbon\Carbon::create(2026, 6, 1));
        $thirdDifferentYear = $service->generate(\Carbon\Carbon::create(2027, 1, 1));

        $this->assertEquals('2026-0001', $first);
        $this->assertEquals('2026-0002', $second);
        $this->assertEquals('2027-0001', $thirdDifferentYear);
    }

    public function test_respects_custom_format_and_padding_settings(): void
    {
        $settings = app(SettingsService::class);
        $service = new StudentIdGeneratorService($settings, app(IdSequenceService::class));

        $settings->set('school.short_name', 'riv');
        $settings->set('students.admission_number_format', '{SCHOOL}-{YEAR}-{SEQ}');
        $settings->set('students.admission_number_padding', 3);

        $admissionNumber = $service->generate(\Carbon\Carbon::create(2026, 1, 1));

        $this->assertEquals('riv-2026-001', $admissionNumber);
    }
}