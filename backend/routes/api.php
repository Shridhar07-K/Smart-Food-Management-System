<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LogisticsAllocationController;

/*
|--------------------------------------------------------------------------
| API Routes — Ellarukum Unavu (Build Spec v2.4)
|--------------------------------------------------------------------------
*/

// NGO Available surplus feed
Route::middleware(['auth:sanctum', 'role:ngo'])->group(function () {
    Route::get('/donations/available', [LogisticsAllocationController::class, 'getAvailable']);
});

// Logistics Allocation endpoint
Route::middleware(['auth:sanctum', 'role:admin,ngo'])->group(function () {
    Route::post('/logistics/allocate', [LogisticsAllocationController::class, 'allocate']);
});

// Volunteer QR Code generator endpoint
Route::middleware(['auth:sanctum', 'role:volunteer'])->group(function () {
    Route::get('/logistics/qr-code/{id}', [LogisticsAllocationController::class, 'generateQrCode']);
});

// Cryptographic Handover Verification (Signed Middleware Enforced)
// URL must contain valid 'expires' and HMAC 'signature' matching APP_URL
Route::middleware('signed')->get('/logistics/verify-pickup/{id}', [LogisticsAllocationController::class, 'verifyPickup'])
    ->name('logistics.verify-pickup');
