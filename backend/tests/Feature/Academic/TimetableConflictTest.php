<?php

namespace Tests\Feature\Academic;

use App\Models\AcademicYear;
use App\Models\GradeLevel;
use App\Models\Section;
use App\Models\TimetablePeriod;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\InteractsWithUsers;
use Tests\TestCase;

class TimetableConflictTest extends TestCase
{
    use InteractsWithUsers, RefreshDatabase;

    public function test_double_booking_a_teacher_in_the_same_period_is_rejected(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $teacher = $this->createUserWithRole('Teacher');

        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $sectionA = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'A']);
        $sectionB = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id, 'name' => 'B']);
        $period = TimetablePeriod::factory()->create();

        $first = $this->actingAs($admin)->postJson('/api/v1/timetable-entries', [
            'academic_year_id' => $year->id,
            'section_id' => $sectionA->id,
            'teacher_id' => $teacher->id,
            'timetable_period_id' => $period->id,
            'day_of_week' => 1,
        ]);
        $first->assertCreated();

        $conflicting = $this->actingAs($admin)->postJson('/api/v1/timetable-entries', [
            'academic_year_id' => $year->id,
            'section_id' => $sectionB->id,
            'teacher_id' => $teacher->id,
            'timetable_period_id' => $period->id,
            'day_of_week' => 1,
        ]);

        $conflicting->assertStatus(422)->assertJsonValidationErrors('teacher_id');
    }

    public function test_same_teacher_can_teach_different_periods_same_day(): void
    {
        $admin = $this->createUserWithRole('School Admin');
        $teacher = $this->createUserWithRole('Teacher');

        $year = AcademicYear::factory()->create();
        $gradeLevel = GradeLevel::factory()->create();
        $section = Section::factory()->create(['academic_year_id' => $year->id, 'grade_level_id' => $gradeLevel->id]);
        $periodOne = TimetablePeriod::factory()->create(['sequence' => 1]);
        $periodTwo = TimetablePeriod::factory()->create(['sequence' => 2]);

        $this->actingAs($admin)->postJson('/api/v1/timetable-entries', [
            'academic_year_id' => $year->id,
            'section_id' => $section->id,
            'teacher_id' => $teacher->id,
            'timetable_period_id' => $periodOne->id,
            'day_of_week' => 1,
        ])->assertCreated();

        $this->actingAs($admin)->postJson('/api/v1/timetable-entries', [
            'academic_year_id' => $year->id,
            'section_id' => $section->id,
            'teacher_id' => $teacher->id,
            'timetable_period_id' => $periodTwo->id,
            'day_of_week' => 1,
        ])->assertCreated();
    }
}
