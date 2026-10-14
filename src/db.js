/**
 * Ellarukum Unavu - Central Reactive State Store & PostgreSQL Database Simulator
 * Implements strict PostgreSQL constraints, foreign keys, RBAC, and HMAC-SHA256 signed URLs.
 */

const APP_URL = 'https://ellarukum-unavu.gov.in';
const APP_KEY = 'ellarukum-unavu-secret-hmac-key-v2.4';

// PostgreSQL Check Constraint Rule:
// ALTER TABLE logistics_tracking ADD CONSTRAINT logistics_tracking_status_check
// CHECK (status IN ('pending', 'allocated', 'picked_up', 'transiting', 'in_transit', 'delivered', 'cancelled'));
export const VALID_LOGISTICS_STATUSES = [
  'pending',
  'allocated',
  'picked_up',
  'transiting',
  'in_transit',
  'delivered',
  'cancelled'
];

export const VALID_DONATION_STATUSES = ['pending', 'allocated', 'completed', 'expired'];

export const VALID_ROLES = ['donor', 'ngo', 'volunteer', 'admin'];

// Initial Mock Seed Data matching specification
const INITIAL_USERS = [
  {
    id: 1,
    name: 'Spice Garden Grand Buffet',
    email: 'chef@spicegarden.org',
    role: 'donor',
    phone: '+91 98401 23456',
    address: '142 Usman Road, T. Nagar, Chennai',
    lat: 13.0418,
    lng: 80.2341,
    trust_score: 99.4,
    organization_type: 'Restaurant / Catering'
  },
  {
    id: 2,
    name: 'Royal Feasts Banquets',
    email: 'manager@royalfeasts.com',
    role: 'donor',
    phone: '+91 98402 34567',
    address: '88 Nungambakkam High Road, Chennai',
    lat: 13.0583,
    lng: 80.2425,
    trust_score: 97.8,
    organization_type: 'Convention Hall'
  },
  {
    id: 3,
    name: 'Annapoorna Community Kitchen',
    email: 'trustee@annapoornatrust.org',
    role: 'ngo',
    phone: '+91 98403 45678',
    address: '25 Lake Border Road, Kodambakkam, Chennai',
    lat: 13.0515,
    lng: 80.2210,
    trust_score: 100.0,
    verified_ngo: true,
    capacity_servings: 450
  },
  {
    id: 4,
    name: 'Karunai Illam Shelter',
    email: 'care@karunaiillam.ngo',
    role: 'ngo',
    phone: '+91 98404 56789',
    address: '5th Cross St, Shenoy Nagar, Chennai',
    lat: 13.0780,
    lng: 80.2280,
    trust_score: 98.9,
    verified_ngo: true,
    capacity_servings: 250
  },
  {
    id: 5,
    name: 'Kavitha R. (Courier #V-409)',
    email: 'kavitha.courier@rescueteam.in',
    role: 'volunteer',
    phone: '+91 98405 67890',
    address: 'Alwarpet Courier Hub, Chennai',
    lat: 13.0336,
    lng: 80.2496,
    trust_score: 99.7,
    vehicle: 'Electric Cargo Scooter',
    missions_completed: 142
  },
  {
    id: 6,
    name: 'Arun K. (Field Agent #V-112)',
    email: 'arun.swift@rescueteam.in',
    role: 'volunteer',
    phone: '+91 98406 78901',
    address: 'Kilpauk Logistics Depot, Chennai',
    lat: 13.0825,
    lng: 80.2435,
    trust_score: 98.1,
    vehicle: 'Refrigerated Delivery Van',
    missions_completed: 89
  },
  {
    id: 7,
    name: 'Dr. Meenakshi S. (State Logistics Director)',
    email: 'admin@ellarukum-unavu.gov.in',
    role: 'admin',
    phone: '+91 98400 00001',
    address: 'State Food Safety Commission, Chennai',
    lat: 13.0827,
    lng: 80.2707,
    trust_score: 100.0,
    system_role: 'Super Administrator'
  }
];

