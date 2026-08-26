<?php

namespace App\Services;

use App\Models\Book;
use App\Models\BookIssue;
use App\Models\HostelRoom;
use App\Models\StudentTransportAssignment;
use App\Models\User;
use App\Models\Vehicle;

/**
 * Library/Transport/Hostel at-a-glance counts. Each section is computed only
 * when the caller holds the matching module's .view permission — same
 * "compute only what you're allowed to see" shape as AttendanceReportService.
 */
class OperationsReportService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(User $user): array
    {
        return [
            'library' => $user->can('library.view') ? $this->library() : null,
            'transport' => $user->can('transport.view') ? $this->transport() : null,
            'hostel' => $user->can('hostel.view') ? $this->hostel() : null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function library(): array
    {
        return [
            'total_books' => Book::query()->count(),
            'issued_this_month' => BookIssue::query()->whereDate('issue_date', '>=', now()->startOfMonth())->count(),
            'currently_overdue' => BookIssue::query()->where('status', 'issued')->whereDate('due_date', '<', now())->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transport(): array
    {
        return [
            'vehicle_count' => Vehicle::query()->where('is_active', true)->count(),
            'students_assigned' => StudentTransportAssignment::query()->where('is_active', true)->count(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function hostel(): array
    {
        $rooms = HostelRoom::query()->where('is_active', true)->withCount(['allocations' => fn ($q) => $q->where('status', 'allocated')])->get();

        $totalCapacity = $rooms->sum('capacity');
        $totalOccupied = $rooms->sum('allocations_count');

        return [
            'room_count' => $rooms->count(),
            'total_capacity' => $totalCapacity,
            'total_occupied' => $totalOccupied,
            'occupancy_percentage' => $totalCapacity > 0 ? round(($totalOccupied / $totalCapacity) * 100, 2) : null,
        ];
    }
}
