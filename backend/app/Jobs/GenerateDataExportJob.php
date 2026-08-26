<?php

namespace App\Jobs;

use App\Models\DataExport;
use App\Services\DataExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * The first real queued job in this app (see docs/deployment.md §5's
 * history).
 */
class GenerateDataExportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public function __construct(private readonly int $dataExportId) {}

    public function handle(DataExportService $service): void
    {
        $export = DataExport::query()->find($this->dataExportId);

        if (! $export) {
            return;
        }

        $service->generate($export);
    }
}
