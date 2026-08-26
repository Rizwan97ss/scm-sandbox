<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\SettingType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Setting\UpdateSettingsRequest;
use App\Models\Setting;
use App\Services\SettingsService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Setting::class);

        return ApiResponse::success($this->settings->all());
    }

    /**
     * Unauthenticated-safe branding/localization values the login screen
     * needs before a session exists.
     */
    public function public(Request $request): JsonResponse
    {
        return ApiResponse::success($this->settings->public());
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $this->authorize('update', Setting::class);

        foreach ($request->array('settings') as $setting) {
            $this->settings->set(
                $setting['key'],
                $setting['value'] ?? null,
                SettingType::from($setting['type']),
                $setting['group'],
                $setting['is_public'] ?? false,
            );
        }

        return ApiResponse::success($this->settings->all(), 'Settings updated.');
    }
}