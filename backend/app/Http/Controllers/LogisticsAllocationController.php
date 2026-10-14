<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use App\Models\LogisticsTracking;
use App\Models\Donation;

class LogisticsAllocationController extends Controller
{
    /**
     * GET /api/donations/available
     * Auth: NGO
     * Returns donations where status = 'pending' and ID is not in logistics_tracking.
     */
    public function getAvailable(Request $request)
    {
        // Prevent double booking / race conditions across concurrent NGOs
        $allocatedDonationIds = DB::table('logistics_tracking')
            ->where('status', '!=', 'cancelled')
            ->pluck('donation_id');

        $availableDonations = DB::table('donations')
            ->where('status', 'pending')
            ->whereNotIn('id', $allocatedDonationIds)
            ->get();

        return response()->json([
            'status' => 'success',
            'count' => $availableDonations->count(),
            'data' => $availableDonations
        ], 200);
    }

    /**
     * POST /api/logistics/allocate
     * Auth: Admin / NGO
     * Validates existence in users & donations. Creates logistics_tracking record.
     */
    public function allocate(Request $request)
    {
        $validated = $request->validate([
            'donation_id' => 'required|exists:donations,id',
            'volunteer_id' => 'required|exists:users,id',
            'ngo_id' => 'required|exists:users,id',
            'status' => 'required|in:pending,allocated,picked_up,transiting,in_transit,delivered,cancelled'
        ]);

        // Guard: Prevent double-booking race condition
        $existing = DB::table('logistics_tracking')
            ->where('donation_id', $validated['donation_id'])
            ->where('status', '!=', 'cancelled')
            ->first();

        if ($existing) {
            return response()->json([
                'status' => 'error',
                'message' => 'Conflict: Donation record is already allocated to active mission #' . $existing->id
            ], 400);
        }

        // Begin transaction
        DB::beginTransaction();
        try {
            $trackingId = DB::table('logistics_tracking')->insertGetId([
                'donation_id' => $validated['donation_id'],
                'volunteer_id' => $validated['volunteer_id'],
                'status' => $validated['status'],
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Mutate donation status to 'allocated' (Donor-to-NGO bridge)
            DB::table('donations')
                ->where('id', $validated['donation_id'])
                ->update(['status' => 'allocated', 'updated_at' => now()]);

            DB::commit();

            return response()->json([
                'status' => 'success',
                'message' => 'Logistics tracking created successfully.',
                'tracking_id' => $trackingId
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status' => 'error',
                'message' => 'Allocation failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/logistics/qr-code/{id}
     * Auth: Volunteer
     * Generates a 30-minute temporary signed route URL mapped to verification endpoint.
     */
    public function generateQrCode(Request $request, $id)
    {
        $tracking = DB::table('logistics_tracking')->where('id', $id)->first();
        if (!$tracking) {
            return response()->json(['status' => 'error', 'message' => 'Tracking mission not found.'], 404);
        }

        // Cryptographic Signed Route generated for 30 minutes
        // Must use key 'id' to match route parameter name for hash integrity
        $signedUrl = URL::temporarySignedRoute(
            'logistics.verify-pickup',
            now()->addMinutes(30),
            ['id' => $id]
        );

        return response()->json([
            'status' => 'success',
            'tracking_id' => $id,
            'expires_at' => now()->addMinutes(30)->toIso8601String(),
            'signed_url' => $signedUrl
        ], 200);
    }

    /**
     * GET /api/logistics/verify-pickup/{id}
     * Signed Route Enforces 'signed' middleware
     * Controller Business Logic Implementation from Build Spec v2.4 Section 6
     */
    public function verifyPickup(Request $request, $id)
    {
        // 'signed' middleware verifies URL authenticity and expiration
        $updated = DB::table('logistics_tracking')
            ->where('id', $id)
            ->where('status', 'pending')
            ->update([
                'status' => 'picked_up',
                'updated_at' => now()
            ]);

        if (!$updated) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid transition. Record may already be picked up or doesn\'t exist.'
            ], 400);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Food rescue pickup verified successfully!',
            'tracking_id' => $id,
            'new_status' => 'picked_up'
        ], 200);
    }
}
