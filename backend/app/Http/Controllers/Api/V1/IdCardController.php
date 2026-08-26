<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Student;
use App\Models\User;
use App\Services\SettingsService;
use App\Support\QrCodeGenerator;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class IdCardController extends Controller
{
    public function student(Request $request, int $id, SettingsService $settings): Response
    {
        $student = Student::query()->with(['currentGradeLevel', 'currentSection'])->visibleTo($request->user())->findOrFail($id);

        $this->authorize('view', $student);

        $pdf = Pdf::loadView('pdf.id-card-student', [
            'student' => $student,
            'schoolName' => $settings->get('school.name', ''),
            'primaryColor' => $settings->get('branding.primary_color', '#2a4d8f'),
            'photoUrl' => $this->photoDataUri($student),
            'qrCode' => QrCodeGenerator::dataUri($student->uuid),
        ])->setPaper([0, 0, 243, 153]);

        return $pdf->download(str($student->full_name.'-id-card')->slug().'.pdf');
    }

    /**
     * dompdf can't fetch external image URLs reliably (enable_remote is off
     * — see QrCodeGenerator's docblock), so the photo is read straight off
     * local disk and embedded as a base64 data URI, same technique as the
     * QR code. Returns null when the student has no photo uploaded, which
     * the view falls back to an initials placeholder for.
     */
    private function photoDataUri(Student $student): ?string
    {
        $media = $student->getFirstMedia('photo');

        if (! $media || ! is_file($media->getPath())) {
            return null;
        }

        return 'data:'.$media->mime_type.';base64,'.base64_encode(file_get_contents($media->getPath()));
    }

    public function staff(Request $request, int $id, SettingsService $settings): Response
    {
        $user = User::query()->with('designation')->findOrFail($id);

        $this->authorize('view', $user);

        $pdf = Pdf::loadView('pdf.id-card-staff', [
            'staff' => $user,
            'schoolName' => $settings->get('school.name', ''),
            'qrCode' => QrCodeGenerator::dataUri($user->uuid),
        ])->setPaper([0, 0, 243, 153]);

        return $pdf->download(str($user->full_name.'-id-card')->slug().'.pdf');
    }
}