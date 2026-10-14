<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Build Spec v2.4 Section 2 & 3:
     * Strict PostgreSQL constraints, foreign key cascades, and check constraint.
     */
    public function up(): void
    {
        // 1. Table: users
        Schema::create('users', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('email', 255)->unique();
            $table->string('role', 50); // Enum check: 'donor', 'ngo', 'volunteer', 'admin'
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->decimal('trust_score', 5, 2)->default(100.0);
            $table->timestamps();
        });

        // 2. Table: donations
        Schema::create('donations', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('donor_id');
            $table->string('status', 50); // 'pending', 'allocated', 'completed', 'expired'
            $table->string('title');
            $table->string('food_type')->default('Cooked Hot Meals');
            $table->integer('quantity_servings');
            $table->decimal('temp_celsius', 5, 2)->nullable();
            $table->text('storage')->nullable();
            $table->text('safety_log')->nullable();
            $table->string('pickup_address')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();

            $table->foreign('donor_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });

        // 3. Table: logistics_tracking
        Schema::create('logistics_tracking', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('donation_id');
            $table->unsignedBigInteger('volunteer_id');
            $table->string('status', 50);
            $table->timestamps();

            $table->foreign('donation_id')
                  ->references('id')
                  ->on('donations')
                  ->onDelete('cascade');

            $table->foreign('volunteer_id')
                  ->references('id')
                  ->on('users')
                  ->onDelete('cascade');
        });

        // MANDATORY POSTGRESQL DATABASE CHECK CONSTRAINT (SECTION 3):
        DB::statement("ALTER TABLE logistics_tracking DROP CONSTRAINT IF EXISTS logistics_tracking_status_check;");
        DB::statement("ALTER TABLE logistics_tracking ADD CONSTRAINT logistics_tracking_status_check CHECK (status IN ('pending', 'allocated', 'picked_up', 'transiting', 'in_transit', 'delivered', 'cancelled'));");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE logistics_tracking DROP CONSTRAINT IF EXISTS logistics_tracking_status_check;");
        Schema::dropIfExists('logistics_tracking');
        Schema::dropIfExists('donations');
        Schema::dropIfExists('users');
    }
};
