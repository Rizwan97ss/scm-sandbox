<?php

namespace Database\Seeders;

use App\Enums\SettingType;
use App\Services\SettingsService;
use Illuminate\Database\Seeder;

/**
 * Every DB-driven setting the app starts with — one row per key. A School
 * Admin can freely change any of these afterward via the Settings page.
 */
class SettingSeeder extends Seeder
{
    private const DEFAULTS = [
        ['key' => 'school.name', 'value' => 'Riverside Demo School', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.short_name', 'value' => 'demo', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.email', 'value' => 'info@riverside-demo.test', 'type' => SettingType::String, 'group' => 'school', 'is_public' => false],
        ['key' => 'school.phone', 'value' => '+1-555-0100', 'type' => SettingType::String, 'group' => 'school', 'is_public' => false],
        ['key' => 'school.address_line1', 'value' => '123 Riverside Avenue', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.address_line2', 'value' => '', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.city', 'value' => 'Springfield', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.state', 'value' => 'IL', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.postal_code', 'value' => '62701', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.country', 'value' => 'US', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'school.locale', 'value' => 'en', 'type' => SettingType::String, 'group' => 'school', 'is_public' => true],
        ['key' => 'branding.primary_color', 'value' => '#2563eb', 'type' => SettingType::String, 'group' => 'branding', 'is_public' => true],
        ['key' => 'branding.secondary_color', 'value' => '#0f172a', 'type' => SettingType::String, 'group' => 'branding', 'is_public' => true],
        ['key' => 'branding.logo_url', 'value' => '', 'type' => SettingType::String, 'group' => 'branding', 'is_public' => true],
        ['key' => 'branding.favicon_url', 'value' => '', 'type' => SettingType::String, 'group' => 'branding', 'is_public' => true],
        ['key' => 'localization.currency', 'value' => 'USD', 'type' => SettingType::String, 'group' => 'localization', 'is_public' => true],
        ['key' => 'localization.currency_symbol', 'value' => '$', 'type' => SettingType::String, 'group' => 'localization', 'is_public' => true],
        ['key' => 'localization.timezone', 'value' => 'UTC', 'type' => SettingType::String, 'group' => 'localization', 'is_public' => true],
        ['key' => 'localization.date_format', 'value' => 'yyyy-MM-dd', 'type' => SettingType::String, 'group' => 'localization', 'is_public' => true],
        ['key' => 'localization.time_format', 'value' => 'HH:mm', 'type' => SettingType::String, 'group' => 'localization', 'is_public' => true],
        ['key' => 'academic.grade_level_label', 'value' => 'Grade', 'type' => SettingType::String, 'group' => 'academic', 'is_public' => true],
        ['key' => 'academic.section_label', 'value' => 'Section', 'type' => SettingType::String, 'group' => 'academic', 'is_public' => true],
        ['key' => 'academic.term_label', 'value' => 'Term', 'type' => SettingType::String, 'group' => 'academic', 'is_public' => true],
        ['key' => 'students.admission_number_format', 'value' => '{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'students', 'is_public' => false],
        ['key' => 'students.admission_number_padding', 'value' => 4, 'type' => SettingType::Integer, 'group' => 'students', 'is_public' => false],
        ['key' => 'notifications.email_enabled', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'notifications', 'is_public' => false],
        ['key' => 'fees.invoice_number_format', 'value' => 'INV-{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'fees', 'is_public' => false],
        ['key' => 'fees.receipt_number_format', 'value' => 'RCT-{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'fees', 'is_public' => false],
        ['key' => 'fees.credit_note_number_format', 'value' => 'CN-{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'fees', 'is_public' => false],
        ['key' => 'fees.number_padding', 'value' => 4, 'type' => SettingType::Integer, 'group' => 'fees', 'is_public' => false],
        ['key' => 'payroll.payslip_number_format', 'value' => 'PS-{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'payroll', 'is_public' => false],
        ['key' => 'payroll.number_padding', 'value' => 4, 'type' => SettingType::Integer, 'group' => 'payroll', 'is_public' => false],
        ['key' => 'library.fine_per_day', 'value' => 0, 'type' => SettingType::Integer, 'group' => 'library', 'is_public' => false],
        ['key' => 'certificates.certificate_number_format', 'value' => 'CERT-{YEAR}-{SEQ}', 'type' => SettingType::String, 'group' => 'certificates', 'is_public' => false],
        ['key' => 'certificates.number_padding', 'value' => 4, 'type' => SettingType::Integer, 'group' => 'certificates', 'is_public' => false],
        ['key' => 'id_cards.staff.show_email', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.staff.show_phone', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.staff.show_website', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.staff.show_barcode', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.student.show_dob', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.student.show_address', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
        ['key' => 'id_cards.student.show_barcode', 'value' => true, 'type' => SettingType::Boolean, 'group' => 'id_cards', 'is_public' => false],
    ];

    public function run(SettingsService $settings): void
    {
        foreach (self::DEFAULTS as $setting) {
            $settings->set($setting['key'], $setting['value'], $setting['type'], $setting['group'], $setting['is_public']);
        }
    }
}
