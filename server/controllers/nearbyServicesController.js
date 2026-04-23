const AppError = require('../utils/AppError');

const OVERPASS_APIS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_API = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_PRIMARY = 5000;
const SEARCH_RADIUS_FALLBACK = 15000;
const EARTH_RADIUS_KM = 6371;
const API_TIMEOUT_MS = 12000;

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInKm(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildBoundingBox(lat, lon, radiusMeters) {
  const latDelta = radiusMeters / 111320;
  const lonDelta = radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180));

  const left = lon - lonDelta;
  const right = lon + lonDelta;
  const top = lat + latDelta;
  const bottom = lat - latDelta;

  return `${left},${top},${right},${bottom}`;
}

function extractCoordinates(element) {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return { lat: element.lat, lon: element.lon };
  }

  if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }

  return null;
}

function normalizePlace(element, index, fallbackName, userLat, userLon) {
  const coords = extractCoordinates(element);
  if (!coords) return null;

  const name = element.tags?.name || `${fallbackName} ${index + 1}`;

  // Try multiple address sources from OSM
  const osmAddress = [
    element.tags?.['addr:housenumber'] && element.tags?.['addr:street']
      ? `${element.tags['addr:housenumber']} ${element.tags['addr:street']}`
      : element.tags?.['addr:street'],
    element.tags?.['addr:city'] || element.tags?.['addr:town'] || element.tags?.['addr:village'],
    element.tags?.['addr:state'],
  ]
    .filter((v) => v && String(v).trim())
    .join(', ');

  const distance = distanceInKm(userLat, userLon, coords.lat, coords.lon);

  return {
    id: `${element.type}-${element.id}`,
    name,
    address: osmAddress && osmAddress.trim() ? osmAddress : null,
    lat: coords.lat,
    lon: coords.lon,
    distance,
    needsReverseGeo: !osmAddress || !osmAddress.trim(),
  };
}

function buildOverpassQuery(lat, lon, category, radius) {
  const timeoutSec = Math.ceil(API_TIMEOUT_MS / 1000);

  if (category === 'hospitals') {
    return `
      [out:json][timeout:${timeoutSec}];
      (
        node(around:${radius},${lat},${lon})[amenity=hospital];
        way(around:${radius},${lat},${lon})[amenity=hospital];
        node(around:${radius},${lat},${lon})[amenity=clinic];
        way(around:${radius},${lat},${lon})[amenity=clinic];
      );
      out center tags;
    `;
  }

  return `
    [out:json][timeout:${timeoutSec}];
    (
      node(around:${radius},${lat},${lon})[amenity=shelter];
      way(around:${radius},${lat},${lon})[amenity=shelter];
      node(around:${radius},${lat},${lon})[social_facility=shelter];
      way(around:${radius},${lat},${lon})[social_facility=shelter];
    );
    out center tags;
  `;
}

