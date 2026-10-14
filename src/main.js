/**
 * Ellarukum Unavu — Main Application Coordinator
 * High-performance UI engine binding Leaflet, QR generator, API simulation, and RBAC workflows.
 */

import './style.css';
import { db, VALID_LOGISTICS_STATUSES } from './db.js';
import { ApiService } from './api.js';
import { RescueMap } from './map.js';
import { qrManager } from './qr.js';
import { TelemetryEngine } from './telemetry.js';
import confetti from 'canvas-confetti';

class App {
  constructor() {
    this.appEl = document.getElementById('app');
    this.activeTab = 'geospatial';
    this.rescueMap = null;
    this.currentDietFilter = 'all';
    this.currentExpiryFilter = 'all';
  }

  init() {
    this.renderShell();
    this.setupEvents();

    // Initialize Leaflet map once into the DOM container
    setTimeout(() => {
      this.initMap();
      this.renderFeedCards();
    }, 150);

    // Subscribe to reactive database changes
    db.subscribe(() => {
      this.onStateChange();
    });
  }

  initMap() {
    const mapContainer = document.getElementById('leaflet-rescue-map');
    if (!mapContainer) return;

    if (!this.rescueMap) {
      this.rescueMap = new RescueMap('leaflet-rescue-map', {
        onSelectDonation: (donationId) => this.openAllocateModal(donationId)
      });
      this.rescueMap.init();
    } else {
      this.rescueMap.invalidate();
      this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
    }
  }

  renderShell() {
    const user = db.getCurrentUser();
    const metrics = TelemetryEngine.getMetrics();

    this.appEl.innerHTML = `
      <!-- Navigation Bar -->
      <nav class="navbar">
        <div class="nav-container">
          <div class="brand-section">
            <div class="brand-icon-box">🍱</div>
            <div class="brand-text">
              <h1>Ellarukum Unavu <span class="spec-version-badge">v2.4 BUILD SPEC</span></h1>
              <span class="tamil-subtitle">அனைவருக்கும் உணவு — Decentralized Food Rescue</span>
            </div>
          </div>

          <!-- Active Role Switcher -->
          <div class="role-switcher-box">
            <span class="role-switcher-label">Active Actor:</span>
            <select id="user-role-selector" class="role-selector-dropdown">
              <optgroup label="Food Donors (Restaurants / Caterers)">
                ${db.users.filter(u => u.role === 'donor').map(u => `
                  <option value="${u.id}" ${u.id === user.id ? 'selected' : ''}>${u.name} (Donor)</option>
                `).join('')}
              </optgroup>
              <optgroup label="NGOs (Food Banks / Shelters)">
                ${db.users.filter(u => u.role === 'ngo').map(u => `
                  <option value="${u.id}" ${u.id === user.id ? 'selected' : ''}>${u.name} (NGO)</option>
                `).join('')}
              </optgroup>
              <optgroup label="Volunteers (Field Couriers)">
                ${db.users.filter(u => u.role === 'volunteer').map(u => `
                  <option value="${u.id}" ${u.id === user.id ? 'selected' : ''}>${u.name} (Volunteer)</option>
                `).join('')}
              </optgroup>
              <optgroup label="System Governance">
                ${db.users.filter(u => u.role === 'admin').map(u => `
                  <option value="${u.id}" ${u.id === user.id ? 'selected' : ''}>${u.name} (Admin)</option>
                `).join('')}
              </optgroup>
            </select>
            <div class="actor-badge-pill" id="nav-actor-trust-pill">
              <span>★ Trust: ${user.trust_score}%</span>
            </div>
          </div>

          <!-- Navigation Tabs -->
          <div class="nav-tabs">
            <button class="nav-tab-btn ${this.activeTab === 'geospatial' ? 'active' : ''}" data-tab="geospatial">
              <span>🗺️</span> Geospatial Map
            </button>
            <button class="nav-tab-btn ${this.activeTab === 'workflow' ? 'active' : ''}" data-tab="workflow">
              <span>📱</span> Role Portal
            </button>
            <button class="nav-tab-btn ${this.activeTab === 'crypto-qr' ? 'active' : ''}" data-tab="crypto-qr">
              <span>🔐</span> QR Handoff & Lab
            </button>
            <button class="nav-tab-btn ${this.activeTab === 'api-specs' ? 'active' : ''}" data-tab="api-specs">
              <span>⚡</span> API & Specs
            </button>
            <button class="nav-tab-btn ${this.activeTab === 'telemetry' ? 'active' : ''}" data-tab="telemetry">
              <span>🌿</span> Eco-Badges
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Container -->
      <main class="main-wrapper">
        <!-- Hero Banner -->
        <section class="hero-card">
          <div class="hero-grid">
            <div class="hero-content">
              <span class="hero-tag">⚡ Automated Food Rescue & Cryptographic Handover</span>
              <h2>Zero Waste. Zero Hunger. <br/><span class="highlight">100% Cryptographically Verified.</span></h2>
              <p class="hero-desc">
                Connecting commercial kitchens, wedding caterers, and food banks across Tamil Nadu.
                Powered by PostgreSQL radial spatial queries and tamper-proof HMAC-SHA256 signed QR codes with 30-minute single-use windows.
              </p>
              <div class="hero-actions" id="hero-actions-container">
                ${this.renderHeroActions(user)}
                <button class="btn btn-secondary" id="hero-tamper-lab-btn">
                  <span>🧪</span> Launch Tamper Testing Lab
                </button>
              </div>
            </div>
            <div class="hero-image-pane">
              <img src="/hero.jpg" alt="Ellarukum Unavu Food Distribution" />
              <div class="hero-image-overlay"></div>
            </div>
          </div>

          <!-- Hero Metrics Ticker -->
          <div class="hero-stats-bar">
            <div class="stat-item">
              <div class="stat-icon">🍲</div>
              <div class="stat-numbers">
                <div class="stat-value" id="metric-servings">${metrics.servingsRescued.toLocaleString()}+</div>
                <div class="stat-label">Meals Rescued</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🌍</div>
              <div class="stat-numbers">
                <div class="stat-value" id="metric-co2">${metrics.kgCo2Saved.toLocaleString()} kg</div>
                <div class="stat-label">CO2 Diverted</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">🛡️</div>
              <div class="stat-numbers">
                <div class="stat-value">100%</div>
                <div class="stat-label">Fraud-Free Handover</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon">⚡</div>
              <div class="stat-numbers">
                <div class="stat-value" id="metric-active">${metrics.activeMissions} Active</div>
                <div class="stat-label">Real-Time Missions</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Dynamic Tab Panels (Permanently in DOM to avoid Leaflet remount issues) -->
        <section id="tab-geospatial" class="tab-content-panel ${this.activeTab === 'geospatial' ? 'active' : ''}">
          ${this.renderGeospatialTabHtml()}
        </section>

        <section id="tab-workflow" class="tab-content-panel ${this.activeTab === 'workflow' ? 'active' : ''}">
          ${this.renderWorkflowTabHtml()}
        </section>

        <section id="tab-crypto-qr" class="tab-content-panel ${this.activeTab === 'crypto-qr' ? 'active' : ''}">
          ${this.renderCryptoQrTabHtml()}
        </section>

        <section id="tab-api-specs" class="tab-content-panel ${this.activeTab === 'api-specs' ? 'active' : ''}">
          ${this.renderApiSpecsTabHtml()}
        </section>

        <section id="tab-telemetry" class="tab-content-panel ${this.activeTab === 'telemetry' ? 'active' : ''}">
          ${this.renderTelemetryTabHtml()}
        </section>
      </main>

      <!-- Modal Container -->
      <div id="modal-container"></div>
    `;
  }

  renderHeroActions(user) {
    if (user.role === 'donor') {
      return `
        <button class="btn btn-amber" id="hero-post-donation-btn">
          <span>🍱</span> Publish Surplus Food
        </button>
      `;
    } else if (user.role === 'ngo') {
      return `
        <button class="btn btn-primary" id="hero-browse-feed-btn">
          <span>⚡</span> Claim Available Surplus
        </button>
      `;
    } else if (user.role === 'volunteer') {
      return `
        <button class="btn btn-amber" id="hero-qr-btn">
          <span>📱</span> Present Pickup QR Token
        </button>
      `;
    } else {
      return `
        <button class="btn btn-primary" id="hero-admin-btn">
          <span>🛡️</span> Administrative Oversight
        </button>
      `;
    }
  }

