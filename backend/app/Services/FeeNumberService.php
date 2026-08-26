<?php

namespace App\Services;

use Illuminate\Support\Carbon;

/**
 * Generates invoice/receipt/credit-note numbers via IdSequenceService, the
 * same race-safe counter mechanism StudentIdGeneratorService uses for
 * admission numbers. Format strings are DB-driven settings (group 'fees')
 * so the numbering can be rebranded without a code change, same pattern as
 * students.admission_number_format.
 */
class FeeNumberService
{
    public function __construct(
        private readonly IdSequenceService $idSequences,
        private readonly SettingsService $settings,
    ) {}

    public function nextInvoiceNumber(): string
    {
        return $this->generate('invoice_number', 'fees.invoice_number_format', 'INV-{YEAR}-{SEQ}');
    }

    public function nextPaymentNumber(): string
    {
        return $this->generate('payment_number', 'fees.receipt_number_format', 'RCT-{YEAR}-{SEQ}');
    }

    public function nextCreditNoteNumber(): string
    {
        return $this->generate('credit_note_number', 'fees.credit_note_number_format', 'CN-{YEAR}-{SEQ}');
    }

    private function generate(string $sequenceKey, string $formatSettingKey, string $defaultFormat): string
    {
        $year = Carbon::now()->year;
        $format = (string) $this->settings->get($formatSettingKey, $defaultFormat);
        $padding = (int) $this->settings->get('fees.number_padding', 4);
        $sequence = $this->idSequences->next("{$sequenceKey}:{$year}");

        return strtr($format, [
            '{SCHOOL}' => (string) $this->settings->get('school.short_name', ''),
            '{YEAR}' => (string) $year,
            '{SEQ}' => str_pad((string) $sequence, $padding, '0', STR_PAD_LEFT),
        ]);
    }
}