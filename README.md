# Ellarukum Unavu ("Food for Everyone" / அனைவருக்கும் உணவு)
### Automated Food Rescue & Cryptographic Redistribution Network (Build Spec v2.4 & RBAC v1.0)

A decentralized, fraud-proof food rescue platform connecting **Food Donors** (restaurants, banquet halls, caterers) with **NGOs** (food banks, shelters) and **Field Volunteers** (courier agents).

---

## 🌟 Key Architecture & Capabilities

1. **Identity & Hybrid Tiered Trust Model**
   -This project mainly focus on providing food to homes.
   - Granular Role-Based Access Control (RBAC) across 4 distinct profiles: **Donor**, **NGO**, **Volunteer**, and **Admin**.
   - Verified NGO certification badges and private data-driven trust scoring (avoiding public friction).

2. **Decentralized Geospatial Dispatch (Leaflet.js + PostgreSQL Radial Queries)**
   - Interactive OpenStreetMap integration with dynamic radial query range slider (1 km – 25 km).
   - Simulates PostgreSQL native `ST_DWithin` spatial distance matching.
   - Filter by **Expiry Imminence** (< 2 hours, < 5 hours) and **Dietary Tags** (Pure Veg, Halal, Jain, Vegan, Bakery).

3. **Fraud-Proof Cryptographic Handover Engine**
   - 30-minute single-use HMAC-SHA256 signed URLs mapped to `/api/logistics/verify-pickup/{id}`.
   - Live dynamic QR code generation with live 30:00 countdown timer and cryptographic hash inspector.
   - Optical Scanner viewfinder simulation with laser animation.
   - Built-in **Security Guard & Tamper Testing Lab**:
     - ✅ Legitimate Handover Scan (`HTTP 200 OK`)
     - 🛡️ Tampered URL Signature Attack (`HTTP 403 Forbidden`)
     - 🛡️ Expired Token Attack (> 30 mins) (`HTTP 403 Forbidden`)
     - 🛡️ Duplicate Pickup Re-scan (`HTTP 400 Bad Request`)
     - 🛡️ State Machine Jump Attack (`HTTP 400 Bad Request` — No Jump Transitions)

4. **Mandatory PostgreSQL Check Constraint & State Machine**
   ```sql
   ALTER TABLE logistics_tracking DROP CONSTRAINT IF EXISTS logistics_tracking_status_check;
   ALTER TABLE logistics_tracking ADD CONSTRAINT logistics_tracking_status_check 
   CHECK (status IN ('pending', 'allocated', 'picked_up', 'transiting', 'in_transit', 'delivered', 'cancelled'));
   ```
   - State transition pipeline: `pending` ➔ `picked_up` (via Scan Verification) ➔ `in_transit` ➔ `delivered`.

5. **Multi-Channel Escalation Simulator**
   - Instant In-App, simulated SMS, and WhatsApp alerts for time-critical logistics and handover verification.

6. **Async Telemetry & Eco-Badges**
   - Live carbon offset calculator (kg CO2 diverted), virtual freshwater conservation, and municipal landfill diversion metrics.
   - Shareable Eco-Badges: *Zero-Waste Vanguard*, *Cryptographic Handoff Shield*, *Rapid Rescue Brigade*, and *Carbon Offset Champion*.

---

## 🚀 Running the Web Application

The modern web application is built with Vite, Leaflet, and modern Vanilla CSS.

```bash
# 1. Install dependencies
npm install

# 2. Start the local development server
npm run dev

# 3. Build production bundle
npm run build
```

Open your browser at **`http://localhost:5173/`**.

---

## 🐘 Laravel REST API Backend Reference

All backend code matching **Build Spec v2.4** is located in the `backend/` directory:
- Migration: `backend/database/migrations/2026_10_11_000001_create_ellarukum_unavu_tables.php`
- Controller: `backend/app/Http/Controllers/LogisticsAllocationController.php`
- Routes: `backend/routes/api.php`

### Execution Checklist for Builder (Spec Section 8)
1. Run `php artisan migrate:fresh` to apply foreign keys and PostgreSQL check constraints.
2. Ensure `APP_URL` in `.env` matches the request host so signed signature hashing succeeds.
3. Seed test users and donations prior to calling `/api/logistics/allocate` to satisfy foreign key validation.
4. Verify that `URL::temporarySignedRoute` uses the key `'id'` matching the route parameter name.