async function fetchAddressViaReverseGeo(lat, lon) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(
      `${NOMINATIM_API}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Reverse geo API error');

    const data = await response.json();

    if (data.display_name) {
      return data.display_name.split(',').slice(0, 3).join(',').trim();
    }

    const address = data.address || {};
    const addressStr = [
      address.house_number && address.road ? `${address.house_number} ${address.road}` : address.road,
      address.neighbourhood || address.suburb || address.village || address.town || address.city,
      address.district || address.county,
    ]
      .filter((v) => v && v.trim())
      .join(', ')
      .trim();

    return addressStr || null;
  } catch (error) {
    console.error(`Address fetch error for [${lat}, ${lon}]:`, error.message);
    return null;
  }
}

async function enrichAddresses(places) {
  const toFetch = places.filter((p) => p.needsReverseGeo);

  if (toFetch.length > 0) {
    const results = await Promise.allSettled(
      toFetch.map((p) => fetchAddressViaReverseGeo(p.lat, p.lon))
    );

    for (let i = 0; i < toFetch.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled' && result.value) {
        toFetch[i].address = result.value;
      } else {
        toFetch[i].address = 'Exact location found via map';
      }
      delete toFetch[i].needsReverseGeo;
    }
  }

  return places.map((p) => ({
    ...p,
    address: p.address || 'Exact location found via map',
  }));
}

async function fetchOverpassData(query, category, radius) {
  let lastError = null;

  for (const endpoint of OVERPASS_APIS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
          Accept: 'application/json',
        },
        body: query,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data.elements)) {
        throw new Error('Invalid Overpass response format');
      }

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      console.error(
        `Overpass fetch failed for ${category} (radius ${radius}) via ${endpoint}:`,
        error.message
      );
    }
  }

  throw lastError || new Error('All Overpass endpoints failed');
}

async function fetchNominatimPlaces(lat, lon, category, radius) {
  const viewbox = buildBoundingBox(lat, lon, radius);
  const queryTerms = category === 'hospitals'
    ? ['hospital', 'clinic', 'medical center', 'health center']
    : ['shelter', 'homeless shelter', 'night shelter'];

  try {
    const responses = await Promise.allSettled(
      queryTerms.map(async (term) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        const url = `${NOMINATIM_SEARCH_API}?q=${encodeURIComponent(term)}&format=jsonv2&limit=10&viewbox=${encodeURIComponent(viewbox)}&bounded=1&addressdetails=1`;

        try {
          const response = await fetch(url, {
            headers: {
              Accept: 'application/json',
            },
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Nominatim search error: ${response.status}`);
          }

          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch (error) {
          clearTimeout(timeoutId);
          throw error;
        }
      })
    );

    const rawItems = responses
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);

    if (rawItems.length === 0) {
      return [];
    }

    const seen = new Set();
    const places = rawItems
      .map((item, index) => {
        const placeLat = Number(item.lat);
        const placeLon = Number(item.lon);

        if (Number.isNaN(placeLat) || Number.isNaN(placeLon)) {
          return null;
        }

        const key = `${item.place_id || ''}-${placeLat.toFixed(5)}-${placeLon.toFixed(5)}`;
        if (seen.has(key)) {
          return null;
        }
        seen.add(key);

        const distance = distanceInKm(lat, lon, placeLat, placeLon);
        const displayName = item.display_name || '';
        const name = (displayName.split(',')[0] || '').trim() || `${category === 'hospitals' ? 'Hospital' : 'Shelter'} ${index + 1}`;

        return {
          id: `nominatim-${category}-${item.place_id || index}`,
          name,
          address: displayName || 'Exact location found via map',
          lat: placeLat,
          lon: placeLon,
          distance,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);

    return places;
  } catch (error) {
    console.error(`Nominatim fallback failed for ${category}:`, error.message);
    return [];
  }
}

async function fetchCategoryPlaces(lat, lon, category) {
  const fallbackName = category === 'hospitals' ? 'Hospital' : 'Shelter';
  const radiusCandidates = [SEARCH_RADIUS_PRIMARY, SEARCH_RADIUS_FALLBACK];

  for (const radius of radiusCandidates) {
    try {
      const query = buildOverpassQuery(lat, lon, category, radius);
      const data = await fetchOverpassData(query, category, radius);

      let places = (data.elements || [])
        .map((item, index) => normalizePlace(item, index, fallbackName, lat, lon))
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8);

      places = await enrichAddresses(places);

      if (places.length > 0) {
        return { places, radiusUsed: radius, source: 'overpass' };
      }
    } catch (error) {
      console.error(`Radius ${radius} fetch failed for ${category}:`, error.message);
    }
  }

  // Final fallback: text search via Nominatim within expanded bounding box
  const nominatimPlaces = await fetchNominatimPlaces(lat, lon, category, SEARCH_RADIUS_FALLBACK);
  if (nominatimPlaces.length > 0) {
    return { places: nominatimPlaces, radiusUsed: SEARCH_RADIUS_FALLBACK, source: 'nominatim' };
  }

  // Return empty result if both fail
  const result = { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' };
  return result;
}

exports.getNearbyServices = async (req, res, next) => {
  try {
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return next(new AppError('Latitude and longitude are required', 400));
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude)) {
      return next(new AppError('Invalid latitude or longitude', 400));
    }

    // Fetch both hospitals and shelters in parallel
    const [hospitalsResult, sheltersResult] = await Promise.all([
      fetchCategoryPlaces(latitude, longitude, 'hospitals'),
      fetchCategoryPlaces(latitude, longitude, 'shelters'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        hospitals: hospitalsResult,
        shelters: sheltersResult,
      },
    });
  } catch (error) {
    console.error('Nearby services error:', error);
    next(new AppError('Failed to fetch nearby services', 500));
  }
};
