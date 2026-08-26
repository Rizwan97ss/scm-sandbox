<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Generates admission numbers from a configurable format string (settings
 * key `students.admission_number_format`, default "{YEAR}-{SEQ}") with
 * tokens {SCHOOL}, {YEAR}, {SEQ}, backed by a per-year IdSequence counter.
 */
class StudentIdGeneratorService
{
    public function __construct(
        private readonly SettingsService $settings,
        private readonly IdSequenceService $idSequences,
    ) {}

    public function generate(?Carbon $admissionDate = null): string
    {
        $year = ($admissionDate ?? now())->year;

        $format = (string) $this->settings->get('students.admission_number_format', '{YEAR}-{SEQ}');
        $padding = (int) $this->settings->get('students.admission_number_padding', 4);

        $sequence = $this->idSequences->next("admission_number:{$year}");

        return strtr($format, [
            '{SCHOOL}' => (string) $this->settings->get('school.short_name', ''),
            '{YEAR}' => (string) $year,
            '{SEQ}' => str_pad((string) $sequence, $padding, '0', STR_PAD_LEFT),
        ]);
    }
}