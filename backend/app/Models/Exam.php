<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

#[Fillable(['academic_year_id', 'term_id', 'exam_type_id', 'name', 'weight', 'is_published', 'published_at'])]
class Exam extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected function casts(): array
    {
        return [
            'weight' => 'float',
            'is_published' => 'boolean',
            'published_at' => 'datetime',
        ];
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(AcademicYear::class);
    }

    public function term(): BelongsTo
    {
        return $this->belongsTo(Term::class);
    }

    public function examType(): BelongsTo
    {
        return $this->belongsTo(ExamType::class);
    }

    public function examSubjects(): HasMany
    {
        return $this->hasMany(ExamSubject::class);
    }

    public function examSubjectGroups(): HasMany
    {
        return $this->hasMany(ExamSubjectGroup::class);
    }

    /**
     * The generic `exams.view` permission alone would let a Student/Parent
     * list *every* exam in the school via GET /exams — including exams for
     * sections they have no relation to. This closes that gap the same way
     * StudentAttendance/ExamMark do it: Student/Parent see every exam
     * touching their own/their child's section as soon as it's scheduled
     * (so the schedule itself — dates, subjects — is visible ahead of
     * results, matching Homework's always-visible-once-assigned behavior);
     * Teacher/Class Teacher see exams touching a section they teach or lead.
     * Publish status is deliberately not part of this scope at all — it
     * only governs whether reportCard()'s per-subject masking reveals a
     * mark/grade, never whether the exam entry itself is listable.
     */
    public function scopeVisibleTo(Builder $query, User $user): Builder
    {
        if ($user->hasRole('Student')) {
            $sectionId = Student::query()->where('user_id', $user->id)->value('current_section_id');

            return $query->when(
                $sectionId,
                fn ($q) => $q->whereHas('examSubjects', fn ($q2) => $q2->where('section_id', $sectionId)),
                fn ($q) => $q->whereRaw('1 = 0'),
            );
        }

        if ($user->hasRole('Parent')) {
            $sectionIds = Student::query()
                ->whereHas('guardians', fn ($q) => $q->where('user_id', $user->id))
                ->pluck('current_section_id');

            return $query->whereHas('examSubjects', fn ($q) => $q->whereIn('section_id', $sectionIds));
        }

        if ($user->hasAnyRole(['Teacher', 'Class Teacher'])) {
            $sectionIds = Section::query()->where('class_teacher_id', $user->id)->pluck('id')
                ->merge(ClassSubjectTeacher::query()->where('teacher_id', $user->id)->pluck('section_id'))
                ->unique();

            return $query->whereHas('examSubjects', fn ($q) => $q->whereIn('section_id', $sectionIds));
        }

        return $query;
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['name', 'is_published'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges();
    }
}