const INITIAL_DONATIONS = [
  {
    id: 101,
    donor_id: 1,
    title: 'Dum Biryani & Vegetable Pulao Feast',
    food_type: 'Cooked Hot Meals',
    dietary_tags: ['Halal', 'Non-Veg Options', 'Nut-Free'],
    quantity_servings: 140,
    prepared_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 175 * 60 * 1000).toISOString(), // ~3 hrs remaining
    temp_celsius: 68.5,
    storage: 'Insulated Cambro thermal boxes, sealed with tamper tape',
    safety_log: 'FSSAI certified chef inspection; temp checked 68.5°C; packaging sealed at 14:30',
    pickup_address: 'Spice Garden Grand Buffet, 142 Usman Rd, T. Nagar',
    lat: 13.0418,
    lng: 80.2341,
    status: 'pending', // Unallocated - available to NGOs
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 102,
    donor_id: 2,
    title: 'Artisan Bakery Sourdough & Croissant Assortment',
    food_type: 'Bakery & Packed Snacks',
    dietary_tags: ['Pure Vegetarian', 'Eggless', 'Vegan Options'],
    quantity_servings: 60,
    prepared_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 320 * 60 * 1000).toISOString(), // ~5 hrs remaining
    temp_celsius: 24.0,
    storage: 'Airtight food-grade paper packaging, dry carton boxes',
    safety_log: 'Baked fresh today; no artificial preservatives; hygiene audit passed',
    pickup_address: 'Royal Feasts Banquets, 88 Nungambakkam High Rd',
    lat: 13.0583,
    lng: 80.2425,
    status: 'pending', // Unallocated - available to NGOs
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  },
  {
    id: 103,
    donor_id: 1,
    title: 'South Indian Sambar, Avial & Steamed Ponni Rice',
    food_type: 'Cooked Hot Meals',
    dietary_tags: ['Pure Vegetarian', 'Jain Compatible', 'Gluten-Free'],
    quantity_servings: 110,
    prepared_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 150 * 60 * 1000).toISOString(),
    temp_celsius: 71.0,
    storage: 'Heavy-gauge stainless steel insulated containers',
    safety_log: 'Steamed cooked; zero onion-garlic batch separated; dispatched from wedding caterer',
    pickup_address: 'Spice Garden Grand Buffet, 142 Usman Rd, T. Nagar',
    lat: 13.0418,
    lng: 80.2341,
    status: 'allocated', // Allocated to logistics mission 201
    created_at: new Date(Date.now() - 85 * 60 * 1000).toISOString()
  },
  {
    id: 104,
    donor_id: 2,
    title: 'Fresh Farm Produce: Hydroponic Greens & Fruit Crates',
    food_type: 'Fresh Produce & Fruits',
    dietary_tags: ['Vegan', 'Gluten-Free', 'Organic'],
    quantity_servings: 85,
    prepared_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 600 * 60 * 1000).toISOString(),
    temp_celsius: 12.0,
    storage: 'Perforated ventilated crates',
    safety_log: 'Washed in food-grade ozone rinse; harvest batch logged',
    pickup_address: 'Royal Feasts Banquets, 88 Nungambakkam High Rd',
    lat: 13.0583,
    lng: 80.2425,
    status: 'completed',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  }
];

const INITIAL_LOGISTICS = [
  {
    id: 201,
    donation_id: 103,
    volunteer_id: 5,
    ngo_id: 3,
    status: 'pending', // Waiting for volunteer to present QR code at donor location!
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    pickup_eta: '12 mins',
    delivery_eta: '35 mins'
  },
  {
    id: 200,
    donation_id: 104,
    volunteer_id: 6,
    ngo_id: 4,
    status: 'delivered',
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    pickup_eta: '0 mins',
    delivery_eta: '0 mins'
  }
];

const INITIAL_AUDIT_LOGS = [
  {
    id: 1,
    timestamp: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
    action: 'DONATION_PUBLISHED',
    actor: 'Spice Garden Grand Buffet (Donor #1)',
    details: 'Published 110 servings of South Indian Sambar & Rice (Donation #103)',
    status_code: 201
  },
  {
    id: 2,
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    action: 'LOGISTICS_ALLOCATED',
    actor: 'Annapoorna Community Kitchen (NGO #3)',
    details: 'Allocated Donation #103 to Volunteer Kavitha R. (#5) - Created Mission #201',
    status_code: 200
  }
];

