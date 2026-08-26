<?php

namespace App\Services;

use App\Enums\SettingType;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;

/**
 * Reads/writes database-driven settings — one row per key (see the
 * `settings` migration's `unique(['key'])`). Results are cached for the
 * app's lifetime and invalidated on write.
 */
class SettingsService
{
    private const CACHE_TTL = 3600;
    private const CACHE_KEY = 'settings:all';

    public function get(string $key, mixed $default = null): mixed
    {
        return $this->all()[$key] ?? $default;
    }

    public function set(string $key, mixed $value, SettingType $type = SettingType::String, string $group = 'general', bool $isPublic = false): Setting
    {
        $setting = Setting::query()->updateOrCreate(
            ['key' => $key],
            [
                'value' => $type->serialize($value),
                'type' => $type->value,
                'group' => $group,
                'is_public' => $isPublic,
            ]
        );

        $this->forget();

        return $setting;
    }

    /**
     * @return array<string, mixed>
     */
    public function all(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            $merged = [];
            foreach (Setting::query()->get() as $setting) {
                $merged[$setting->key] = $setting->type->cast($setting->value);
            }

            return $merged;
        });
    }

    /**
     * Only settings flagged is_public, safe to expose to unauthenticated frontend boot.
     *
     * @return array<string, mixed>
     */
    public function public(): array
    {
        $publicKeys = Setting::query()
            ->where('is_public', true)
            ->pluck('key')
            ->unique();

        return collect($this->all())
            ->only($publicKeys)
            ->all();
    }

    public function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}