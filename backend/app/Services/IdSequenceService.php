<?php

namespace App\Services;

use App\Models\IdSequence;
use Illuminate\Support\Facades\DB;

/**
 * Race-safe monotonic counters (e.g. "admission_number:2026"). Used
 * anywhere a sequential, gap-tolerant human-readable number is needed
 * (admission numbers, invoice/receipt numbers).
 */
class IdSequenceService
{
    public function next(string $key): int
    {
        return DB::transaction(function () use ($key) {
            $sequence = IdSequence::query()
                ->where('key', $key)
                ->lockForUpdate()
                ->first();

            if (! $sequence) {
                $sequence = IdSequence::query()->create([
                    'key' => $key,
                    'last_value' => 0,
                ]);

                $sequence = IdSequence::query()
                    ->where('id', $sequence->id)
                    ->lockForUpdate()
                    ->first();
            }

            $sequence->increment('last_value');

            return (int) $sequence->last_value;
        });
    }
}