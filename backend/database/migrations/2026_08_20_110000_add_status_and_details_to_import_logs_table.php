<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            $table->string('status')->default('completed')->after('mode');
            $table->string('failure_reason', 500)->nullable()->after('undone_at');
            $table->json('failures')->nullable()->after('failure_reason');
            $table->json('warnings')->nullable()->after('failures');
        });
    }

    public function down(): void
    {
        Schema::table('import_logs', function (Blueprint $table) {
            $table->dropColumn(['status', 'failure_reason', 'failures', 'warnings']);
        });
    }
};
