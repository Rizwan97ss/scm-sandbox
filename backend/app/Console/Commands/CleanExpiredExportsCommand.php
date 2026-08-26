<?php

namespace App\Console\Commands;

use App\Models\DataExport;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanExpiredExportsCommand extends Command
{
    protected $signature = 'retention:clean-expired-exports';

    protected $description = 'Delete data-export ZIP files (and their DataExport rows) past their expires_at';

    public function handle(): int
    {
        $disk = Storage::disk('local');

        $expired = DataExport::query()->whereNotNull('expires_at')->where('expires_at', '<=', now())->get();

        foreach ($expired as $export) {
            if ($export->file_path && $disk->exists($export->file_path)) {
                $disk->delete($export->file_path);
            }
            $export->delete();
        }

        return self::SUCCESS;
    }
}