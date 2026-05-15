import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';

// Utility: approximate distance between two lat/lng in meters
const toRad = (v) => (v * Math.PI) / 180;
const distanceMeters = (a, b) => {
  if (!a || !b) return Infinity;
  const R = 6371000; // Earth radius meters
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + sinDLon * sinDLon * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
};

/**
 * Enhanced hook for location tracking with:
 * - distance thresholding (meters)
 * - time throttling (min interval between backend updates)
 * - adaptive accuracy (switch between high/low accuracy)
 * - exponential backoff for sync failures
 * - robust cleanup
 */
export const useLocationTracking = (options = {}) => {
  const {
    enabled = true,
    endpoint = '/api/volunteers/me/location',
    // how often (ms) to allow backend updates at most
    minUpdateInterval = 15000,
    // how often (ms) to poll/send during idle (fallback)
    periodicSyncInterval = 30000,
    // distance (meters) to consider as 'moved'
    distanceThreshold = 25,
    // adaptive accuracy behavior
    adaptiveAccuracy = true,
    // options for high and low accuracy watching
    highAccuracyOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    lowAccuracyOptions = { enableHighAccuracy: false, timeout: 20000, maximumAge: 5000 },
    // allow caller to receive updates/errors
    onLocationUpdate = null,
    onError = null
  } = options;

  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const watchIdRef = useRef(null);
  const currentWatchOptionsRef = useRef(adaptiveAccuracy ? lowAccuracyOptions : highAccuracyOptions);
  const lastKnownRef = useRef(null); // last seen location (any)
  const lastSentRef = useRef(null); // last location successfully sent to backend
  const lastSentTimeRef = useRef(0);
  const lastSeenTimeRef = useRef(0);
  const isUpdatingRef = useRef(false);
  const retryTimerRef = useRef(null);
  const periodicSyncRef = useRef(null);
  const failedAttemptsRef = useRef(0);
  const backoffBase = 2000;
  const maxBackoff = 60 * 1000;

  // clear any retry timers
  const clearRetry = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // robust backend sync with exponential backoff on failure
  const syncLocationToBackend = useCallback(async (lat, lng) => {
    if (lat == null || lng == null) return;
    if (!endpoint) return; // skip backend sync when endpoint not provided
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    clearRetry();

    try {
      await api.patch(endpoint, { latitude: lat, longitude: lng });
      failedAttemptsRef.current = 0;
      lastSentRef.current = { lat, lng };
      lastSentTimeRef.current = Date.now();
      setLastUpdateTime(Date.now());
    } catch (err) {
      failedAttemptsRef.current += 1;
      const errMsg = err?.response?.data?.error || err?.message || 'Failed to update location';
      setError(errMsg);
      if (onError) onError(errMsg);

      const backoff = Math.min(backoffBase * 2 ** (failedAttemptsRef.current - 1), maxBackoff);
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        isUpdatingRef.current = false; // allow next attempt
        syncLocationToBackend(lat, lng);
      }, backoff);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [endpoint, onError]);

  // (re)start geolocation watcher using currentWatchOptionsRef
  const setWatcher = useCallback(() => {
    if (!navigator.geolocation) {
      const errMsg = 'Geolocation not supported';
      setError(errMsg);
      if (onError) onError(errMsg);
      return;
    }

    // clear existing
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    const opts = currentWatchOptionsRef.current;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const now = Date.now();
        const newLoc = { lat: latitude, lng: longitude };

        // store last seen
        lastKnownRef.current = newLoc;
        lastSeenTimeRef.current = now;
        setLocation(newLoc);

        // compute moved distance
        const moved = distanceMeters(lastSentRef.current, newLoc);

        // compute observed speed (fallback to computed speed)
        let observedSpeed = null;
        if (typeof speed === 'number' && !Number.isNaN(speed)) observedSpeed = speed; // m/s
        else if (lastSentTimeRef.current && lastSentRef.current) {
          const dt = (now - lastSentTimeRef.current) / 1000;
          if (dt > 0) observedSpeed = moved / dt;
        }

        // adaptive accuracy: if moving reasonably fast, switch to high
        if (adaptiveAccuracy && observedSpeed !== null) {
          const wantHigh = observedSpeed > 2; // >2 m/s (~7.2 km/h)
          const isHigh = !!currentWatchOptionsRef.current.enableHighAccuracy;
          if (wantHigh && !isHigh) {
            currentWatchOptionsRef.current = highAccuracyOptions;
            setWatcher();
            return; // restart watcher; current position will be re-emitted later
          } else if (!wantHigh && isHigh) {
            currentWatchOptionsRef.current = lowAccuracyOptions;
            setWatcher();
            return;
          }
        }

        // Throttle updates to backend: by distance and time
        const timeSinceLastSent = now - lastSentTimeRef.current;
        if (moved >= distanceThreshold && timeSinceLastSent >= minUpdateInterval) {
          syncLocationToBackend(latitude, longitude).catch(() => {});
          if (onLocationUpdate) onLocationUpdate(newLoc);
        } else {
          // If first send ever, force send
          if (!lastSentRef.current) {
            syncLocationToBackend(latitude, longitude).catch(() => {});
            if (onLocationUpdate) onLocationUpdate(newLoc);
          } else {
            // still notify caller of location change without backend sync
            if (onLocationUpdate) onLocationUpdate(newLoc);
          }
        }
      },
      (err) => {
        const errMsg = err?.message || 'Failed to get location';
        setError(errMsg);
        if (onError) onError(errMsg);
        setIsTracking(false);
      },
      currentWatchOptionsRef.current
    );
  }, [adaptiveAccuracy, highAccuracyOptions, lowAccuracyOptions, onError, onLocationUpdate, distanceThreshold, minUpdateInterval, syncLocationToBackend]);

  const startTracking = useCallback(() => {
    if (!enabled) {
      setError('Tracking disabled by options');
      return;
    }
    setError(null);
    setIsTracking(true);
    currentWatchOptionsRef.current = adaptiveAccuracy ? lowAccuracyOptions : highAccuracyOptions;
    setWatcher();

    // set up periodic sync fallback
    if (periodicSyncRef.current) clearInterval(periodicSyncRef.current);
    periodicSyncRef.current = setInterval(() => {
      if (lastKnownRef.current) {
        // don't spam backend; rely on syncLocationToBackend to manage in-flight
        const { lat, lng } = lastKnownRef.current;
        const timeSinceLast = Date.now() - lastSentTimeRef.current;
        if (timeSinceLast >= periodicSyncInterval) {
          syncLocationToBackend(lat, lng).catch(() => {});
        }
      }
    }, periodicSyncInterval);
  }, [adaptiveAccuracy, lowAccuracyOptions, highAccuracyOptions, periodicSyncInterval, syncLocationToBackend]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (periodicSyncRef.current) {
      clearInterval(periodicSyncRef.current);
      periodicSyncRef.current = null;
    }
    clearRetry();
    setIsTracking(false);
  }, []);

  // auto-start/cleanup
  useEffect(() => {
    if (!enabled) return undefined;
    startTracking();

    return () => {
      stopTracking();
    };
  }, [enabled, startTracking, stopTracking]);

  return {
    location,
    isTracking,
    error,
    lastUpdateTime,
    startTracking,
    stopTracking,
    syncLocationToBackend
  };
};
