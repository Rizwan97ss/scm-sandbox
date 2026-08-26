<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

/**
 * One-off rollout command for Phase 15's mandatory MFA: every account
 * created from this point on gets a zero-length grace period (see User's
 * `creating` hook — mfa_grace_period_ends_at defaults to `now()`, since a
 * brand-new signup is expected to set up MFA immediately). Every account
 * that already existed before this deploy would otherwise be locked out of
 * the app the instant EnsureMfaEnrolled goes live. Run this once, right
 * after deploying Sub-phase C, before real users hit it.
 *
 * Idempotent by construction — only touches accounts with no confirmed MFA
 * and no grace period already set, so re-running it never extends an
 * already-granted window or affects anyone who's since confirmed MFA.
 */
class GrantMfaGracePeriodCommand extends Command
{
    protected $signature = 'security:grant-mfa-grace-period {--days=14 : Grace period length in days}';

    protected $description = 'Grant every pre-existing account a one-time MFA setup grace period';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->addDays($days);

        $count = User::query()
            ->whereNull('two_factor_confirmed_at')
            ->whereNull('mfa_grace_period_ends_at')
            ->update(['mfa_grace_period_ends_at' => $cutoff]);

        $this->info("Users granted a grace period: {$count}");

        return self::SUCCESS;
    }
}