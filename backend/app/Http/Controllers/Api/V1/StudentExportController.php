<?php

namespace App\Http\Controllers\Api\V1;

use App\Exports\StudentsExport;
use App\Http\Controllers\Controller;
use App\Models\Student;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudentExportController extends Controller
{
    public function __invoke(Request $request): BinaryFileResponse
    {
        $this->authorize('export', Student::class);

        $query = Student::query()
            ->visibleTo($request->user())
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')->toString()))
            ->when($request->filled('current_section_id'), fn ($q) => $q->where('current_section_id', $request->integer('current_section_id')))
            // Backs the Students list page's "Export selected" bulk action —
            // a comma-separated id list scopes the export to exactly the
            // checked rows, still filtered through visibleTo() first so a
            // Student/Parent/Teacher caller can never export a record
            // outside what they're already allowed to see, no matter what
            // ids they pass.
            ->when($request->filled('ids'), fn ($q) => $q->whereIn('id', explode(',', $request->string('ids')->toString())));

        return (new StudentsExport($query))->download('students.xlsx');
    }
}