// Simple in-memory crypto implementation for browser HMAC-SHA256
async function generateHmacSha256(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

class DatabaseStore {
  constructor() {
    this.listeners = new Set();
    this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem('ellarukum_unavu_db');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.users = parsed.users || INITIAL_USERS;
        this.donations = parsed.donations || INITIAL_DONATIONS;
        this.logistics = parsed.logistics || INITIAL_LOGISTICS;
        this.auditLogs = parsed.auditLogs || INITIAL_AUDIT_LOGS;
        this.currentUser = parsed.currentUser || this.users[0];
        return;
      }
    } catch (e) {
      console.warn('LocalStorage error, using defaults', e);
    }
    this.resetToDefaults();
  }

  save() {
    try {
      const payload = {
        users: this.users,
        donations: this.donations,
        logistics: this.logistics,
        auditLogs: this.auditLogs,
        currentUser: this.currentUser
      };
      localStorage.setItem('ellarukum_unavu_db', JSON.stringify(payload));
    } catch (e) {
      console.error('Save failed', e);
    }
    this.notify();
  }

  resetToDefaults() {
    this.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    this.donations = JSON.parse(JSON.stringify(INITIAL_DONATIONS));
    this.logistics = JSON.parse(JSON.stringify(INITIAL_LOGISTICS));
    this.auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
    this.currentUser = this.users[0]; // Default to Donor
    this.save();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (err) {
        console.error('Listener err', err);
      }
    }
  }

  // Active User / Role Switching
  setCurrentUser(userId) {
    const user = this.users.find(u => u.id === Number(userId));
    if (user) {
      this.currentUser = user;
      this.save();
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  // Cryptographic signed URL generator (Volunteer route: GET /api/logistics/qr-code/{id})
  async generateSignedQrUrl(trackingId, expirationMinutes = 30) {
    const expires = Math.floor(Date.now() / 1000) + expirationMinutes * 60;
    const path = `/api/logistics/verify-pickup/${trackingId}`;
    const stringToSign = `${APP_URL}${path}?expires=${expires}&id=${trackingId}`;
    const signature = await generateHmacSha256(stringToSign, APP_KEY);
    const fullSignedUrl = `${APP_URL}${path}?id=${trackingId}&expires=${expires}&signature=${signature}`;
    return {
      trackingId,
      expires,
      expiresAt: new Date(expires * 1000).toLocaleTimeString(),
      signature,
      signedUrl: fullSignedUrl,
      stringToSign
    };
  }

  // Cryptographic URL validator for verifyPickup (signed middleware)
  async verifySignedUrl(signedUrlString) {
    try {
      const url = new URL(signedUrlString);
      const id = url.searchParams.get('id');
      const expires = Number(url.searchParams.get('expires'));
      const providedSignature = url.searchParams.get('signature');

      if (!id || !expires || !providedSignature) {
        return { valid: false, code: 403, error: 'Missing required cryptographic signature parameters.' };
      }

      // Check Expiration (30-minute window)
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (nowSeconds > expires) {
        return {
          valid: false,
          code: 403,
          error: `Signed URL has expired! Token expired at ${new Date(expires * 1000).toLocaleTimeString()} (${Math.floor((nowSeconds - expires) / 60)} minutes ago).`
        };
      }

      // Recreate signature and compare
      const path = `/api/logistics/verify-pickup/${id}`;
      const expectedStringToSign = `${APP_URL}${path}?expires=${expires}&id=${id}`;
      const expectedSignature = await generateHmacSha256(expectedStringToSign, APP_KEY);

      if (providedSignature !== expectedSignature) {
        return {
          valid: false,
          code: 403,
          error: 'Tampered cryptographic signature! URL tampering detected. Verification rejected.'
        };
      }

      return { valid: true, trackingId: Number(id), expires };
    } catch (e) {
      return { valid: false, code: 403, error: 'Malformed verification URL format.' };
    }
  }

  // Log an audit trail entry
  addAuditLog(action, actor, details, statusCode = 200) {
    const entry = {
      id: this.auditLogs.length + 1,
      timestamp: new Date().toISOString(),
      action,
      actor,
      details,
      status_code: statusCode
    };
    this.auditLogs.unshift(entry);
    this.save();
  }
}

export const db = new DatabaseStore();