  /* ----------------------------------------------------
     REACTIVE STATE UPDATE (DOES NOT DESTROY DOM / MAP)
     ---------------------------------------------------- */
  onStateChange() {
    const user = db.getCurrentUser();
    const metrics = TelemetryEngine.getMetrics();

    // 1. Update metric numbers in ticker
    const sEl = document.getElementById('metric-servings');
    if (sEl) sEl.textContent = `${metrics.servingsRescued.toLocaleString()}+`;
    const cEl = document.getElementById('metric-co2');
    if (cEl) cEl.textContent = `${metrics.kgCo2Saved.toLocaleString()} kg`;
    const aEl = document.getElementById('metric-active');
    if (aEl) aEl.textContent = `${metrics.activeMissions} Active`;

    // 2. Update actor badge
    const trustEl = document.getElementById('nav-actor-trust-pill');
    if (trustEl) trustEl.innerHTML = `<span>★ Trust: ${user.trust_score}%</span>`;

    // 3. Update Hero actions for active role
    const heroActionsEl = document.getElementById('hero-actions-container');
    if (heroActionsEl) {
      heroActionsEl.innerHTML = `
        ${this.renderHeroActions(user)}
        <button class="btn btn-secondary" id="hero-tamper-lab-btn">
          <span>🧪</span> Launch Tamper Testing Lab
        </button>
      `;
    }

    // 4. Update Map & Feed cards in place
    if (this.rescueMap) {
      this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
    }
    this.renderFeedCards();

    // 5. Update Workflow tab content
    const workflowPanel = document.getElementById('tab-workflow');
    if (workflowPanel) {
      workflowPanel.innerHTML = this.renderWorkflowTabHtml();
    }

    // 6. Update QR Mission selector
    this.updateQrMissionSelector();

    // 7. Update Telemetry tab if active
    if (this.activeTab === 'telemetry') {
      const telPanel = document.getElementById('tab-telemetry');
      if (telPanel) telPanel.innerHTML = this.renderTelemetryTabHtml();
    }
  }

