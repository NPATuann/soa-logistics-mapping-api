const USE_MOCK = false;
const BACKEND_BASE_URL = '/api';

function calculateDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const meters = R * c;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

document.addEventListener('DOMContentLoaded', () => {
  const badge = document.getElementById('modeBadge');
  if (badge) {
    badge.className = 'badge bg-success';
    badge.innerText = 'Mode: Connected to Node.js Backend';
  }
});

document.getElementById('formSearch')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('searchQuery').value.trim();
  const container = document.getElementById('searchResults');
  container.innerHTML = '<div class="col-12 text-center text-muted py-3"><div class="spinner-border spinner-border-sm text-primary"></div> Calling API via Backend...</div>';

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Server Error: ${res.status}`);
    const data = await res.json();
    renderPlaceCards(data.places || [], container);
  } catch (err) {
    container.innerHTML = `<div class="col-12 alert alert-danger">${err.message}</div>`;
  }
});

document.getElementById('formNearby')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const locationName = document.getElementById('nearbyLocationName').value.trim();
  const radius = document.getElementById('nearbyRadius').value.trim();
  const type = document.getElementById('nearbyType').value.trim();
  const container = document.getElementById('nearbyResults');

  container.innerHTML = `<div class="col-12 text-center text-muted py-3"><div class="spinner-border spinner-border-sm text-success"></div> Locating landmark "${locationName}" and scanning nearby...</div>`;

  try {
    const params = new URLSearchParams({
      locationName,
      radius: radius || 1000,
      ...(type && { type })
    });

    const res = await fetch(`${BACKEND_BASE_URL}/nearby?${params.toString()}`);
    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.error || `Server Error: ${res.status}`);
    }

    const data = await res.json();
    
    let infoHtml = '';
    if (data.originCenter) {
      infoHtml = `
        <div class="col-12">
          <div class="alert alert-info py-2 mb-3">
            📍 <strong>Central Landmark:</strong> ${data.originCenter.name} (${data.originCenter.address})
            <br><small class="text-muted">Coordinates: ${data.originCenter.latitude}, ${data.originCenter.longitude} - Radius: ${radius}m</small>
          </div>
        </div>
      `;
    }

    renderPlaceCards(data.places || [], container, data.originCenter);
    if (infoHtml) {
      container.insertAdjacentHTML('afterbegin', infoHtml);
    }

  } catch (err) {
    container.innerHTML = `<div class="col-12 alert alert-danger">${err.message}</div>`;
  }
});

document.getElementById('formDetails')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const placeId = document.getElementById('detailsPlaceId').value.trim();
  fetchPlaceDetails(placeId);
});

async function fetchPlaceDetails(placeId) {
  const container = document.getElementById('detailsResult');
  const detailsTabBtn = document.getElementById('details-tab');
  
  if (detailsTabBtn) {
    const tab = new bootstrap.Tab(detailsTabBtn);
    tab.show();
  }
  document.getElementById('detailsPlaceId').value = placeId;
  container.innerHTML = '<div class="text-center text-muted py-3"><div class="spinner-border spinner-border-sm text-info"></div> Fetching details via Backend...</div>';

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/details?place_id=${encodeURIComponent(placeId)}`);
    if (!res.ok) throw new Error(`Server Error: ${res.status}`);
    const details = await res.json();
    renderDetailsCard(details, container);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">${err.message}</div>`;
  }
}

