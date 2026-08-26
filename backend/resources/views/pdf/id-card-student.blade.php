<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $student->full_name }} — ID Card</title>
    <style>
        /* DomPDF applies its own default @page margin regardless of body's
           margin — on a page this small (153pt tall) that default alone
           exceeds the whole page, which is what was actually forcing this
           onto a second page. size must be spelled out here too, matching
           IdCardController's setPaper([0, 0, 243, 153]) exactly — an @page
           rule with only `margin` and no `size` makes dompdf's CSS engine
           take over sizing and silently fall back to A4, overriding the
           controller's setPaper() call (the card rendered correctly at
           1 page, but as a tiny card adrift on a full A4 page).

           Everything below is table-based, not position:absolute — dompdf's
           pagination pass doesn't reliably treat stacked absolutely
           positioned boxes as out-of-flow on a page this small, and spawns
           a spurious second page with the same content adrift on it
           (reproduced directly while iterating on this file). Tables/normal
           flow, same technique the original single-page version of this
           card used, doesn't have that failure mode. */
        @page { size: 243pt 153pt; margin: 0; }
        * { box-sizing: border-box; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 8px; color: #1a1a1a; margin: 0; padding: 6px; }
        .card { border: 1pt solid #d8dce3; width: 100%; height: 141pt; }
        table.outer { width: 100%; height: 100%; border-collapse: collapse; table-layout: fixed; }
        table.outer td { vertical-align: top; padding: 0; }
        .content { width: 223pt; padding: 6pt 8pt; }
        /* A rotated label (transform: rotate) doesn't reflow its layout box
           correctly against a column this narrow in dompdf — its pre-
           rotation width still gets used for clipping, cutting the text off
           (reproduced directly: "STUDENT" rendered as "STUDEN"). Stacked
           single-letter lines read the same top-to-bottom without any
           transform involved. */
        .accent { width: 14pt; background: {{ $primaryColor }}; text-align: center; padding-top: 8pt; }
        .accent span { display: block; color: #fff; font-size: 7px; font-weight: bold; line-height: 1.5; }

        .school-name { font-size: 8px; font-weight: bold; color: {{ $primaryColor }}; margin-bottom: 8pt; }

        /* table-layout: fixed here too — dompdf's default auto column
           sizing let the photo cell's content push wider than the
           `.content` td actually has room for, overflowing visibly into
           the accent column next to it (reproduced directly). */
        table.top-row { width: 100%; border-collapse: collapse; table-layout: fixed; }
        table.top-row td { vertical-align: top; padding: 0; }
        .name-details p { margin: 1.5px 0; line-height: 1.3; }
        .name-details .name { font-size: 10px; font-weight: bold; margin-bottom: 3px !important; }
        .label { color: #666; }

        .photo { width: 52pt; text-align: center; }
        .photo-box { width: 50pt; height: 58pt; border: 1pt solid {{ $primaryColor }}; background: #f1f3f6; }
        .photo-box img { width: 100%; height: 100%; object-fit: cover; }
        .photo-box .initials { display: block; padding-top: 18pt; font-size: 16px; font-weight: bold; color: #9aa2b1; }

        table.bottom-row { width: 100%; border-collapse: collapse; margin-top: 12pt; }
        table.bottom-row td { vertical-align: middle; padding: 0; }
        .qr { width: 38pt; }
        .qr img { width: 34pt; height: 34pt; }
        .footer-text p { margin: 1.5px 0; line-height: 1.3; }
        .footer-text .sid { font-weight: bold; font-size: 8px; }
    </style>
</head>
<body>
    <div class="card">
        <table class="outer">
            <tr>
                <td class="content">
                    <div class="school-name">{{ $schoolName }}</div>

                    <table class="top-row">
                        <tr>
                            <td class="name-details">
                                <p class="name">{{ $student->full_name }}</p>
                                <p><span class="label">Grade:</span> {{ $student->currentGradeLevel?->name }} @if($student->currentSection) - {{ $student->currentSection->name }} @endif</p>
                                <p><span class="label">DOB:</span> {{ $student->date_of_birth?->toDateString() }}</p>
                            </td>
                            <td class="photo">
                                <div class="photo-box">
                                    @if($photoUrl)
                                        <img src="{{ $photoUrl }}" alt="">
                                    @else
                                        <span class="initials">{{ strtoupper(substr($student->first_name, 0, 1).substr($student->last_name, 0, 1)) }}</span>
                                    @endif
                                </div>
                            </td>
                        </tr>
                    </table>

                    <table class="bottom-row">
                        <tr>
                            <td class="qr"><img src="{{ $qrCode }}" alt="QR"></td>
                            <td class="footer-text">
                                <p class="sid">Student ID: {{ $student->admission_number }}</p>
                                <p><span class="label">Issued:</span> {{ $student->admission_date?->toDateString() }}</p>
                            </td>
                        </tr>
                    </table>
                </td>
                <td class="accent">@foreach(str_split('STUDENT') as $letter)<span>{{ $letter }}</span>@endforeach</td>
            </tr>
        </table>
    </div>
</body>
</html>
