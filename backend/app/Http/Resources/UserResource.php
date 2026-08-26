<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'first_name' => $this->first_name,
            'last_name' => $this->last_name,
            'full_name' => $this->full_name,
            'email' => $this->email,
            'username' => $this->username,
            'phone' => $this->phone,
            'gender' => $this->gender?->value,
            'date_of_birth' => $this->date_of_birth?->toDateString(),
            'status' => $this->status?->value,
            'must_change_password' => $this->must_change_password,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'mfa_enabled' => $this->hasMfaConfirmed(),
            'mfa_grace_period_ends_at' => $this->mfa_grace_period_ends_at?->toIso8601String(),
            'designation' => $this->whenLoaded('designation', fn () => $this->designation ? ['id' => $this->designation->id, 'name' => $this->designation->name] : null),
            'employee_id' => $this->employee_id,
            'hire_date' => $this->hire_date?->toDateString(),
            'avatar_url' => $this->getFirstMedia('avatar') ? route('api.v1.media.show', $this->getFirstMedia('avatar')) : null,
            'roles' => $this->whenLoaded('roles', fn () => $this->getRoleNames()),
            // Always included (not just on /me): the frontend caches whatever
            // UserResource shape login/me/update return, and a route-name-gated
            // field here silently produces a User with no permissions after
            // login specifically, breaking every permission-gated nav item.
            'permissions' => $this->getAllPermissions()->pluck('name'),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