function renderPlaceCards(placesList, containerElement, originCenter = null) {
  if (!placesList || placesList.length === 0) {
    containerElement.innerHTML = '<div class="col-12 text-center text-muted py-4">No places found from API.</div>';
    return;
  }

  containerElement.innerHTML = placesList.map(place => {
    const placeName = place.displayName?.text || place.name || "Unknown Name";
    const address = place.formattedAddress || "Address not provided";

    let distanceBadge = '';
    if (originCenter && place.location) {
      const dist = calculateDistance(
        originCenter.latitude,
        originCenter.longitude,
        place.location.latitude,
        place.location.longitude
      );
      if (dist) {
        distanceBadge = `<span class="badge bg-warning text-dark me-2">📏 Distance: ${dist}</span>`;
      }
    }

    const typesBadges = (place.types && place.types.length > 0)
      ? place.types.slice(0, 4).map(t => `<span class="badge badge-type">${t}</span>`).join(' ')
      : '<span class="text-muted small">Uncategorized</span>';

    const ratingDisplay = place.rating 
      ? `<span class="rating-badge">★ ${place.rating} (${place.userRatingCount || 0})</span>` 
      : '<span class="text-muted small">No ratings yet</span>';

    const categoryLabel = place.primaryTypeDisplayName?.text 
      ? `<small class="text-teal fw-semibold d-block mb-1">🏷️ ${place.primaryTypeDisplayName.text}</small>` 
      : '';

    return `
      <div class="col-12 col-md-6 mb-3">
        <div class="card h-100 place-card p-3">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
              ${categoryLabel}
              <h5 class="fw-bold mb-0 text-primary-sky">${placeName}</h5>
            </div>
            ${ratingDisplay}
          </div>

          <p class="text-muted small mb-2">📍 <strong>Address:</strong> ${address}</p>

          ${distanceBadge ? `<div class="mb-2">${distanceBadge}</div>` : ''}

          <div class="mb-3">
            <small class="text-secondary d-block mb-1"><strong>Categories:</strong></small>
            <div class="d-flex flex-wrap gap-1">
              ${typesBadges}
            </div>
          </div>

          <div class="small mb-3 text-secondary">
            Place ID: <code>${place.id}</code>
          </div>

          <div class="mt-auto d-flex gap-2">
            <button class="btn btn-outline-primary btn-sm flex-fill" onclick="fetchPlaceDetails('${place.id}')">
              ℹ️ View Details
            </button>
            ${place.googleMapsUri ? `
              <a href="${place.googleMapsUri}" target="_blank" class="btn btn-outline-secondary btn-sm">
                🗺️ Maps
              </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function renderDetailsCard(data, containerElement) {
  if (!data) {
    containerElement.innerHTML = '<div class="text-muted">No detail data available.</div>';
    return;
  }

  const placeName = data.displayName?.text || data.name || "Unknown Name";
  const address = data.formattedAddress || "Address not provided";
  const phone = data.nationalPhoneNumber || data.internationalPhoneNumber || "Not provided";
  
  const statusBadge = data.currentOpeningHours?.openNow !== undefined
    ? (data.currentOpeningHours.openNow ? '<span class="status-open">Open Now</span>' : '<span class="status-closed">Closed</span>')
    : (data.businessStatus === "OPERATIONAL" ? '<span class="status-open">Operational</span>' : '');

  const hoursList = data.currentOpeningHours?.weekdayDescriptions && data.currentOpeningHours.weekdayDescriptions.length > 0
    ? `<ul class="list-group list-group-flush small mb-3">
         ${data.currentOpeningHours.weekdayDescriptions.map(h => `<li class="list-group-item px-0 py-1">${h}</li>`).join('')}
       </ul>`
    : '<p class="text-muted small mb-3">No detailed opening hours available.</p>';

  containerElement.innerHTML = `
    <div class="card p-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h4 class="fw-bold mb-0 text-primary-sky">${placeName}</h4>
        ${statusBadge}
      </div>
      
      <div class="row g-3">
        <div class="col-md-6">
          <p class="mb-1"><strong>📍 Address:</strong> ${address}</p>
          <p class="mb-1"><strong>📞 Phone:</strong> ${phone}</p>
          <p class="mb-2"><strong>⭐ Rating:</strong> ${data.rating ? `${data.rating} / 5 (${data.userRatingCount || 0} reviews)` : 'None'}</p>
          ${data.websiteUri ? `<p class="mb-2"><strong>🌐 Website:</strong> <a href="${data.websiteUri}" target="_blank">${data.websiteUri}</a></p>` : ''}
          ${data.googleMapsUri ? `<a href="${data.googleMapsUri}" target="_blank" class="btn btn-primary btn-sm mt-2">View on Google Maps</a>` : ''}
        </div>
        <div class="col-md-6">
          <h6 class="fw-bold">🕒 Operating Hours:</h6>
          ${hoursList}
        </div>
      </div>
    </div>
  `;
}