  /* ----------------------------------------------------
     TAB 1: Geospatial Processing & Leaflet Map
     ---------------------------------------------------- */
  renderGeospatialTabHtml() {
    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Decentralized Geospatial Dispatch</h3>
          <p>Native PostgreSQL radial distance queries (<code class="sql-code-inline">ST_DWithin</code>) + Leaflet.js real-time OpenStreetMap rendering.</p>
        </div>
      </div>

      <div class="geospatial-layout">
        <!-- Leaflet Map Container -->
        <div class="map-card-wrapper">
          <div class="map-controls-bar">
            <div class="radial-slider-box">
              <label for="radial-range-input">Radial Radius:</label>
              <input type="range" id="radial-range-input" class="range-slider" min="1" max="25" value="10" />
              <span id="radial-value-display" class="radius-badge">10 km radius</span>
            </div>

            <div class="map-filter-tags">
              <select id="map-diet-filter" class="filter-select">
                <option value="all">All Dietary Tags</option>
                <option value="Vegetarian">Pure Vegetarian</option>
                <option value="Halal">Halal Verified</option>
                <option value="Jain">Jain Compatible</option>
                <option value="Vegan">Vegan Produce</option>
                <option value="Bakery">Bakery & Snacks</option>
              </select>

              <select id="map-expiry-filter" class="filter-select">
                <option value="all">Any Expiration Window</option>
                <option value="imminent">⏳ Imminent (&lt; 2 Hours)</option>
                <option value="medium">⏱️ Medium (&lt; 5 Hours)</option>
              </select>

              <!-- Quick Pan Nudge Buttons in Header -->
              <div class="map-nudge-control-bar" title="Pan Map Directionally">
                <span class="nudge-bar-label">Pan:</span>
                <div class="nudge-btn-cluster">
                  <button class="btn-map-move" data-dir="left" title="Pan West (Left)">◀</button>
                  <button class="btn-map-move" data-dir="up" title="Pan North (Up)">▲</button>
                  <button class="btn-map-move" data-dir="down" title="Pan South (Down)">▼</button>
                  <button class="btn-map-move" data-dir="right" title="Pan East (Right)">▶</button>
                </div>
              </div>

              <button class="btn btn-secondary btn-sm" id="btn-recenter-map">
                📍 Center On Me
              </button>
            </div>
          </div>

          <!-- Quick Move Location Presets Strip -->
          <div class="map-movement-strip">
            <div class="movement-strip-left">
              <span class="movement-strip-label">🧭 Move Map to:</span>
              <div class="map-preset-pills">
                <button class="btn-preset-chip active" data-preset="me">📍 My Location</button>
                <button class="btn-preset-chip" data-preset="central">🏙️ Central Chennai</button>
                <button class="btn-preset-chip" data-preset="tnagar">🛍️ T. Nagar</button>
                <button class="btn-preset-chip" data-preset="annanagar">🌳 Anna Nagar</button>
                <button class="btn-preset-chip" data-preset="adyar">🌊 Adyar</button>
                <button class="btn-preset-chip" data-preset="velachery">🏢 Velachery</button>
                <button class="btn-preset-chip" data-preset="tambaram">🚆 Tambaram</button>
              </div>
            </div>
            <div class="movement-strip-right">
              <button class="btn btn-secondary btn-xs btn-fit-all" id="btn-fit-all-map" title="Fit all active donations and hubs in view">
                <span>⤢</span> View All Operations
              </button>
            </div>
          </div>

          <!-- Map Viewport with Floating D-Pad Controller -->
          <div class="map-viewport-wrapper">
            <div id="leaflet-rescue-map" style="height: 620px; width: 100%;"></div>

            <!-- On-Screen Floating Compass D-Pad Movement Controller -->
            <div class="map-floating-dpad" id="map-movement-dpad" aria-label="Map Movement Controller">
              <div class="dpad-header">
                <div class="dpad-header-info">
                  <span class="dpad-icon">🧭</span>
                  <span class="dpad-title">Map Controller</span>
                </div>
                <span class="dpad-badge">Pan & Move</span>
              </div>

              <div class="dpad-compass-grid">
                <button class="dpad-btn dpad-up" data-dir="up" title="Pan North (Up) [↑]" aria-label="Pan North">
                  <span class="arrow-glyph">▲</span>
                  <span class="dir-text">N</span>
                </button>
                <div class="dpad-middle-row">
                  <button class="dpad-btn dpad-left" data-dir="left" title="Pan West (Left) [←]" aria-label="Pan West">
                    <span class="arrow-glyph">◀</span>
                    <span class="dir-text">W</span>
                  </button>
                  <button class="dpad-btn dpad-center" data-dir="center" title="Recenter on My Location" aria-label="Recenter">
                    <span class="dpad-target-icon">🎯</span>
                    <span class="center-text">RESET</span>
                  </button>
                  <button class="dpad-btn dpad-right" data-dir="right" title="Pan East (Right) [→]" aria-label="Pan East">
                    <span class="arrow-glyph">▶</span>
                    <span class="dir-text">E</span>
                  </button>
                </div>
                <button class="dpad-btn dpad-down" data-dir="down" title="Pan South (Down) [↓]" aria-label="Pan South">
                  <span class="dir-text">S</span>
                  <span class="arrow-glyph">▼</span>
                </button>
              </div>

              <div class="dpad-zoom-controls">
                <button class="dpad-mini-btn" id="dpad-zoom-in" title="Zoom In (+)">
                  <span>➕</span> Zoom In
                </button>
                <button class="dpad-mini-btn" id="dpad-fit-all" title="Fit all operations">
                  <span>⤢</span> Fit All
                </button>
                <button class="dpad-mini-btn" id="dpad-zoom-out" title="Zoom Out (-)">
                  <span>➖</span> Zoom Out
                </button>
              </div>

              <div class="dpad-hint">
                <span>💡 Click/hold arrows or use <strong>↑ ↓ ← →</strong> keys</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Available Surplus Feed Sidebar -->
        <div class="map-sidebar">
          <div class="sidebar-panel">
            <h4>
              <span>Surplus Food Inventory</span>
              <span class="badge badge-amber" id="feed-count-badge">Available</span>
            </h4>
            <div class="feed-items-scroll" id="feed-items-container">
              <!-- Rendered via JS -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  renderFeedCards() {
    const container = document.getElementById('feed-items-container');
    const countBadge = document.getElementById('feed-count-badge');
    if (!container) return;

    const currentUser = db.getCurrentUser();
    const allocatedDonationIds = new Set(db.logistics.map(l => l.donation_id));

    // Filter donations
    let available = db.donations.filter(d => {
      // Exclude allocated
      if (allocatedDonationIds.has(d.id)) return false;
      if (d.status !== 'pending') return false;

      // Dietary filter
      if (this.currentDietFilter !== 'all') {
        const match = d.dietary_tags.some(t => t.toLowerCase().includes(this.currentDietFilter.toLowerCase()));
        if (!match) return false;
      }

      // Expiry filter
      const remainingHours = (new Date(d.expires_at) - new Date()) / (3600 * 1000);
      if (this.currentExpiryFilter === 'imminent' && remainingHours > 2) return false;
      if (this.currentExpiryFilter === 'medium' && (remainingHours <= 2 || remainingHours > 5)) return false;

      return true;
    });

    if (countBadge) {
      countBadge.textContent = `${available.length} Available`;
    }

    if (available.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem 1rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🍲</div>
          <p>No unallocated surplus matches current radial/dietary filters.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = available.map(d => {
      const donor = db.users.find(u => u.id === d.donor_id) || {};
      const remainingMs = new Date(d.expires_at) - new Date();
      const hours = Math.max(0, Math.floor(remainingMs / (3600 * 1000)));
      const mins = Math.max(0, Math.floor((remainingMs % (3600 * 1000)) / (60 * 1000)));

      return `
        <div class="feed-card" data-donation-id="${d.id}">
          <div class="feed-card-header">
            <h5>${d.title}</h5>
            <span class="badge badge-amber">${d.quantity_servings} Servings</span>
          </div>
          <div class="feed-donor-name">📍 ${donor.name || 'Certified Donor'} • ${d.pickup_address}</div>
          <div class="feed-meta-row">
            <span class="badge badge-info">🌡️ ${d.temp_celsius}°C</span>
            <span class="badge badge-warning">⏳ ${hours}h ${mins}m left</span>
          </div>
          <div class="feed-meta-row">
            ${d.dietary_tags.map(t => `<span class="diet-pill">${t}</span>`).join('')}
          </div>
          <div style="display: flex; gap: 0.4rem; margin-top: 0.75rem;">
            <button class="btn btn-secondary btn-sm btn-focus-on-map" data-id="${d.id}" style="flex: 1;">
              📍 View on Map
            </button>
            ${currentUser.role === 'ngo' ? `
              <button class="btn btn-primary btn-sm btn-claim-action" style="flex: 1.5;" data-id="${d.id}">
                ⚡ Claim Mission
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach click events
    container.querySelectorAll('.btn-claim-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const donationId = Number(e.currentTarget.getAttribute('data-id'));
        this.openAllocateModal(donationId);
      });
    });

    container.querySelectorAll('.btn-focus-on-map').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const donationId = Number(e.currentTarget.getAttribute('data-id'));
        if (this.rescueMap) {
          this.rescueMap.focusDonation(donationId);
        }
      });
    });
  }

  /* ----------------------------------------------------
     TAB 2: Granular Role Workflow Portal
     ---------------------------------------------------- */
  renderWorkflowTabHtml() {
    const user = db.getCurrentUser();

    let roleHtml = '';
    if (user.role === 'donor') {
      roleHtml = this.renderDonorWorkflow(user);
    } else if (user.role === 'ngo') {
      roleHtml = this.renderNgoWorkflow(user);
    } else if (user.role === 'volunteer') {
      roleHtml = this.renderVolunteerWorkflow(user);
    } else if (user.role === 'admin') {
      roleHtml = this.renderAdminWorkflow(user);
    }

    return `
      <div class="role-workflows-view">
        <!-- Role Profile Header -->
        <div class="role-banner-card">
          <div class="role-info-group">
            <div class="role-avatar-circle">
              ${user.role === 'donor' ? '👨‍🍳' : user.role === 'ngo' ? '🏛️' : user.role === 'volunteer' ? '🛵' : '🛡️'}
            </div>
            <div class="role-titles">
              <h3>${user.name}</h3>
              <p>Domain: ${user.address || 'Chennai Central Hub'} • Authenticated Profile: <strong>${user.role.toUpperCase()}</strong></p>
            </div>
          </div>

          <div class="rbac-constraints-summary">
            <div class="rbac-item allowed">
              <span>✅ Permitted:</span>
              <strong>${
                user.role === 'donor' ? 'Publish Surplus & Track Handoff' :
                user.role === 'ngo' ? 'Claim Feed & Allocate Couriers' :
                user.role === 'volunteer' ? 'Generate 30-min QR & Progress Transit' :
                'Full Oversight & Constraint Override'
              }</strong>
            </div>
            <div class="rbac-item prohibited">
              <span>⛔ Prohibited:</span>
              <span>${
                user.role === 'donor' ? 'Browse other donors, manual assign' :
                user.role === 'ngo' ? 'Create surplus inventory' :
                user.role === 'volunteer' ? 'Claim unallocated donations' :
                'None (Full administrative authority)'
              }</span>
            </div>
          </div>
        </div>

        ${roleHtml}
      </div>
    `;
  }

  renderDonorWorkflow(user) {
    const myListings = db.donations.filter(d => d.donor_id === user.id);

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Donor Management Console</h3>
          <p>Create FSSAI safety-compliant food donations and monitor cryptographic courier pickups.</p>
        </div>
        <button class="btn btn-amber" id="btn-open-new-donation">
          <span>+</span> Publish New Surplus Food
        </button>
      </div>

      <div class="dashboard-grid">
        ${myListings.length === 0 ? `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <p>You have no active surplus food listings. Click "+ Publish New Surplus Food" to list one.</p>
          </div>
        ` : myListings.map(d => {
          const tracking = db.logistics.find(l => l.donation_id === d.id);
          const volunteer = tracking ? db.users.find(u => u.id === tracking.volunteer_id) : null;
          const ngo = tracking ? db.users.find(u => u.id === tracking.ngo_id) : null;

          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">
                  <h4>${d.title}</h4>
                  <p>Listed: ${new Date(d.created_at).toLocaleTimeString()}</p>
                </div>
                <span class="status-pill ${d.status}">${d.status}</span>
              </div>

              <div class="card-body">
                <div class="listing-meta-table">
                  <div class="meta-row">
                    <span class="label">Quantity:</span>
                    <span class="val">${d.quantity_servings} Servings (${d.food_type})</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Food Safety Temp:</span>
                    <span class="val" style="color: #34D399;">${d.temp_celsius}°C (Verified Safe)</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Packaging & Storage:</span>
                    <span class="val">${d.storage}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Recipient NGO:</span>
                    <span class="val">${ngo ? ngo.name : 'Awaiting NGO Claim'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Assigned Courier:</span>
                    <span class="val">${volunteer ? volunteer.name : 'Pending Allocation'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Logistics Stage:</span>
                    <span class="val">${tracking ? `<span class="status-pill ${tracking.status}">${tracking.status}</span>` : 'Unassigned'}</span>
                  </div>
                </div>
              </div>

              <div class="card-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                ${d.status === 'pending' ? `
                  <button class="btn btn-danger btn-sm btn-cancel-donation" data-id="${d.id}">
                    Cancel Unallocated Listing
                  </button>
                ` : tracking && tracking.status === 'pending' ? `
                  <button class="btn btn-primary btn-sm btn-simulate-scan-pickup" data-tracking="${tracking.id}">
                    📷 Scan Volunteer QR Code
                  </button>
                ` : `
                  <span class="badge badge-success">🔒 Listing Locked (In Progress)</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderNgoWorkflow(user) {
    const allocatedDonationIds = new Set(db.logistics.map(l => l.donation_id));
    const available = db.donations.filter(d => d.status === 'pending' && !allocatedDonationIds.has(d.id));
    const myIncoming = db.logistics.filter(l => l.ngo_id === user.id && l.status !== 'cancelled');

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Recipient NGO Operational Hub</h3>
          <p>Discover real-time unallocated surplus inventory and confirm final delivery receipts.</p>
        </div>
      </div>

      <!-- Active Incoming Rescues -->
      <h4 style="margin-bottom: 1rem; color: #60A5FA;">📦 Active Missions Dispatched To ${user.name}</h4>
      <div class="dashboard-grid" style="margin-bottom: 2.5rem;">
        ${myIncoming.length === 0 ? `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
            <p>No active logistics missions currently allocated to your center.</p>
          </div>
        ` : myIncoming.map(mission => {
          const donation = db.donations.find(d => d.id === mission.donation_id);
          const volunteer = db.users.find(u => u.id === mission.volunteer_id);
          const donor = donation ? db.users.find(u => u.id === donation.donor_id) : null;

          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">
                  <h4>Mission #${mission.id}: ${donation ? donation.title : 'Food Rescue'}</h4>
                  <p>Courier: <strong>${volunteer ? volunteer.name : 'Field Courier'}</strong> (${volunteer ? volunteer.vehicle : 'Transit'})</p>
                </div>
                <span class="status-pill ${mission.status}">${mission.status}</span>
              </div>
              <div class="card-body">
                <div class="listing-meta-table">
                  <div class="meta-row">
                    <span class="label">Donor:</span>
                    <span class="val">${donor ? donor.name : 'Donor Hub'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Quantity:</span>
                    <span class="val">${donation ? donation.quantity_servings : 0} Servings</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Pickup Address:</span>
                    <span class="val">${donation ? donation.pickup_address : 'Address'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Safety Log:</span>
                    <span class="val" style="color: #34D399;">${donation ? donation.safety_log : 'FSSAI Compliant'}</span>
                  </div>
                </div>
              </div>
              <div class="card-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                ${mission.status === 'in_transit' ? `
                  <button class="btn btn-primary btn-confirm-receipt" data-tracking="${mission.id}">
                    ✅ Confirm Delivery Receipt
                  </button>
                ` : mission.status === 'picked_up' ? `
                  <span class="badge badge-info">Courier Picked Up • Awaiting Transit</span>
                ` : mission.status === 'delivered' ? `
                  <span class="badge badge-success">✓ Safely Accepted & Redistributed</span>
                ` : `
                  <span class="badge badge-amber">Courier En-Route to Donor</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Unallocated Surplus Feed -->
      <h4 style="margin-bottom: 1rem; color: #34D399;">⚡ Available Surplus Food (Unclaimed Feed)</h4>
      <div class="dashboard-grid">
        ${available.length === 0 ? `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
            <p>All surplus donations are currently claimed.</p>
          </div>
        ` : available.map(d => {
          const donor = db.users.find(u => u.id === d.donor_id) || {};
          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">
                  <h4>${d.title}</h4>
                  <p>From: <strong>${donor.name}</strong></p>
                </div>
                <span class="badge badge-amber">${d.quantity_servings} Servings</span>
              </div>
              <div class="card-body">
                <div class="listing-meta-table">
                  <div class="meta-row">
                    <span class="label">Pickup Location:</span>
                    <span class="val">${d.pickup_address}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Temp:</span>
                    <span class="val">${d.temp_celsius}°C</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Dietary:</span>
                    <span class="val">${d.dietary_tags.join(', ')}</span>
                  </div>
                </div>
              </div>
              <div class="card-footer">
                <button class="btn btn-primary btn-claim-action" style="width: 100%;" data-id="${d.id}">
                  ⚡ Claim & Assign Volunteer
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderVolunteerWorkflow(user) {
    const myMissions = db.logistics.filter(l => l.volunteer_id === user.id && l.status !== 'cancelled');

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Field Courier Operations Panel</h3>
          <p>Access assigned rescue missions, present short-lived cryptographic signed QR codes, and advance transit.</p>
        </div>
      </div>

      <div class="dashboard-grid">
        ${myMissions.length === 0 ? `
          <div class="card" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
            <p>No rescue missions currently assigned to your courier ID.</p>
          </div>
        ` : myMissions.map(mission => {
          const donation = db.donations.find(d => d.id === mission.donation_id);
          const donor = donation ? db.users.find(u => u.id === donation.donor_id) : null;
          const ngo = db.users.find(u => u.id === mission.ngo_id);

          return `
            <div class="card">
              <div class="card-header">
                <div class="card-title">
                  <h4>Mission #${mission.id}</h4>
                  <p>${donation ? donation.title : 'Food Rescue'}</p>
                </div>
                <span class="status-pill ${mission.status}">${mission.status}</span>
              </div>

              <div class="card-body">
                <div class="listing-meta-table">
                  <div class="meta-row">
                    <span class="label">Donor Pickup:</span>
                    <span class="val">${donor ? donor.name : 'Donor Hub'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Address:</span>
                    <span class="val">${donation ? donation.pickup_address : 'Address'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Destination NGO:</span>
                    <span class="val">${ngo ? ngo.name : 'NGO Center'}</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Servings:</span>
                    <span class="val">${donation ? donation.quantity_servings : 0} Meals</span>
                  </div>
                  <div class="meta-row">
                    <span class="label">Vehicle:</span>
                    <span class="val">${user.vehicle || 'Courier Vehicle'}</span>
                  </div>
                </div>
              </div>

              <div class="card-footer" style="display: flex; gap: 0.5rem; justify-content: flex-end; flex-wrap: wrap;">
                ${mission.status === 'pending' ? `
                  <button class="btn btn-amber btn-sm btn-open-qr-token" data-tracking="${mission.id}">
                    📱 Present 30-Min Signed QR Code
                  </button>
                ` : mission.status === 'picked_up' ? `
                  <button class="btn btn-primary btn-sm btn-start-transit" data-tracking="${mission.id}">
                    🚚 Start Transit to NGO
                  </button>
                ` : mission.status === 'in_transit' ? `
                  <span class="badge badge-info">En-Route • Deliver to ${ngo ? ngo.name : 'NGO'}</span>
                ` : `
                  <span class="badge badge-success">✓ Mission Complete</span>
                `}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  renderAdminWorkflow(user) {
    const totalLogistics = db.logistics.length;

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>State Oversight & Constraint Override Control</h3>
          <p>Administrative governance, audit trail logs, private trust score monitors, and state machine override authority.</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-secondary btn-sm" id="btn-admin-reset-db">
            🔄 Reset Database to Seed State
          </button>
          <button class="btn btn-amber btn-sm" id="btn-trigger-escalation">
            📱 Simulate Multi-Channel Escalation
          </button>
        </div>
      </div>

      <!-- Admin Summary Metrics -->
      <div class="dashboard-grid" style="margin-bottom: 2rem;">
        <div class="card">
          <div class="card-header">
            <h4>Database Integrity</h4>
            <span class="badge badge-success">CHECK Constraint Active</span>
          </div>
          <div class="card-body">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">
              Enforcing PostgreSQL check constraint across all logistics records:
            </p>
            <code class="meta-url-preview">CHECK (status IN ('pending', 'allocated', 'picked_up', 'transiting', 'in_transit', 'delivered', 'cancelled'))</code>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4>Private Trust Scores</h4>
            <span class="badge badge-amber">Private Telemetry</span>
          </div>
          <div class="card-body">
            <div class="listing-meta-table">
              ${db.users.slice(0, 4).map(u => `
                <div class="meta-row">
                  <span class="label">${u.name} (${u.role}):</span>
                  <span class="val" style="color: #34D399;">${u.trust_score}%</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4>State Override Tool</h4>
            <span class="badge badge-error">Constraint Override</span>
          </div>
          <div class="card-body">
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.75rem;">
              Admin authority to override stuck missions with logged reason:
            </p>
            <button class="btn btn-secondary btn-sm" style="width: 100%;" id="btn-open-override-modal">
              ⚙️ Open Administrative Override Panel
            </button>
          </div>
        </div>
      </div>

      <!-- Complete Logistics Missions Table -->
      <div class="card" style="margin-bottom: 2rem;">
        <div class="card-header">
          <h4>Table: <code>logistics_tracking</code> (${totalLogistics} Records)</h4>
        </div>
        <div class="card-body" style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Donation ID</th>
                <th>Volunteer</th>
                <th>Recipient NGO</th>
                <th>Status (Check Enforced)</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${db.logistics.map(l => {
                const vol = db.users.find(u => u.id === l.volunteer_id);
                const ngo = db.users.find(u => u.id === l.ngo_id);
                return `
                  <tr>
                    <td><code>#${l.id}</code></td>
                    <td><code>#${l.donation_id}</code></td>
                    <td>${vol ? vol.name : l.volunteer_id}</td>
                    <td>${ngo ? ngo.name : l.ngo_id}</td>
                    <td><span class="status-pill ${l.status}">${l.status}</span></td>
                    <td>${new Date(l.created_at).toLocaleTimeString()}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm btn-override-single" data-id="${l.id}">
                        Override
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Audit Trail Log -->
      <div class="card">
        <div class="card-header">
          <h4>System Audit Trail & State Transitions</h4>
          <span class="badge badge-info">${db.auditLogs.length} Events</span>
        </div>
        <div class="card-body" style="max-height: 280px; overflow-y: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Actor</th>
                <th>Details</th>
                <th>Code</th>
              </tr>
            </thead>
            <tbody>
              ${db.auditLogs.map(a => `
                <tr>
                  <td><code style="font-size: 0.72rem;">${new Date(a.timestamp).toLocaleTimeString()}</code></td>
                  <td><span class="badge ${a.status_code === 200 || a.status_code === 201 ? 'badge-success' : a.status_code === 403 ? 'badge-warning' : 'badge-error'}">${a.action}</span></td>
                  <td><strong>${a.actor}</strong></td>
                  <td style="font-size: 0.78rem;">${a.details}</td>
                  <td><code>${a.status_code}</code></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------
     TAB 3: Cryptographic QR Handoff & Tamper Lab
     ---------------------------------------------------- */
  renderCryptoQrTabHtml() {
    const pendingMission = db.logistics.find(l => l.status === 'pending') || db.logistics[0];

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Fraud-Proof Cryptographic Handover Engine</h3>
          <p>30-minute signed URLs rendered as dynamic QR codes. Validated by Laravel signed route middleware against <code class="sql-code-inline">APP_URL</code>.</p>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-primary" id="btn-simulate-camera-scan">
            📷 Simulate Handover Optical Scan
          </button>
        </div>
      </div>

      <div class="qr-lab-grid">
        <!-- Live QR Token Viewer -->
        <div>
          <div style="margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <h4>Live Courier Handover Token</h4>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <label style="font-size: 0.78rem; color: var(--text-muted);">Mission:</label>
              <select id="qr-mission-picker" class="filter-select">
                ${db.logistics.map(l => `
                  <option value="${l.id}" ${l.id === (pendingMission ? pendingMission.id : 201) ? 'selected' : ''}>Mission #${l.id} (${l.status})</option>
                `).join('')}
              </select>
              <button class="btn btn-amber btn-sm" id="btn-manual-gen-qr">⚡ Generate QR</button>
            </div>
          </div>
          <div id="live-qr-render-target">
            <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
              <p>Loading QR Code...</p>
            </div>
          </div>
        </div>

        <!-- Security & Tamper Testing Lab -->
        <div class="tamper-lab-card">
          <div class="card-header">
            <div class="card-title">
              <h4>Security Guard & Tamper Testing Lab</h4>
              <p>Execute cryptographic attack simulations defined in Build Spec v2.4 Section 7 & 8.</p>
            </div>
          </div>

          <div class="tamper-suite-buttons">
            <button class="btn-test" data-test="VALID_SCAN">
              <span class="test-name">1. Legitimate Handover Scan</span>
              <span class="test-expected">Expected: HTTP 200 OK ('picked_up')</span>
            </button>
            <button class="btn-test" data-test="TAMPERED_SIGNATURE">
              <span class="test-name">2. Tampered URL Signature</span>
              <span class="test-expected">Expected: HTTP 403 Forbidden</span>
            </button>
            <button class="btn-test" data-test="EXPIRED_URL">
              <span class="test-name">3. Expired Token (&gt; 30 Mins)</span>
              <span class="test-expected">Expected: HTTP 403 Forbidden</span>
            </button>
            <button class="btn-test" data-test="DUPLICATE_SCAN">
              <span class="test-name">4. Duplicate Pickup Re-Scan</span>
              <span class="test-expected">Expected: HTTP 400 Bad Request</span>
            </button>
            <button class="btn-test" data-test="JUMP_TRANSITION" style="grid-column: 1 / -1;">
              <span class="test-name">5. State Jump Attack (Skip pending ➔ delivered)</span>
              <span class="test-expected">Expected: HTTP 400 Bad Request (No Jump Transitions Rule)</span>
            </button>
          </div>

          <div class="tamper-result-box" id="tamper-test-output">
            <div style="color: var(--text-muted); text-align: center; padding: 2rem 1rem;">
              Select a test case above to trigger real-time cryptographic middleware validation.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  updateQrMissionSelector() {
    const picker = document.getElementById('qr-mission-picker');
    if (!picker) return;

    const currentVal = Number(picker.value);
    picker.innerHTML = db.logistics.map(l => `
      <option value="${l.id}" ${l.id === currentVal ? 'selected' : ''}>Mission #${l.id} (${l.status})</option>
    `).join('');
  }

  /* ----------------------------------------------------
     TAB 4: API Endpoint Specifications & Schema
     ---------------------------------------------------- */
  renderApiSpecsTabHtml() {
    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Software Requirements & REST API Contracts</h3>
          <p>Specification conformance: Laravel REST API + PostgreSQL CHECK constraints + Signed Middleware.</p>
        </div>
      </div>

      <div class="spec-tabs-container">
        <div class="spec-tabs-nav">
          <button class="spec-tab-btn active" data-spec-tab="api-console">⚡ Live API Endpoint Console</button>
          <button class="spec-tab-btn" data-spec-tab="db-schema">🗄️ PostgreSQL Database Schema</button>
          <button class="spec-tab-btn" data-spec-tab="controller-code">📜 Controller Logic (LogisticsAllocationController)</button>
        </div>

        <!-- Spec Tab 1: Live API Console -->
        <div class="spec-tab-pane active" id="pane-api-console">
          <!-- Endpoint 1 -->
          <div class="api-endpoint-card">
            <div class="api-endpoint-header">
              <div class="api-route-pill">
                <span class="http-method get">GET</span>
                <span>/api/donations/available</span>
              </div>
              <button class="btn btn-primary btn-sm btn-run-endpoint" data-endpoint="GET_AVAILABLE">
                Execute Request
              </button>
            </div>
            <div class="api-endpoint-body">
              <div class="api-req-col">
                <h5>Request Contract</h5>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                  <strong>Auth:</strong> NGO | <strong>Params:</strong> None<br/>
                  <strong>Rule:</strong> Returns donations where <code>status = 'pending'</code> and ID is not in <code>logistics_tracking</code>.
                </p>
              </div>
              <div class="api-res-col">
                <h5>Live JSON Response</h5>
                <pre class="json-output" id="res-endpoint-available">// Click 'Execute Request' to query endpoint</pre>
              </div>
            </div>
          </div>

          <!-- Endpoint 2 -->
          <div class="api-endpoint-card">
            <div class="api-endpoint-header">
              <div class="api-route-pill">
                <span class="http-method post">POST</span>
                <span>/api/logistics/allocate</span>
              </div>
              <button class="btn btn-primary btn-sm btn-run-endpoint" data-endpoint="POST_ALLOCATE">
                Execute Request
              </button>
            </div>
            <div class="api-endpoint-body">
              <div class="api-req-col">
                <h5>Request Contract</h5>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                  <strong>Auth:</strong> Admin/NGO<br/>
                  <strong>Payload:</strong> <code>{ donation_id: 101, volunteer_id: 5, ngo_id: 3, status: 'pending' }</code>
                </p>
              </div>
              <div class="api-res-col">
                <h5>Live JSON Response</h5>
                <pre class="json-output" id="res-endpoint-allocate">// Click 'Execute Request' to query endpoint</pre>
              </div>
            </div>
          </div>

          <!-- Endpoint 3 -->
          <div class="api-endpoint-card">
            <div class="api-endpoint-header">
              <div class="api-route-pill">
                <span class="http-method get">GET</span>
                <span>/api/logistics/qr-code/{id}</span>
              </div>
              <button class="btn btn-primary btn-sm btn-run-endpoint" data-endpoint="GET_QR">
                Execute Request
              </button>
            </div>
            <div class="api-endpoint-body">
              <div class="api-req-col">
                <h5>Request Contract</h5>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                  <strong>Auth:</strong> Volunteer | <strong>Param:</strong> Route id: <code>201</code><br/>
                  Generates a 30-minute temporary signed route URL mapped to verification endpoint.
                </p>
              </div>
              <div class="api-res-col">
                <h5>Live JSON Response</h5>
                <pre class="json-output" id="res-endpoint-qr">// Click 'Execute Request' to query endpoint</pre>
              </div>
            </div>
          </div>

          <!-- Endpoint 4 -->
          <div class="api-endpoint-card">
            <div class="api-endpoint-header">
              <div class="api-route-pill">
                <span class="http-method get">GET</span>
                <span>/api/logistics/verify-pickup/{id}</span>
              </div>
              <button class="btn btn-primary btn-sm btn-run-endpoint" data-endpoint="GET_VERIFY">
                Execute Request
              </button>
            </div>
            <div class="api-endpoint-body">
              <div class="api-req-col">
                <h5>Request Contract</h5>
                <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.5rem;">
                  <strong>Signed Route:</strong> Enforces signed middleware.<br/>
                  Transitions status from <code>'pending'</code> to <code>'picked_up'</code>.
                </p>
              </div>
              <div class="api-res-col">
                <h5>Live JSON Response</h5>
                <pre class="json-output" id="res-endpoint-verify">// Click 'Execute Request' to query endpoint</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- Spec Tab 2: PostgreSQL Schema -->
        <div class="spec-tab-pane" id="pane-db-schema">
          <div class="sql-code-box">
            <span class="sql-keyword">-- MANDATORY POSTGRESQL DATABASE CHECK CONSTRAINT (SPEC SECTION 3)</span><br/>
            <span class="sql-keyword">ALTER TABLE</span> <span class="sql-table">logistics_tracking</span> 
            <span class="sql-keyword">DROP CONSTRAINT IF EXISTS</span> <span class="sql-constraint">logistics_tracking_status_check</span>;<br/>
            <span class="sql-keyword">ALTER TABLE</span> <span class="sql-table">logistics_tracking</span> 
            <span class="sql-keyword">ADD CONSTRAINT</span> <span class="sql-constraint">logistics_tracking_status_check</span> 
            <span class="sql-keyword">CHECK</span> (status <span class="sql-keyword">IN</span> (
              <span class="sql-type">'pending'</span>, <span class="sql-type">'allocated'</span>, <span class="sql-type">'picked_up'</span>, 
              <span class="sql-type">'transiting'</span>, <span class="sql-type">'in_transit'</span>, <span class="sql-type">'delivered'</span>, <span class="sql-type">'cancelled'</span>
            ));
          </div>

          <div class="table-schema-grid">
            <div class="schema-table-card">
              <h4>Table: users</h4>
              <table class="data-table">
                <thead><tr><th>Column</th><th>Type / Constraint</th></tr></thead>
                <tbody>
                  <tr><td><code>id</code></td><td><code>BIGINT PRIMARY KEY</code></td></tr>
                  <tr><td><code>email</code></td><td><code>VARCHAR(255) UNIQUE</code></td></tr>
                  <tr><td><code>role</code></td><td><code>VARCHAR(50) CHECK ('donor','ngo','volunteer','admin')</code></td></tr>
                </tbody>
              </table>
            </div>

            <div class="schema-table-card">
              <h4>Table: donations</h4>
              <table class="data-table">
                <thead><tr><th>Column</th><th>Type / Constraint</th></tr></thead>
                <tbody>
                  <tr><td><code>id</code></td><td><code>BIGINT PRIMARY KEY</code></td></tr>
                  <tr><td><code>donor_id</code></td><td><code>BIGINT FK(users.id) ON DELETE CASCADE</code></td></tr>
                  <tr><td><code>status</code></td><td><code>VARCHAR(50) ('pending','allocated','completed','expired')</code></td></tr>
                </tbody>
              </table>
            </div>

            <div class="schema-table-card">
              <h4>Table: logistics_tracking</h4>
              <table class="data-table">
                <thead><tr><th>Column</th><th>Type / Constraint</th></tr></thead>
                <tbody>
                  <tr><td><code>id</code></td><td><code>BIGINT PRIMARY KEY</code></td></tr>
                  <tr><td><code>donation_id</code></td><td><code>BIGINT FK(donations) ON DELETE CASCADE</code></td></tr>
                  <tr><td><code>volunteer_id</code></td><td><code>BIGINT FK(users) ON DELETE CASCADE</code></td></tr>
                  <tr><td><code>status</code></td><td><code>VARCHAR(50) CHECK (logistics_tracking_status_check)</code></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Spec Tab 3: Controller Logic -->
        <div class="spec-tab-pane" id="pane-controller-code">
          <div class="sql-code-box" style="line-height: 1.8;">
<span class="sql-keyword">&lt;?php</span>
<span class="sql-keyword">namespace</span> App\Http\Controllers;

<span class="sql-keyword">use</span> Illuminate\Http\Request;
<span class="sql-keyword">use</span> Illuminate\Support\Facades\DB;

<span class="sql-keyword">class</span> <span class="sql-table">LogisticsAllocationController</span> <span class="sql-keyword">extends</span> Controller
{
    <span class="sql-keyword">public function</span> verifyPickup(Request $request, $id)
    {
        <span class="sql-keyword">// 'signed' middleware verifies URL authenticity and expiration</span>
        $updated = DB::table(<span class="sql-type">'logistics_tracking'</span>)
            ->where(<span class="sql-type">'id'</span>, $id)
            ->where(<span class="sql-type">'status'</span>, <span class="sql-type">'pending'</span>)
            ->update([
                <span class="sql-type">'status'</span> => <span class="sql-type">'picked_up'</span>,
                <span class="sql-type">'updated_at'</span> => now()
            ]);

        <span class="sql-keyword">if</span> (!$updated) {
            <span class="sql-keyword">return</span> response()->json([
                <span class="sql-type">'status'</span> => <span class="sql-type">'error'</span>,
                <span class="sql-type">'message'</span> => <span class="sql-type">'Invalid transition. Record may already be picked up or doesn\'t exist.'</span>
            ], 400);
        }

        <span class="sql-keyword">return</span> response()->json([
            <span class="sql-type">'status'</span> => <span class="sql-type">'success'</span>,
            <span class="sql-type">'message'</span> => <span class="sql-type">'Food rescue pickup verified successfully!'</span>,
            <span class="sql-type">'tracking_id'</span> => $id,
            <span class="sql-type">'new_status'</span> => <span class="sql-type">'picked_up'</span>
        ]);
    }
}
          </div>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------
     TAB 5: Telemetry & Eco-Badges
     ---------------------------------------------------- */
  renderTelemetryTabHtml() {
    const user = db.getCurrentUser();
    const metrics = TelemetryEngine.getMetrics();
    const badges = TelemetryEngine.getBadges(user);

    return `
      <div class="section-header">
        <div class="section-title-group">
          <h3>Gamification & Environmental Telemetry</h3>
          <p>Real-time community proof metrics, carbon diversion telemetry, and tamper-proof eco-badges.</p>
        </div>
      </div>

      <div class="telemetry-grid">
        ${badges.map(b => `
          <div class="badge-card">
            <div class="badge-top">
              <div class="badge-icon-box">${b.icon}</div>
              <span class="badge-level">${b.level}</span>
            </div>
            <h4>${b.title}</h4>
            <p>${b.description}</p>
            <div class="progress-track">
              <div class="progress-fill" style="width: ${b.progress}%;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted);">
              <span>Verification Status:</span>
              <strong style="color: #34D399;">Active • ${b.progress}% Completed</strong>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Live Environmental Equivalency Cards -->
      <div class="dashboard-grid">
        <div class="card">
          <div class="card-header">
            <h4>Methane & CO2 Diverted</h4>
            <span class="badge badge-success">IPCC Model</span>
          </div>
          <div class="card-body">
            <h2 style="font-size: 2.2rem; color: #34D399; margin-bottom: 0.25rem;">${metrics.kgCo2Saved.toLocaleString()} kg</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Equivalent to taking <strong>${Math.round(metrics.kgCo2Saved / 180)} passenger cars</strong> off the road for a full month.
            </p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4>Freshwater Conserved</h4>
            <span class="badge badge-info">Virtual Water Index</span>
          </div>
          <div class="card-body">
            <h2 style="font-size: 2.2rem; color: #60A5FA; margin-bottom: 0.25rem;">${(metrics.litersWaterSaved / 1000).toLocaleString()} kL</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Equivalent to providing drinking water for <strong>${Math.round(metrics.litersWaterSaved / 3000).toLocaleString()} families</strong>.
            </p>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h4>Landfill Diverted</h4>
            <span class="badge badge-amber">Urban Solid Waste</span>
          </div>
          <div class="card-body">
            <h2 style="font-size: 2.2rem; color: #FBBF24; margin-bottom: 0.25rem;">${metrics.landfillDivertedTonnes} Tonnes</h2>
            <p style="font-size: 0.85rem; color: var(--text-muted);">
              Diverted from Perungudi and Kodungaiyur municipal landfills.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  /* ----------------------------------------------------
     EVENT LISTENERS & BINDINGS (Attached ONCE)
     ---------------------------------------------------- */
  setupEvents() {
    // Role Selector Dropdown
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'user-role-selector') {
        const userId = Number(e.target.value);
        db.setCurrentUser(userId);
        const newUser = db.getCurrentUser();
        TelemetryEngine.sendMultiChannelAlert({
          title: `Role Switched: ${newUser.role.toUpperCase()}`,
          message: `Active session now authenticated as ${newUser.name}. Permissions adapted.`,
          channel: 'in-app'
        });
      }
    });

    // Navigation Tabs
    document.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.nav-tab-btn');
      if (tabBtn) {
        const tab = tabBtn.getAttribute('data-tab');
        this.switchTab(tab);
      }
    });

    // Hero quick buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('#hero-post-donation-btn')) {
        this.openNewDonationModal();
      } else if (e.target.closest('#hero-browse-feed-btn')) {
        this.switchTab('geospatial');
      } else if (e.target.closest('#hero-qr-btn')) {
        this.switchTab('crypto-qr');
      } else if (e.target.closest('#hero-admin-btn')) {
        this.switchTab('workflow');
      } else if (e.target.closest('#hero-tamper-lab-btn')) {
        this.switchTab('crypto-qr');
      }
    });

    // Radial slider & filters on map
    document.addEventListener('input', (e) => {
      if (e.target && e.target.id === 'radial-range-input') {
        const km = Number(e.target.value);
        const display = document.getElementById('radial-value-display');
        if (display) display.textContent = `${km} km radius`;
        if (this.rescueMap) this.rescueMap.setRadius(km);
      }
    });

    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'map-diet-filter') {
        this.currentDietFilter = e.target.value;
        if (this.rescueMap) this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
        this.renderFeedCards();
      } else if (e.target && e.target.id === 'map-expiry-filter') {
        this.currentExpiryFilter = e.target.value;
        if (this.rescueMap) this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
        this.renderFeedCards();
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-recenter-map')) {
        if (this.rescueMap) this.rescueMap.fitToActive();
        // Update active preset chip
        document.querySelectorAll('.btn-preset-chip').forEach(c => c.classList.remove('active'));
        const meChip = document.querySelector('.btn-preset-chip[data-preset="me"]');
        if (meChip) meChip.classList.add('active');
      }
    });

    // Fit All Operations in View
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-fit-all-map') || e.target.closest('#dpad-fit-all')) {
        if (this.rescueMap) this.rescueMap.fitAll();
      }
    });

    // D-Pad Zoom In / Out
    document.addEventListener('click', (e) => {
      if (e.target.closest('#dpad-zoom-in')) {
        if (this.rescueMap) this.rescueMap.zoomIn();
      } else if (e.target.closest('#dpad-zoom-out')) {
        if (this.rescueMap) this.rescueMap.zoomOut();
      }
    });

    // Location Presets Movement
    document.addEventListener('click', (e) => {
      const chip = e.target.closest('.btn-preset-chip');
      if (chip) {
        document.querySelectorAll('.btn-preset-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const preset = chip.getAttribute('data-preset');
        if (preset === 'me') {
          if (this.rescueMap) this.rescueMap.fitToActive();
        } else {
          if (this.rescueMap) this.rescueMap.moveToPreset(preset);
        }
      }
    });

    // Directional Movement Buttons (D-Pad & Header Nudge Buttons)
    const handleMoveDirection = (dir) => {
      if (!this.rescueMap) return;
      if (dir === 'center') {
        this.rescueMap.fitToActive();
        document.querySelectorAll('.btn-preset-chip').forEach(c => c.classList.remove('active'));
        const meChip = document.querySelector('.btn-preset-chip[data-preset="me"]');
        if (meChip) meChip.classList.add('active');
      } else {
        this.rescueMap.pan(dir, 180);
      }
    };

    document.addEventListener('click', (e) => {
      const dpadBtn = e.target.closest('.dpad-btn');
      if (dpadBtn) {
        const dir = dpadBtn.getAttribute('data-dir');
        handleMoveDirection(dir);
        return;
      }

      const nudgeBtn = e.target.closest('.btn-map-move');
      if (nudgeBtn) {
        const dir = nudgeBtn.getAttribute('data-dir');
        handleMoveDirection(dir);
      }
    });

    // Smooth press-and-hold panning for D-Pad
    let holdPanInterval = null;
    const startHoldPan = (btn) => {
      const dir = btn.getAttribute('data-dir');
      if (!dir || dir === 'center') return;
      clearInterval(holdPanInterval);
      holdPanInterval = setInterval(() => {
        if (this.rescueMap) this.rescueMap.pan(dir, 100);
      }, 100);
    };

    const stopHoldPan = () => {
      if (holdPanInterval) {
        clearInterval(holdPanInterval);
        holdPanInterval = null;
      }
    };

    document.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('.dpad-btn') || e.target.closest('.btn-map-move');
      if (btn) startHoldPan(btn);
    });

    document.addEventListener('mouseup', stopHoldPan);
    document.addEventListener('mouseleave', stopHoldPan);

    // Keyboard Arrow Keys Map Navigation
    window.addEventListener('keydown', (e) => {
      // Don't intercept if user is typing in form inputs or modals
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

      if (this.activeTab !== 'geospatial') return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.rescueMap) this.rescueMap.pan('up', 160);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.rescueMap) this.rescueMap.pan('down', 160);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (this.rescueMap) this.rescueMap.pan('left', 160);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (this.rescueMap) this.rescueMap.pan('right', 160);
      } else if (e.key === '+' || e.key === '=') {
        if (this.rescueMap) this.rescueMap.zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        if (this.rescueMap) this.rescueMap.zoomOut();
      }
    });


    // Open New Donation Modal from Donor portal
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-open-new-donation')) {
        this.openNewDonationModal();
      }
    });

    // Cancel unallocated donation (Donor action)
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-cancel-donation');
      if (btn) {
        const donationId = btn.getAttribute('data-id');
        const res = await ApiService.cancelDonation(donationId);
        if (res.status === 200) {
          TelemetryEngine.sendMultiChannelAlert({
            title: 'Donation Cancelled',
            message: res.message,
            channel: 'in-app'
          });
        }
      }
    });

    // Confirm delivery receipt (NGO action)
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-confirm-receipt');
      if (btn) {
        const trackingId = btn.getAttribute('data-tracking');
        const res = await ApiService.confirmDelivery(trackingId);
        if (res.status === 200) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          TelemetryEngine.sendMultiChannelAlert({
            title: 'Delivery Confirmed! 🍲',
            message: res.message,
            channel: 'whatsapp',
            recipientName: 'Annapoorna Foundation Hub',
            phone: '+91 98403 45678'
          });
        }
      }
    });

    // Progress transit (Volunteer action: picked_up -> in_transit)
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-start-transit');
      if (btn) {
        const trackingId = btn.getAttribute('data-tracking');
        const res = await ApiService.startTransit(trackingId);
        if (res.status === 200) {
          TelemetryEngine.sendMultiChannelAlert({
            title: 'Transit En-Route',
            message: res.message,
            channel: 'sms',
            recipientName: 'Recipient NGO Liaison',
            phone: '+91 98403 45678'
          });
        }
      }
    });

    // Present QR Code from Volunteer Portal
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-open-qr-token');
      if (btn) {
        const trackingId = btn.getAttribute('data-tracking');
        this.switchTab('crypto-qr');
        setTimeout(() => {
          const picker = document.getElementById('qr-mission-picker');
          if (picker) {
            picker.value = trackingId;
            const target = document.getElementById('live-qr-render-target');
            if (target) qrManager.renderQrCode(target, trackingId);
          }
        }, 150);
      }
    });

    // Scan Volunteer QR Code button from Donor listing
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-simulate-scan-pickup');
      if (btn) {
        const trackingId = btn.getAttribute('data-tracking');
        this.simulateOpticalScanForMission(trackingId);
      }
    });

    // QR Mission picker change
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'qr-mission-picker') {
        const trackingId = e.target.value;
        const target = document.getElementById('live-qr-render-target');
        if (target) qrManager.renderQrCode(target, trackingId);
      }
    });

    // Manual QR Generate button
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-manual-gen-qr')) {
        const picker = document.getElementById('qr-mission-picker');
        const trackingId = picker ? picker.value : 201;
        const target = document.getElementById('live-qr-render-target');
        if (target) qrManager.renderQrCode(target, trackingId);
      }
    });

    // Simulate Optical Scan from QR tab
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-simulate-camera-scan')) {
        const picker = document.getElementById('qr-mission-picker');
        const trackingId = picker ? picker.value : 201;
        this.simulateOpticalScanForMission(trackingId);
      }
    });

    // Tamper Suite Buttons
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-test');
      if (btn) {
        const testType = btn.getAttribute('data-test');
        const picker = document.getElementById('qr-mission-picker');
        const trackingId = picker ? picker.value : 201;
        const output = document.getElementById('tamper-test-output');
        qrManager.runTamperTest(testType, trackingId, output);
      }
    });

    // API Console Executions
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-run-endpoint');
      if (btn) {
        const ep = btn.getAttribute('data-endpoint');
        if (ep === 'GET_AVAILABLE') {
          const res = await ApiService.getAvailableDonations();
          const out = document.getElementById('res-endpoint-available');
          if (out) out.textContent = JSON.stringify(res, null, 2);
        } else if (ep === 'POST_ALLOCATE') {
          const unallocated = db.donations.find(d => d.status === 'pending');
          const donationId = unallocated ? unallocated.id : 101;
          const res = await ApiService.allocateLogistics({
            donation_id: donationId,
            volunteer_id: 5,
            ngo_id: 3,
            status: 'pending'
          });
          const out = document.getElementById('res-endpoint-allocate');
          if (out) out.textContent = JSON.stringify(res, null, 2);
        } else if (ep === 'GET_QR') {
          const res = await ApiService.generateQrCode(201, null, false);
          const out = document.getElementById('res-endpoint-qr');
          if (out) out.textContent = JSON.stringify(res, null, 2);
        } else if (ep === 'GET_VERIFY') {
          const qrData = await db.generateSignedQrUrl(201, 30);
          const res = await ApiService.verifyPickup(qrData.signedUrl);
          const out = document.getElementById('res-endpoint-verify');
          if (out) out.textContent = JSON.stringify(res, null, 2);
        }
      }
    });

    // Spec Sub-Tabs
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.spec-tab-btn');
      if (btn) {
        document.querySelectorAll('.spec-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.spec-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const tabKey = btn.getAttribute('data-spec-tab');
        const pane = document.getElementById(tabKey === 'api-console' ? 'pane-api-console' : tabKey === 'db-schema' ? 'pane-db-schema' : 'pane-controller-code');
        if (pane) pane.classList.add('active');
      }
    });

    // Admin DB Reset
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-admin-reset-db')) {
        db.resetToDefaults();
        TelemetryEngine.sendMultiChannelAlert({
          title: 'Database Reset',
          message: 'PostgreSQL state restored to pristine seed data.',
          channel: 'in-app'
        });
      }
    });

    // Admin Escalation simulation
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-trigger-escalation')) {
        TelemetryEngine.sendMultiChannelAlert({
          title: 'Urgent Pickup Imminent (<15 mins)',
          message: 'Mission #201: Volunteer Kavitha R. arriving at Spice Garden Grand Buffet. Ensure Cambro containers are sealed.',
          channel: 'whatsapp',
          recipientName: 'Spice Garden Chef',
          phone: '+91 98401 23456'
        });
        setTimeout(() => {
          TelemetryEngine.sendMultiChannelAlert({
            title: 'Fallback Courier Escalation',
            message: 'Tier-2 automated protocol armed: Backup courier Arun K. notified on standby.',
            channel: 'sms',
            recipientName: 'Backup Courier',
            phone: '+91 98406 78901'
          });
        }, 1200);
      }
    });

    // Admin Override Modal
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-open-override-modal')) {
        this.openOverrideModal(201);
      } else {
        const btn = e.target.closest('.btn-override-single');
        if (btn) {
          const id = Number(btn.getAttribute('data-id'));
          this.openOverrideModal(id);
        }
      }
    });
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-content-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });

    if (tabName === 'geospatial') {
      setTimeout(() => {
        if (!this.rescueMap || !this.rescueMap.map) {
          this.initMap();
        } else {
          this.rescueMap.invalidate();
          this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
        }
        this.renderFeedCards();
      }, 100);
    } else if (tabName === 'crypto-qr') {
      setTimeout(() => {
        const target = document.getElementById('live-qr-render-target');
        const picker = document.getElementById('qr-mission-picker');
        const trackingId = picker ? picker.value : 201;
        if (target) {
          qrManager.renderQrCode(target, trackingId);
        }
      }, 100);
    }
  }

  async simulateOpticalScanForMission(trackingId) {
    const res = await ApiService.generateQrCode(trackingId, null, true);
    if (res.status === 200) {
      await qrManager.simulateScan(res.data.signedUrl, (result) => {
        if (result.status === 200) {
          TelemetryEngine.sendMultiChannelAlert({
            title: 'Optical QR Handoff Verified! 🤝',
            message: `Mission #${trackingId} status transitioned to 'picked_up'.`,
            channel: 'sms',
            recipientName: 'Donor & Volunteer',
            phone: '+91 98401 23456'
          });
        }
      });
    }
  }

  /* ----------------------------------------------------
     MODALS: Post Surplus / Allocate / Admin Override
     ---------------------------------------------------- */
  openNewDonationModal() {
    const modalContainer = document.getElementById('modal-container');
    const user = db.getCurrentUser();

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Publish Surplus Food Donation</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <form id="form-new-donation">
            <div class="form-group">
              <label>Surplus Item Title *</label>
              <input type="text" name="title" class="form-input" required placeholder="e.g. Vegetable Biryani & Kurma Casseroles" value="Hyderabadi Pulao & Paneer Butter Masala (80 servings)" />
            </div>

            <div class="form-group">
              <label>Food Classification *</label>
              <select name="food_type" class="form-select">
                <option value="Cooked Hot Meals">Cooked Hot Meals</option>
                <option value="Bakery & Packed Snacks">Bakery & Packed Snacks</option>
                <option value="Fresh Produce & Fruits">Fresh Produce & Fruits</option>
                <option value="Dairy & Desserts">Dairy & Desserts</option>
              </select>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div class="form-group">
                <label>Portions / Servings *</label>
                <input type="number" name="quantity_servings" class="form-input" min="10" max="1000" value="80" required />
              </div>
              <div class="form-group">
                <label>Safe Window (Hours) *</label>
                <input type="number" name="expires_in_hours" class="form-input" min="1" max="12" value="4" required />
              </div>
            </div>

            <div class="form-group">
              <label>Holding Temperature (°C) *</label>
              <input type="number" step="0.1" name="temp_celsius" class="form-input" value="68.5" required />
              <small style="color: var(--text-muted); font-size: 0.72rem;">Hot foods must be held ≥ 60°C or cold foods ≤ 5°C per food safety law.</small>
            </div>

            <div class="safety-checklist-box">
              <div style="font-weight: 700; font-size: 0.85rem; color: #34D399; margin-bottom: 0.5rem;">
                🛡️ Mandatory FSSAI Food Safety Attestation:
              </div>
              <label class="safety-check-item">
                <input type="checkbox" required checked /> Food was prepared in a certified commercial hygiene kitchen
              </label>
              <label class="safety-check-item">
                <input type="checkbox" required checked /> Sealed in food-grade, leak-proof, insulated Cambro containers
              </label>
              <label class="safety-check-item">
                <input type="checkbox" required checked /> Temperature inspected immediately before dispatch logging
              </label>
            </div>

            <div class="form-group">
              <label>Pickup Location</label>
              <input type="text" name="pickup_address" class="form-input" value="${user.address || 'Chennai Central Hub'}" />
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-amber">Publish Surplus to Network</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    modalContainer.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', close));

    const form = modalContainer.querySelector('#form-new-donation');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());
      data.dietary_tags = ['Pure Vegetarian', 'Halal Compliant'];

      const res = await ApiService.createDonation(data);
      if (res.status === 201) {
        close();

        // Switch to Geospatial Map tab so the user instantly sees the newly added surplus
        this.switchTab('geospatial');

        // Focus the map on the newly added donation location
        setTimeout(() => {
          if (this.rescueMap) {
            this.rescueMap.invalidate();
            this.rescueMap.update(this.currentDietFilter, this.currentExpiryFilter);
            this.rescueMap.focusDonation(res.data.id);
          }
        }, 200);

        // Celebrate with confetti
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

        TelemetryEngine.sendMultiChannelAlert({
          title: 'Surplus Food Published! 🍲',
          message: `Created listing #${res.data.id} ("${res.data.title}", ${res.data.quantity_servings} servings). Live on radial map.`,
          channel: 'in-app'
        });
      }
    });
  }

  openAllocateModal(donationId) {
    const donation = db.donations.find(d => d.id === Number(donationId));
    if (!donation) return;

    const modalContainer = document.getElementById('modal-container');
    const user = db.getCurrentUser();
    const verifiedVolunteers = db.users.filter(u => u.role === 'volunteer');

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Claim & Allocate Rescue Mission</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <form id="form-allocate-mission">
            <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid var(--border-glass); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem;">
              <h4 style="color: #FBBF24;">${donation.title}</h4>
              <p style="font-size: 0.85rem; color: var(--text-muted);">${donation.quantity_servings} Servings • Temp: ${donation.temp_celsius}°C</p>
              <p style="font-size: 0.82rem; color: #CBD5E1; margin-top: 0.35rem;">📍 ${donation.pickup_address}</p>
            </div>

            <div class="form-group">
              <label>Select Verified Courier Agent *</label>
              <select name="volunteer_id" class="form-select" required>
                ${verifiedVolunteers.map(v => `
                  <option value="${v.id}">${v.name} (${v.vehicle || 'Courier'}) — ★ ${v.trust_score}%</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Designated Recipient NGO Hub</label>
              <input type="text" class="form-input" disabled value="${user.role === 'ngo' ? user.name : 'Annapoorna Community Kitchen'}" />
            </div>

            <div class="safety-checklist-box">
              <div style="font-size: 0.82rem; color: #6EE7B7;">
                🛡️ <strong>Donor-to-NGO Bridge Protocol:</strong>
                Claiming this inventory immediately locks out concurrent NGO attempts (<code class="sql-code-inline">whereNotIn</code> guard) and generates an assigned mission for the courier.
              </div>
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">⚡ Confirm & Trigger Mission Allocation</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    modalContainer.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', close));

    const form = modalContainer.querySelector('#form-allocate-mission');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const volunteerId = Number(formData.get('volunteer_id'));

      const res = await ApiService.allocateLogistics({
        donation_id: donation.id,
        volunteer_id: volunteerId,
        ngo_id: user.role === 'ngo' ? user.id : 3,
        status: 'pending'
      });

      if (res.status === 201) {
        close();
        confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
        TelemetryEngine.sendMultiChannelAlert({
          title: 'Mission Allocated! 🚀',
          message: `Mission #${res.data.id} queued for Volunteer Courier pickup.`,
          channel: 'whatsapp',
          recipientName: 'Volunteer Courier',
          phone: '+91 98405 67890'
        });
      } else {
        alert(res.message);
      }
    });
  }

  openOverrideModal(trackingId) {
    const tracking = db.logistics.find(l => l.id === Number(trackingId)) || db.logistics[0];
    if (!tracking) return;

    const modalContainer = document.getElementById('modal-container');

    modalContainer.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-dialog">
          <div class="modal-header">
            <h3>Administrative Constraint Override</h3>
            <button class="modal-close-btn">&times;</button>
          </div>
          <form id="form-admin-override">
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
              Emergency authority to modify state machine on Mission <strong>#${tracking.id}</strong> (Current status: <code class="sql-code-inline">${tracking.status}</code>).
            </p>

            <div class="form-group">
              <label>Target Status (PostgreSQL CHECK Constraint Checked) *</label>
              <select name="target_status" class="form-select">
                ${VALID_LOGISTICS_STATUSES.map(s => `
                  <option value="${s}" ${s === tracking.status ? 'selected' : ''}>${s}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Administrative Override Reason *</label>
              <textarea name="reason" class="form-textarea" rows="3" required placeholder="e.g. Courier device battery failure confirmed via physical radio call; handover verified manually."></textarea>
            </div>

            <div style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-danger">Execute Override</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const close = () => { modalContainer.innerHTML = ''; };
    modalContainer.querySelectorAll('.modal-close-btn').forEach(btn => btn.addEventListener('click', close));

    const form = modalContainer.querySelector('#form-admin-override');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const targetStatus = formData.get('target_status');
      const reason = formData.get('reason');

      const res = await ApiService.adminOverride(tracking.id, targetStatus, reason);
      if (res.status === 200) {
        close();
        TelemetryEngine.sendMultiChannelAlert({
          title: 'System Override Executed',
          message: res.message,
          channel: 'in-app'
        });
      }
    });
  }
}

// Bootstrap application on load
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
