import { useEffect, useState, useRef, useCallback } from 'react';
import api from '../api/axios';

/**
 * Hook for automatic location tracking and backend synchronization
 * 
 * Features:
 * - Automatically fetches location on mount
 * - Continuously tracks location changes using watchPosition
 * - Syncs location to backend at regular intervals (configurable)
 * - Handles geolocation errors gracefully
 * - Cleans up watchers on unmount
 */
export const useLocationTracking = (options = {}) => {
  const {
    enabled = true,
    updateInterval = 30000, // Update backend every 30 seconds
    watchOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    },
    onLocationUpdate = null,
    onError = null,
    endpoint = '/api/volunteers/me/location' // For volunteers
  } = options;

  const [location, setLocation] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  const watchIdRef = useRef(null);
  const updateIntervalRef = useRef(null);
  const lastLocationRef = useRef(null);
  const isUpdatingRef = useRef(false);

  // Update backend with current location
  const syncLocationToBackend = useCallback(async (lat, lng) => {
    if (isUpdatingRef.current) return;

    try {
      isUpdatingRef.current = true;
      await api.patch(endpoint, {
        latitude: lat,
        longitude: lng
      });
      setLastUpdateTime(Date.now());
      console.log('[LocationTracking] Location synced to backend:', { lat, lng });
    } catch (err) {
      console.error('[LocationTracking] Failed to sync location:', err);
      const errorMsg = err?.response?.data?.error || 'Failed to update location';
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [endpoint, onError]);

  // Start tracking location
  const startTracking = useCallback(() => {
    if (!enabled || !navigator.geolocation) {
      const errorMsg = 'Geolocation not supported or tracking disabled';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    if (watchIdRef.current !== null) {
      console.log('[LocationTracking] Already tracking location');
      return;
    }

    console.log('[LocationTracking] Starting location tracking...');
    setIsTracking(true);
    setError(null);

    // Watch for location changes
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const newLocation = { lat: latitude, lng: longitude };

        // Update local state
        setLocation(newLocation);
        lastLocationRef.current = newLocation;

        console.log('[LocationTracking] Location detected:', newLocation);

        // Call the callback if provided
        if (onLocationUpdate) {
          onLocationUpdate(newLocation);
        }

        // Sync to backend immediately for the first location
        if (!lastUpdateTime) {
          await syncLocationToBackend(latitude, longitude);
        }
      },
      (err) => {
        const errorMsg = err?.message || 'Failed to get location';
        console.error('[LocationTracking] Error:', errorMsg);
        setError(errorMsg);
        if (onError) onError(errorMsg);
        setIsTracking(false);
      },
      watchOptions
    );
  }, [enabled, onLocationUpdate, onError, watchOptions, syncLocationToBackend, lastUpdateTime]);

  // Stop tracking location
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      console.log('[LocationTracking] Location tracking stopped');
    }

    if (updateIntervalRef.current !== null) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsTracking(false);
  }, []);

  // Initialize tracking on mount
  useEffect(() => {
    if (!enabled) return;

    startTracking();

    // Set up periodic sync to backend
    updateIntervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        syncLocationToBackend(lastLocationRef.current.lat, lastLocationRef.current.lng);
      }
    }, updateInterval);

    // Cleanup on unmount
    return () => {
      stopTracking();
      if (updateIntervalRef.current !== null) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enabled, updateInterval, startTracking, stopTracking, syncLocationToBackend]);

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
