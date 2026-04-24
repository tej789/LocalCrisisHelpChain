import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material';
import HomeWorkIcon from '@mui/icons-material/HomeWork';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_API = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_PRIMARY = 5000;
const SEARCH_RADIUS_FALLBACK = 15000;
const EARTH_RADIUS_KM = 6371;
const API_TIMEOUT_MS = 8000;
const CACHE_KEY_PREFIX = 'nearby_services_cache_v3_';
const CACHE_DURATION_MS = 30 * 60 * 1000;
const ADDRESS_CACHE_PREFIX = 'addr_cache_';
const LOCATION_CACHE_KEY = 'last_detected_location';
const MIN_LOCATION_DRIFT_METERS = 100;
const CACHE_PRECISION = 3;

function normalizeCoordinates(lat, lon) {
  return {
    lat: parseFloat(lat.toFixed(CACHE_PRECISION)),
    lon: parseFloat(lon.toFixed(CACHE_PRECISION)),
  };
}

function getLastLocationCache() {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

function setLastLocationCache(lat, lon) {
  try {
    const normalized = normalizeCoordinates(lat, lon);
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(normalized));
  } catch {
    // Silently fail
  }
}

// Cache helper functions
function getCachedResult(category) {
  try {
    const key = `${CACHE_KEY_PREFIX}${category}`;
    const cached = localStorage.getItem(key);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_DURATION_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function setCachedResult(category, data) {
  try {
    const key = `${CACHE_KEY_PREFIX}${category}`;
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Silently fail if localStorage is full
  }
}

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
        relation(around:${radius},${lat},${lon})[amenity=hospital];
        node(around:${radius},${lat},${lon})[amenity=clinic];
        way(around:${radius},${lat},${lon})[amenity=clinic];
        relation(around:${radius},${lat},${lon})[amenity=clinic];
        node(around:${radius},${lat},${lon})[healthcare=hospital];
        way(around:${radius},${lat},${lon})[healthcare=hospital];
        node(around:${radius},${lat},${lon})[healthcare=clinic];
        way(around:${radius},${lat},${lon})[healthcare=clinic];
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

    const reverseGeoUrl = `${NOMINATIM_API}?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

    const response = await fetch(reverseGeoUrl, {
      signal: controller.signal
    });

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

async function fetchNominatimPlacesDirect(lat, lon, category, radius) {
  const viewbox = buildBoundingBox(lat, lon, radius);
  const queryTerms = category === 'hospitals'
    ? ['hospital', 'clinic', 'medical center', 'health center']
    : ['shelter', 'homeless shelter', 'night shelter'];

  try {
    const responses = await Promise.allSettled(
      queryTerms.map(async (term) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
        const searchUrl = `${NOMINATIM_SEARCH_API}?q=${encodeURIComponent(term)}&format=jsonv2&limit=10&viewbox=${encodeURIComponent(viewbox)}&bounded=1&addressdetails=1`;
        try {
          const response = await fetch(searchUrl, {
            headers: { Accept: 'application/json' },
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
        const name =
          (displayName.split(',')[0] || '').trim() ||
          `${category === 'hospitals' ? 'Hospital' : 'Shelter'} ${index + 1}`;

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

// Fallback: Direct API call to Overpass
async function fetchCategoryPlacesDirect(lat, lon, category, signal) {
  const fallbackName = category === 'hospitals' ? 'Hospital' : 'Shelter';
  let lastError = null;

  // Try primary radius with timeout
  try {
    const query = buildOverpassQuery(lat, lon, category, SEARCH_RADIUS_PRIMARY);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'application/json',
      },
      body: query,
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let places = (data.elements || [])
      .map((item, index) => normalizePlace(item, index, fallbackName, lat, lon))
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 8);

    places = await enrichAddresses(places);

    const result = { places, radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'overpass' };
    return result;
  } catch (error) {
    lastError = error;
    console.log(`Primary radius failed for ${category}, trying fallback...`, error.message);
  }

  // Fallback: Try larger radius silently
  try {
    const query = buildOverpassQuery(lat, lon, category, SEARCH_RADIUS_FALLBACK);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Accept: 'application/json',
      },
      body: query,
      signal: signal || controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let places = (data.elements || [])
        .map((item, index) => normalizePlace(item, index, fallbackName, lat, lon))
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8);

      places = await enrichAddresses(places);

      const result = { places, radiusUsed: SEARCH_RADIUS_FALLBACK, source: 'overpass' };
      return result;
    }
  } catch (error) {
    console.log(`Fallback radius also failed for ${category}:`, error.message);
  }

  const nominatimPlaces = await fetchNominatimPlacesDirect(lat, lon, category, SEARCH_RADIUS_FALLBACK);
  if (nominatimPlaces.length > 0) {
    return { places: nominatimPlaces, radiusUsed: SEARCH_RADIUS_FALLBACK, source: 'nominatim' };
  }

  // Return empty result if both fail
  const result = { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' };
  return result;
}

async function fetchNearbyServicesDirect(lat, lon) {
  const [hospitalsResult, sheltersResult] = await Promise.allSettled([
    fetchCategoryPlacesDirect(lat, lon, 'hospitals'),
    fetchCategoryPlacesDirect(lat, lon, 'shelters'),
  ]);

  return {
    hospitals:
      hospitalsResult.status === 'fulfilled'
        ? hospitalsResult.value
        : { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
    shelters:
      sheltersResult.status === 'fulfilled'
        ? sheltersResult.value
        : { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
  };
}

async function fetchNearbyServicesFromBackend(lat, lon) {
  try {
    // Try to get cached result
    const cacheKey = `${lat.toFixed(3)}_${lon.toFixed(3)}`;
    const cachedKey = `${CACHE_KEY_PREFIX}${cacheKey}`;
    const cached = localStorage.getItem(cachedKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp <= CACHE_DURATION_MS) {
          console.log('Using cached nearby services:', data);
          return data;
        }
        localStorage.removeItem(cachedKey);
      } catch {
        // Continue to fetch fresh data
      }
    }

    // Try to call backend endpoint first
    console.log('Attempting to fetch nearby services from backend for:', { lat, lon });
    try {
      const response = await api.get(`/api/nearby-services?lat=${lat}&lon=${lon}`);

      console.log('Backend response:', response.data);

      if (response.data?.success && response.data?.data) {
        const result = {
          hospitals: response.data.data.hospitals || { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
          shelters: response.data.data.shelters || { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
        };

        console.log('Using backend result:', result);

        const hasBackendResults =
          (result.hospitals?.places?.length || 0) > 0 || (result.shelters?.places?.length || 0) > 0;

        if (hasBackendResults) {
          // Cache only non-empty backend results
          try {
            localStorage.setItem(cachedKey, JSON.stringify({ data: result, timestamp: Date.now() }));
          } catch {
            // Silently fail
          }

          return result;
        }

        console.warn('Backend returned empty nearby services. Trying direct fallback...');
      }
    } catch (backendError) {
      console.warn('Backend call failed, falling back to direct API:', backendError.message);
    }

    const directResult = await fetchNearbyServicesDirect(lat, lon);

    const hasDirectResults =
      (directResult.hospitals?.places?.length || 0) > 0 || (directResult.shelters?.places?.length || 0) > 0;

    if (hasDirectResults) {
      try {
        localStorage.setItem(cachedKey, JSON.stringify({ data: directResult, timestamp: Date.now() }));
      } catch {
        // Silently fail
      }
    }

    return directResult;
  } catch (error) {
    console.error('Fetch nearby services error:', error);
    return {
      hospitals: { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
      shelters: { places: [], radiusUsed: SEARCH_RADIUS_PRIMARY, source: 'none' },
    };
  }
}

function ResultsSection({ title, icon, places, loading, color, mapLink, radiusUsed, source }) {
  const radiusKm = Math.round((radiusUsed || SEARCH_RADIUS_PRIMARY) / 1000);
  const sourceLabel = source === 'overpass' ? 'Overpass' : source === 'nominatim' ? 'Nominatim fallback' : 'No source';
  const sourceChipColor = source === 'nominatim' ? 'warning' : source === 'overpass' ? 'success' : 'default';

  return (
    <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {icon}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Top nearby results within approximately {radiusKm} km.
              </Typography>
              <Chip
                size="small"
                color={sourceChipColor}
                variant="outlined"
                label={`Source: ${sourceLabel}`}
                sx={{ mt: 0.5, fontSize: '0.7rem' }}
              />
            </Box>
          </Stack>

          <Button
            variant="contained"
            color={color}
            endIcon={<OpenInNewIcon />}
            onClick={() => window.open(mapLink, '_blank', 'noopener,noreferrer')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Open Maps
          </Button>
        </Stack>

        <Divider sx={{ mb: 1.5 }} />

        {loading ? (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 1 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading nearby results...</Typography>
          </Stack>
        ) : places.length === 0 ? (
          <Alert severity="info">
            No results found in this area. Use Open Maps for a broader search in your region.
          </Alert>
        ) : (
          <List disablePadding>
            {places.map((place) => (
              <ListItem
                key={place.id}
                disableGutters
                secondaryAction={
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<OpenInNewIcon fontSize="small" />}
                    onClick={() =>
                      window.open(
                        `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lon}`,
                        '_blank',
                        'noopener,noreferrer'
                      )
                    }
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    View
                  </Button>
                }
              >
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {place.name}
                      </Typography>
                      <Chip
                        size="small"
                        color="primary"
                        variant="outlined"
                        label={`${place.distance.toFixed(1)} km`}
                      />
                    </Stack>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {place.address}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

function NearbyServices() {
  const navigate = useNavigate();
  const [locationState, setLocationState] = useState({
    loading: true,
    latitude: null,
    longitude: null,
    error: '',
    manualLat: '',
    manualLon: '',
  });
  const [placesState, setPlacesState] = useState({
    loading: false,
    error: '',
    shelters: [],
    hospitals: [],
    shelterRadiusUsed: SEARCH_RADIUS_PRIMARY,
    hospitalRadiusUsed: SEARCH_RADIUS_PRIMARY,
    shelterSource: 'none',
    hospitalSource: 'none',
  });

  const getCurrentLocation = useCallback(() => {
    setLocationState((current) => ({ ...current, loading: true, error: '' }));

    if (!navigator.geolocation) {
      setLocationState({
        loading: false,
        latitude: null,
        longitude: null,
        error: 'Geolocation not supported. Please enter coordinates manually.',
        manualLat: '',
        manualLon: '',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLat = position.coords.latitude;
        const newLon = position.coords.longitude;

        console.log('Geolocation success:', { newLat, newLon, accuracy: position.coords.accuracy });

        setLocationState({
          loading: false,
          latitude: newLat,
          longitude: newLon,
          error: '',
          manualLat: '',
          manualLon: '',
        });

        setLastLocationCache(newLat, newLon);
      },
      (error) => {
        console.error('Geolocation error:', error);
        
        let errorMsg = 'Unable to get precise location. ';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'Location permission denied. Please enable GPS in settings and grant browser permission.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'GPS signal not available. Please enable GPS or enter coordinates manually.';
        }

        setLocationState({
          loading: false,
          latitude: null,
          longitude: null,
          error: errorMsg,
          manualLat: '',
          manualLon: '',
        });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  const handleManualCoordinates = useCallback(() => {
    const lat = parseFloat(locationState.manualLat);
    const lon = parseFloat(locationState.manualLon);

    if (isNaN(lat) || isNaN(lon)) {
      setLocationState((current) => ({
        ...current,
        error: 'Please enter valid latitude and longitude values.',
      }));
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setLocationState((current) => ({
        ...current,
        error: 'Latitude must be -90 to 90, Longitude must be -180 to 180.',
      }));
      return;
    }

    setLocationState((current) => ({
      ...current,
      latitude: lat,
      longitude: lon,
      error: '',
      manualLat: '',
      manualLon: '',
    }));

    setLastLocationCache(lat, lon);
  }, [locationState.manualLat, locationState.manualLon]);

  useEffect(() => {
    // Clear corrupted cache on mount
    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(CACHE_KEY_PREFIX)) {
          const cached = localStorage.getItem(key);
          if (cached) {
            try {
              const { data } = JSON.parse(cached);
              // Remove cache entries with empty results
              if (
                (!data.hospitals || data.hospitals.places?.length === 0) &&
                (!data.shelters || data.shelters.places?.length === 0)
              ) {
                console.log('Clearing corrupted empty cache:', key);
                localStorage.removeItem(key);
              }
            } catch {
              // Ignore parsing errors
            }
          }
        }
      });
    } catch {
      // Silently fail
    }

    // Clear stale location cache on mount
    localStorage.removeItem(LOCATION_CACHE_KEY);
    getCurrentLocation();
  }, [getCurrentLocation]);

  useEffect(() => {
    if (locationState.loading || locationState.error) {
      return;
    }

    if (locationState.latitude === null || locationState.longitude === null) return;

    let cancelled = false;

    const fetchNearbyPlaces = async () => {
      setPlacesState((current) => ({ ...current, loading: true, error: '' }));

      try {
        const result = await fetchNearbyServicesFromBackend(
          locationState.latitude,
          locationState.longitude
        );

        if (!cancelled) {
          setPlacesState({
            loading: false,
            error: '',
            shelters: result.shelters?.places || [],
            hospitals: result.hospitals?.places || [],
            shelterRadiusUsed: result.shelters?.radiusUsed || SEARCH_RADIUS_PRIMARY,
            hospitalRadiusUsed: result.hospitals?.radiusUsed || SEARCH_RADIUS_PRIMARY,
            shelterSource: result.shelters?.source || 'none',
            hospitalSource: result.hospitals?.source || 'none',
          });
        }
      } catch (error) {
        if (!cancelled) {
          setPlacesState({
            loading: false,
            error: 'No results found nearby. Try opening Maps for broader search.',
            shelters: [],
            hospitals: [],
            shelterRadiusUsed: SEARCH_RADIUS_PRIMARY,
            hospitalRadiusUsed: SEARCH_RADIUS_PRIMARY,
            shelterSource: 'none',
            hospitalSource: 'none',
          });
        }
      }
    };

    fetchNearbyPlaces();

    return () => {
      cancelled = true;
    };
  }, [locationState.latitude, locationState.longitude, locationState.loading, locationState.error]);

  const mapLinks = useMemo(() => {
    const hasCoordinates = locationState.latitude !== null && locationState.longitude !== null;
    const positionHint = hasCoordinates ? `@${locationState.latitude},${locationState.longitude},14z` : '';
    
    if (hasCoordinates) {
      console.log('Maps links created with coordinates:', { 
        latitude: locationState.latitude, 
        longitude: locationState.longitude,
        mapsSearchUrl: `https://www.google.com/maps/search/shelters/${positionHint}`
      });
    }

    return {
      shelters: `https://www.google.com/maps/search/shelters/${positionHint}`,
      hospitals: `https://www.google.com/maps/search/hospitals/${positionHint}`,
    };
  }, [locationState.latitude, locationState.longitude]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard/user')}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Back to Dashboard
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Nearby Shelters and Hospitals
            </Typography>
            <Typography color="text.secondary">
              Live nearby service search for emergency support points around your current location.
            </Typography>
          </Box>

          <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <MyLocationIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Location Status
                </Typography>
              </Stack>

              {locationState.loading ? (
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <CircularProgress size={22} />
                  <Typography variant="body2">Detecting your current location...</Typography>
                </Stack>
              ) : locationState.error ? (
                <Stack spacing={2}>
                  <Alert severity="warning">{locationState.error}</Alert>

                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                      📍 Manual Coordinate Entry
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      If GPS is not working, enter your latitude and longitude manually:
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                      <TextField
                        size="small"
                        label="Latitude"
                        placeholder="22.18"
                        value={locationState.manualLat}
                        onChange={(e) => setLocationState((c) => ({ ...c, manualLat: e.target.value }))}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="Longitude"
                        placeholder="72.62"
                        value={locationState.manualLon}
                        onChange={(e) => setLocationState((c) => ({ ...c, manualLon: e.target.value }))}
                        sx={{ flex: 1 }}
                      />
                    </Stack>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleManualCoordinates}
                      sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                      Use These Coordinates
                    </Button>
                  </Box>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={getCurrentLocation}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Try GPS Again
                  </Button>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip
                      label={`Latitude: ${locationState.latitude?.toFixed(5)}`}
                      color="primary"
                      variant="outlined"
                    />
                    <Chip
                      label={`Longitude: ${locationState.longitude?.toFixed(5)}`}
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={getCurrentLocation}
                    sx={{ width: 'fit-content', textTransform: 'none', fontWeight: 600 }}
                  >
                    Refresh Location
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>

          {placesState.error && <Alert severity="error">{placesState.error}</Alert>}

          <Stack spacing={2}>
            <ResultsSection
              title="Nearby Shelters"
              icon={<HomeWorkIcon sx={{ color: '#2563eb' }} />}
              places={placesState.shelters}
              loading={placesState.loading}
              color="primary"
              mapLink={mapLinks.shelters}
              radiusUsed={placesState.shelterRadiusUsed}
              source={placesState.shelterSource}
            />

            <ResultsSection
              title="Nearby Hospitals"
              icon={<LocalHospitalIcon sx={{ color: '#dc2626' }} />}
              places={placesState.hospitals}
              loading={placesState.loading}
              color="error"
              mapLink={mapLinks.hospitals}
              radiusUsed={placesState.hospitalRadiusUsed}
              source={placesState.hospitalSource}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}

export default NearbyServices;