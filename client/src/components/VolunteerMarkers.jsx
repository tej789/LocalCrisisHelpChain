import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import api from '../api/axios';

const volunteerIconHtml = (photoUrl, fallbackLabel) => `
  <div style="
    width: 40px;
    height: 40px;
    border-radius: 999px;
    overflow: hidden;
    border: 3px solid #ffffff;
    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.28);
    background: linear-gradient(135deg, #2563eb, #60a5fa);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  ">
    ${photoUrl ? `<img src="${photoUrl}" alt="${fallbackLabel}" style="width: 100%; height: 100%; object-fit: cover; display: block;" />` : `<span style="color: white; font-weight: 800; font-size: 15px; line-height: 1;">${fallbackLabel}</span>`}
  </div>
`;

const createVolunteerDivIcon = (photoUrl, fallbackLabel) => new L.DivIcon({
  className: 'volunteer-photo-marker',
  html: volunteerIconHtml(photoUrl, fallbackLabel),
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -18]
});

// Haversine distance (km)
const haversineKm = (a, b) => {
  if (!a || !b) return Infinity;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

/**
 * VolunteerMarkers
 * - Listens to socket `volunteerLocationUpdated` events and renders markers
 * - Only active when `show` is true
 * - Filters by distance from `center` (radiusKm)
 * - Debounces frequent updates and prunes old entries
 */
export default function VolunteerMarkers({ socket, center, mapZoom = 10, show = false, radiusKm = 25, maxAgeMs = 120000, onVisibleCountChange, currentVolunteerId = null }) {
  const map = useMap();
  const volunteersRef = useRef(new Map()); // id -> {lat,lng,ts,profilePhoto,name}
  const [, forceRerender] = useState(0);
  const lastNotifyRef = useRef(0);

  const replaceVolunteers = useCallback((entries = []) => {
    const next = new Map();
    for (const entry of entries) {
      const volunteerId = entry?.volunteerId || entry?._id || entry?.id;
      const coords = entry?.location?.coordinates;
      if (!volunteerId || !Array.isArray(coords) || coords.length !== 2) continue;
      if (currentVolunteerId && String(volunteerId) === String(currentVolunteerId)) continue;

      const lat = Number(coords[1]);
      const lng = Number(coords[0]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      next.set(String(volunteerId), {
        lat,
        lng,
        ts: entry?.timestamp || Date.now(),
        profilePhoto: typeof entry?.profilePhoto === 'string' ? entry.profilePhoto : '',
        name: typeof entry?.name === 'string' ? entry.name : ''
      });
    }

    volunteersRef.current = next;
    forceRerender(n => n + 1);
  }, [currentVolunteerId]);

  const pruneOld = useCallback(() => {
    const now = Date.now();
    let changed = false;
    for (const [id, v] of volunteersRef.current.entries()) {
      if (now - (v.ts || 0) > maxAgeMs) {
        volunteersRef.current.delete(id);
        changed = true;
      }
    }
    if (changed) forceRerender(n => n + 1);
  }, [maxAgeMs]);

  useEffect(() => {
    if (!socket || !show) return undefined;

    const handler = (payload) => {
      try {
        const { volunteerId, latitude, longitude, timestamp, profilePhoto, volunteerName } = payload || {};
        if (!volunteerId || latitude === undefined || longitude === undefined) return;
        if (currentVolunteerId && String(volunteerId) === String(currentVolunteerId)) return;
        const loc = {
          lat: latitude,
          lng: longitude,
          ts: timestamp || Date.now(),
          profilePhoto: typeof profilePhoto === 'string' ? profilePhoto : '',
          name: typeof volunteerName === 'string' ? volunteerName : ''
        };

        volunteersRef.current.set(String(volunteerId), loc);

        // Throttle UI notifications to once every 800ms
        const now = Date.now();
        if (now - lastNotifyRef.current > 800) {
          lastNotifyRef.current = now;
          forceRerender(n => n + 1);
        }
      } catch (e) {
        // swallow
      }
    };

    socket.on('volunteerLocationUpdated', handler);

    const pruneInterval = setInterval(pruneOld, Math.max(30_000, Math.floor(maxAgeMs / 3)));

    return () => {
      socket.off('volunteerLocationUpdated', handler);
      clearInterval(pruneInterval);
    };
  }, [socket, show, pruneOld, maxAgeMs, currentVolunteerId]);

  useEffect(() => {
    if (!show) return undefined;

    let cancelled = false;

    const loadNearby = async () => {
      try {
        const response = await api.get('/api/volunteers/me/other-locations');
        const data = response.data;
        console.debug('[VolunteerMarkers] seed:/me/other-locations response:', data);
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          replaceVolunteers(data);
          return;
        }

        // If other-locations returned empty, try the nearby endpoint as a fallback
        if (!cancelled) {
          try {
            const resp2 = await api.get('/api/volunteers/me/nearby');
            const d2 = resp2.data;
            console.debug('[VolunteerMarkers] fallback seed:/me/nearby response:', d2);
            if (Array.isArray(d2) && d2.length > 0) {
              replaceVolunteers(d2);
            }
          } catch (e2) {
            console.error('[VolunteerMarkers] fallback /me/nearby failed:', e2);
          }
        }
      } catch (err) {
        console.error('[VolunteerMarkers] seed /me/other-locations failed:', err);
        // ignore seed failures; live socket updates still work
      }
    };

    loadNearby();

    return () => {
      cancelled = true;
    };
  }, [show, replaceVolunteers]);

  // Notify parent of visible count when it changes (debounced)
  useEffect(() => {
    if (typeof onVisibleCountChange !== 'function') return;
    const ids = Array.from(volunteersRef.current.keys());
    onVisibleCountChange(ids.length);
  });

  if (!show) return null;

  const markers = [];
  for (const [id, loc] of volunteersRef.current.entries()) {
    // skip if too old
    if (Date.now() - (loc.ts || 0) > maxAgeMs) continue;
    const fallbackLabel = (loc.name || String(id).slice(0, 1) || 'V').charAt(0).toUpperCase();
    markers.push(
      <Marker key={id} position={[loc.lat, loc.lng]} icon={createVolunteerDivIcon(loc.profilePhoto, fallbackLabel)}>
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
          <div style={{ fontWeight: 700 }}>{loc.name || 'Volunteer'}</div>
        </Tooltip>
      </Marker>
    );
  }

  return <>{markers}</>;
}
