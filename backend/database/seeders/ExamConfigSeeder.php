<?php

namespace Database\Seeders;

use App\Models\AssessmentComponentType;
use App\Models\ExamType;
use Illuminate\Database\Seeder;

/**
 * Seeds the canonical exam types (Class Test, Unit Test, Monthly Test,
 * Trimester, Semester, Mid-Term, Final/Annual) and assessment component
 * types (Online MCQ, Written, Practical, Oral/Viva) the app starts with —
 * both are admin-editable/extendable afterward (see
 * ExamTypeController/AssessmentComponentTypeController), this just seeds a
 * sensible starting set. Idempotent (firstOrCreate by code).
 */
class ExamConfigSeeder extends Seeder
{
    public function run(): void
    {
        $examTypes = [
            ['code' => 'class_test', 'name' => 'Class Test', 'sequence' => 1],
            ['code' => 'unit_test', 'name' => 'Unit Test', 'sequence' => 2],
            ['code' => 'monthly_test', 'name' => 'Monthly Test', 'sequence' => 3],
            ['code' => 'trimester', 'name' => 'Trimester', 'sequence' => 4],
            ['code' => 'semester', 'name' => 'Semester', 'sequence' => 5],
            ['code' => 'mid_term', 'name' => 'Mid-Term', 'sequence' => 6],
            ['code' => 'final_annual', 'name' => 'Final / Annual Examination', 'sequence' => 7],
        ];
        foreach ($examTypes as $type) {
            ExamType::query()->firstOrCreate(['code' => $type['code']], $type);
        }

        $componentTypes = [
            ['code' => 'online_mcq', 'name' => 'Online MCQ', 'is_auto_graded' => true, 'sequence' => 1],
            ['code' => 'written', 'name' => 'Written', 'is_auto_graded' => false, 'sequence' => 2],
            ['code' => 'practical', 'name' => 'Practical', 'is_auto_graded' => false, 'sequence' => 3],
            ['code' => 'oral_viva', 'name' => 'Oral / Viva', 'is_auto_graded' => false, 'sequence' => 4],
        ];
        foreach ($componentTypes as $type) {
            AssessmentComponentType::query()->firstOrCreate(['code' => $type['code']], $type);
        }
    }
}