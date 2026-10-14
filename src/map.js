/**
 * Ellarukum Unavu - Leaflet.js / OSM Geospatial Engine
 * Implements interactive OpenStreetMap integration, dynamic radial queries,
 * custom pin markers, route overlays, and instant allocation popups.
 */

import L from 'leaflet';
import { db } from './db.js';

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export class RescueMap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.options = options;
    this.map = null;
    this.markersLayer = null;
    this.radiusCircle = null;
    this.routesLayer = null;
    this.currentRadiusKm = 10;
    this.markersMap = new Map();
    this.onSelectDonation = options.onSelectDonation || null;
  }

  init() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    // Clean up if already initialized or stale
    if (this.map) {
      this.destroy();
    }
    if (container._leaflet_id) {
      delete container._leaflet_id;
    }

    // Center around Chennai urban district
    const defaultCenter = [13.055, 80.235];
    this.map = L.map(this.containerId, {
      zoomControl: true,
      attributionControl: true
    }).setView(defaultCenter, 13);

    // OpenStreetMap Carto tiles (crisp modern styling)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors | Ellarukum Unavu Spatial Engine'
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);
    this.routesLayer = L.layerGroup().addTo(this.map);

    this.update();
  }

  destroy() {
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.warn('Map cleanup notice', e);
      }
      this.map = null;
      this.markersLayer = null;
      this.routesLayer = null;
      this.radiusCircle = null;
      this.markersMap.clear();
    }
  }

  invalidate() {
    if (this.map) {
      this.map.invalidateSize();
    }
  }

  setRadius(radiusKm) {
    this.currentRadiusKm = Number(radiusKm);
    this.update();
  }

  update(filterDiet = 'all', filterExpiry = 'all') {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.routesLayer.clearLayers();
    this.markersMap.clear();

    const currentUser = db.getCurrentUser();
    const centerPoint = [currentUser.lat || 13.0515, currentUser.lng || 80.2210];

    // Draw PostgreSQL radial query boundary circle (Emerald green)
    if (this.radiusCircle) {
      this.map.removeLayer(this.radiusCircle);
    }

    this.radiusCircle = L.circle(centerPoint, {
      radius: this.currentRadiusKm * 1000,
      color: '#10B981',
      fillColor: '#10B981',
      fillOpacity: 0.08,
      weight: 2,
      dashArray: '4, 8'
    }).addTo(this.map);

    // Add current user location pin
    const userIcon = L.divIcon({
      className: 'custom-map-pin user-pin',
      html: `
        <div class="pin-halo"></div>
        <div class="pin-badge ${currentUser.role}">
          <span>${currentUser.role === 'ngo' ? '🏛️' : currentUser.role === 'donor' ? '👨‍🍳' : currentUser.role === 'volunteer' ? '🛵' : '⭐'}</span>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    L.marker(centerPoint, { icon: userIcon })
      .addTo(this.markersLayer)
      .bindPopup(`
        <div class="map-popup-card">
          <div class="popup-header current-actor">
            <span class="role-badge ${currentUser.role}">You (${currentUser.role.toUpperCase()})</span>
            <h4>${currentUser.name}</h4>
          </div>
          <p class="popup-sub">${currentUser.address}</p>
          <div class="radial-query-info">
            <span class="query-tag">PostgreSQL ST_DWithin: ${this.currentRadiusKm} km query radius active</span>
          </div>
        </div>
      `);

    // Add All NGOs
    db.users.filter(u => u.role === 'ngo').forEach(ngo => {
      if (ngo.id === currentUser.id) return;
      const ngoIcon = L.divIcon({
        className: 'custom-map-pin ngo-pin',
        html: `<div class="pin-badge ngo"><span>🏛️</span></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      L.marker([ngo.lat, ngo.lng], { icon: ngoIcon })
        .addTo(this.markersLayer)
        .bindPopup(`
          <div class="map-popup-card">
            <div class="popup-header">
              <span class="role-badge ngo">Verified NGO Partner</span>
              <h4>${ngo.name}</h4>
            </div>
            <p class="popup-sub">${ngo.address}</p>
            <div class="popup-stats">
              <span>Capacity: ${ngo.capacity_servings || 300} meals</span>
              <span class="trust-badge">★ Trust: ${ngo.trust_score}%</span>
            </div>
          </div>
        `);
    });

    // Add Donations within radial query
    const allocatedDonationIds = new Set(db.logistics.map(l => l.donation_id));

    db.donations.forEach(donation => {
      const donor = db.users.find(u => u.id === donation.donor_id) || {};
      const distance = calculateDistanceKm(centerPoint[0], centerPoint[1], donation.lat, donation.lng);

      // Check radial boundary
      const isWithinRadius = distance <= this.currentRadiusKm;

      // Dietary filter check
      if (filterDiet !== 'all') {
        const matchesDiet = donation.dietary_tags.some(tag => tag.toLowerCase().includes(filterDiet.toLowerCase()));
        if (!matchesDiet) return;
      }

      // Expiry filter check
      const remainingMs = new Date(donation.expires_at) - new Date();
      const remainingHours = remainingMs / (1000 * 3600);
      if (filterExpiry === 'imminent' && remainingHours > 2) return;
      if (filterExpiry === 'medium' && (remainingHours <= 2 || remainingHours > 5)) return;

      const isAllocated = allocatedDonationIds.has(donation.id);
      const isPending = donation.status === 'pending' && !isAllocated;

      const pinColorClass = isPending ? 'pending' : isAllocated ? 'allocated' : 'completed';
      const pinIcon = L.divIcon({
        className: `custom-map-pin donation-pin ${pinColorClass} ${isWithinRadius ? 'in-radius' : 'out-radius'}`,
        html: `
          <div class="pin-badge ${pinColorClass}">
            <span>🍱</span>
            <span class="pin-quantity">${donation.quantity_servings}</span>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      const expiryText = remainingHours > 0 
        ? `${Math.floor(remainingHours)}h ${Math.floor((remainingHours % 1) * 60)}m left`
        : 'Expired';

      const marker = L.marker([donation.lat, donation.lng], { icon: pinIcon }).addTo(this.markersLayer);
      this.markersMap.set(donation.id, marker);

      const claimButtonHtml = (currentUser.role === 'ngo' && isPending)
        ? `<button class="btn btn-primary btn-sm btn-claim-map" data-id="${donation.id}">
             ⚡ Claim & Allocate Mission (${donation.quantity_servings} Servings)
           </button>`
        : `<div class="status-indicator-pill ${donation.status}">Status: ${donation.status.toUpperCase()}</div>`;

      marker.bindPopup(`
        <div class="map-popup-card">
          <div class="popup-header">
            <span class="status-pill ${donation.status}">${isPending ? 'Available for Rescue' : donation.status}</span>
            <span class="distance-pill">📍 ${distance} km away</span>
            <h4>${donation.title}</h4>
          </div>
          <div class="popup-body">
            <p class="donor-name"><strong>Donor:</strong> ${donor.name || 'Certified Donor'}</p>
            <p class="popup-sub">${donation.pickup_address}</p>
            <div class="food-meta-row">
              <span class="badge badge-amber">🍱 ${donation.quantity_servings} Servings</span>
              <span class="badge badge-info">🌡️ ${donation.temp_celsius}°C</span>
              <span class="badge badge-warning">⏳ ${expiryText}</span>
            </div>
            <div class="diet-tags">
              ${donation.dietary_tags.map(t => `<span class="tag">${t}</span>`).join('')}
            </div>
          </div>
          <div class="popup-footer">
            ${claimButtonHtml}
          </div>
        </div>
      `);
    });

    // Draw active logistics routes
    db.logistics.filter(l => l.status === 'pending' || l.status === 'picked_up' || l.status === 'in_transit').forEach(mission => {
      const donation = db.donations.find(d => d.id === mission.donation_id);
      const ngo = db.users.find(u => u.id === mission.ngo_id);
      const volunteer = db.users.find(u => u.id === mission.volunteer_id);

      if (donation && ngo) {
        const routePoints = [
          [donation.lat, donation.lng],
          volunteer ? [volunteer.lat, volunteer.lng] : null,
          [ngo.lat, ngo.lng]
        ].filter(Boolean);

        const routeColor = mission.status === 'in_transit' ? '#3B82F6' : '#10B981';
        L.polyline(routePoints, {
          color: routeColor,
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.85
        }).addTo(this.routesLayer).bindTooltip(`Mission #${mission.id}: ${mission.status.replace('_', ' ').toUpperCase()}`, { sticky: true });
      }
    });

    // Attach event listeners for claim buttons in popups
    setTimeout(() => {
      const claimBtns = document.querySelectorAll('.btn-claim-map');
      claimBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          const donationId = Number(e.currentTarget.getAttribute('data-id'));
          if (this.onSelectDonation) {
            this.onSelectDonation(donationId);
          }
        });
      });
    }, 150);
  }

  focusDonation(donationId) {
    if (!this.map) return;
    const donation = db.donations.find(d => d.id === Number(donationId));
    if (donation) {
      this.map.flyTo([donation.lat, donation.lng], 15, { duration: 1.0 });
      const marker = this.markersMap.get(Number(donationId));
      if (marker) {
        setTimeout(() => {
          try {
            marker.openPopup();
          } catch (e) {
            console.warn('Popup open notice', e);
          }
        }, 500);
      }
    }
  }

  fitToActive() {
    if (!this.map) return;
    const currentUser = db.getCurrentUser();
    this.map.setView([currentUser.lat || 13.055, currentUser.lng || 80.235], 13);
  }

  pan(direction, step = 180) {
    if (!this.map) return;
    switch (direction) {
      case 'up':
      case 'north':
        this.map.panBy([0, -step], { animate: true, duration: 0.25 });
        break;
      case 'down':
      case 'south':
        this.map.panBy([0, step], { animate: true, duration: 0.25 });
        break;
      case 'left':
      case 'west':
        this.map.panBy([-step, 0], { animate: true, duration: 0.25 });
        break;
      case 'right':
      case 'east':
        this.map.panBy([step, 0], { animate: true, duration: 0.25 });
        break;
      default:
        break;
    }
  }

  fitAll() {
    if (!this.map) return;
    const points = [];
    const currentUser = db.getCurrentUser();
    if (currentUser.lat && currentUser.lng) points.push([currentUser.lat, currentUser.lng]);
    db.users.forEach(u => {
      if (u.lat && u.lng) points.push([u.lat, u.lng]);
    });
    db.donations.forEach(d => {
      if (d.lat && d.lng) points.push([d.lat, d.lng]);
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14, animate: true });
    }
  }

  moveToPreset(locationKey) {
    if (!this.map) return;
    const presets = {
      'central': { name: 'Chennai Central Hub', coords: [13.0827, 80.2707], zoom: 14 },
      'tnagar': { name: 'T. Nagar Commercial Kitchens', coords: [13.0418, 80.2341], zoom: 15 },
      'annanagar': { name: 'Anna Nagar Residential Hub', coords: [13.0850, 80.2101], zoom: 14 },
      'adyar': { name: 'Adyar & South Coast', coords: [13.0012, 80.2565], zoom: 14 },
      'velachery': { name: 'Velachery Distribution Zone', coords: [12.9815, 80.2180], zoom: 14 },
      'tambaram': { name: 'Tambaram Suburban Node', coords: [12.9249, 80.1000], zoom: 13 }
    };
    const target = presets[locationKey];
    if (target) {
      this.map.flyTo(target.coords, target.zoom, { duration: 1.2 });
    }
  }

  zoomIn() {
    if (this.map) this.map.zoomIn();
  }

  zoomOut() {
    if (this.map) this.map.zoomOut();
  }
}

