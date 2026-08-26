<?php

namespace App\Console\Commands;

use App\Services\SettingsService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class CleanTenantActivityLogsCommand extends Command
{
    protected $signature = 'retention:clean-activity-logs';

    protected $description = 'Prune old activity log entries per the configured retention setting';

    public function handle(SettingsService $settings): int
    {
        $days = (int) $settings->get('retention.activity_log_days', 365);
        Artisan::call('activitylog:clean', ['--days' => $days, '--force' => true]);

        return self::SUCCESS;
    }
}