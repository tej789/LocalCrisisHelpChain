import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import 'leaflet.marker.slideto';
import { Box, CircularProgress, Typography, Alert, Paper, IconButton, Chip, Stack, Button, Avatar, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import NavigationIcon from '@mui/icons-material/Navigation';
import AmbulanceIcon from '@mui/icons-material/LocalHospital';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonPinIcon from '@mui/icons-material/PersonPin';
import SignalCellularAltIcon from '@mui/icons-material/SignalCellularAlt';
import Route from '@mui/icons-material/Route';
import DistanceIcon from '@mui/icons-material/Straighten';
import InfoIcon from '@mui/icons-material/Info';
import api from '../api/axios';

// Custom Volunteer Icon using a styled SVG inside a divIcon
// This avoids the default emoji look and feels more like
// a professional map pin for an emergency vehicle.
const volunteerIcon = L.divIcon({
  html: `
    <div
      style="
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #1976d2;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 6px rgba(0, 0, 0, 0.45);
        border: 2px solid #ffffff;
      "
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="9" width="13" height="6" rx="1.5" fill="#ffffff"/>
        <rect x="9" y="10" width="2" height="4" fill="#e53935"/>
        <rect x="8" y="11" width="4" height="2" fill="#e53935"/>
        <rect x="16" y="10" width="4" height="5" rx="1" fill="#ffffff"/>
        <circle cx="7" cy="16" r="2" fill="#263238"/>
        <circle cx="17" cy="16" r="2" fill="#263238"/>
      </svg>
    </div>
  `,
  className: 'volunteer-marker-icon',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
  popupAnchor: [0, -20]
});

const getVolunteerMarkerIcon = (photoUrl) => {
  if (!photoUrl) return volunteerIcon;

  return L.divIcon({
    html: `
      <div style="
        width: 42px;
        height: 42px;
        border-radius: 50%;
        border: 3px solid #ffffff;
        background: url('${photoUrl}') center center / cover no-repeat;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.28);
      "></div>
    `,
    className: 'volunteer-photo-marker-icon',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -22]
  });
};

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Separate icon for the user's current live position so it doesn't
// look identical to the fixed request location.
const userLiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// MapController component to auto-fit bounds without fighting user panning/zooming
// It includes volunteer, request, and (optionally) the live user position
// when computing the initial view.
const MapController = ({ volunteerLat, volunteerLng, requestLat, requestLng, userLat, userLng, mapRef }) => {
  const map = useMap();
  const hasInitiallyCenteredRef = useRef(false);
  const userInteractedRef = useRef(false);

  // Store map instance in ref
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  // Detect when the user manually moves/zooms the map and then
  // stop automatic re-centering so the map doesn't "fight" them.
  useEffect(() => {
    if (!map) return;

    const handleUserInteraction = () => {
      userInteractedRef.current = true;
    };

    map.on('dragstart', handleUserInteraction);
    map.on('zoomstart', handleUserInteraction);
    map.on('movestart', handleUserInteraction);

    return () => {
      map.off('dragstart', handleUserInteraction);
      map.off('zoomstart', handleUserInteraction);
      map.off('movestart', handleUserInteraction);
    };
  }, [map]);

  // Auto-fit bounds when data first loads. After that, keep
  // following updates only while the user hasn't interacted.
  useEffect(() => {
    if (!volunteerLat || !volunteerLng || !requestLat || !requestLng) return;

    // Always center the very first time we have both points
    // so the volunteer and request are visible together.
    if (!hasInitiallyCenteredRef.current) {
      hasInitiallyCenteredRef.current = true;
    } else if (userInteractedRef.current) {
      // Once the user has panned/zoomed, stop auto-centering
      // to avoid snapping back while they explore the map.
      return;
    }

    const points = [
      [volunteerLat, volunteerLng],
      [requestLat, requestLng]
    ];

    if (userLat && userLng) {
      points.push([userLat, userLng]);
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [volunteerLat, volunteerLng, requestLat, requestLng, userLat, userLng, map]);

  return null;
};

// PolylineDecorator component for directional arrows
const PolylineDecorator = ({ positions }) => {
  const map = useMap();
  const decoratorRef = useRef(null);

  useEffect(() => {
    if (!map || !positions || positions.length === 0) return;

    // Remove existing decorator
    if (decoratorRef.current) {
      map.removeLayer(decoratorRef.current);
    }

    // Create polyline
    const polyline = L.polyline(positions, {
      color: '#2196f3',
      weight: 4,
      opacity: 0.7
    });

    // Create decorator with arrows
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: 25,
          repeat: 50,
          symbol: L.Symbol.arrowHead({
            pixelSize: 10,
            polygon: false,
            pathOptions: { 
              stroke: true, 
              color: '#2196f3',
              weight: 2
            }
          })
        }
      ]
    });

    decorator.addTo(map);
    decoratorRef.current = decorator;

    // Cleanup
    return () => {
      if (decoratorRef.current) {
        map.removeLayer(decoratorRef.current);
      }
    };
  }, [map, positions]);

  return null;
};

const VolunteerLocationMap = ({ requestId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locationData, setLocationData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [userLiveLocation, setUserLiveLocation] = useState(null);
  
  // Refs for markers to control popups and animation
  const volunteerMarkerRef = useRef(null);
  const requestMarkerRef = useRef(null);
  const previousVolunteerPosRef = useRef(null);
  const mapRef = useRef(null);
  const liveLocationWatchIdRef = useRef(null);
  const initialCenterRef = useRef(null);
  const hasOpenedPopupsRef = useRef(false);

  // Function to recenter map
  const handleRecenterMap = () => {
    if (mapRef.current && locationData) {
      const bounds = L.latLngBounds([
        [locationData.volunteerLat, locationData.volunteerLng],
        [locationData.requestLat, locationData.requestLng]
      ]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Fetch volunteer location
  const fetchVolunteerLocation = async () => {
    try {
      if (!loading) {
        setRouteLoading(true);
      }

      const response = await api.get(`/api/requests/volunteer-location/${requestId}`);
      const data = response.data;

      if (!data.latitude || !data.longitude) {
        setError('Volunteer location not available');
        return;
      }

      const newVolunteerLat = data.latitude;
      const newVolunteerLng = data.longitude;

      // Check if this is an update (not initial load) and position changed
      const isUpdate = locationData !== null;
      const positionChanged = 
        previousVolunteerPosRef.current &&
        (previousVolunteerPosRef.current.lat !== newVolunteerLat ||
         previousVolunteerPosRef.current.lng !== newVolunteerLng);

      // If position changed and marker exists, animate it
      if (isUpdate && positionChanged && volunteerMarkerRef.current) {
        const markerInstance = volunteerMarkerRef.current;
        
        // Use slideTo for smooth animation
        if (markerInstance.slideTo) {
          markerInstance.slideTo([newVolunteerLat, newVolunteerLng], {
            duration: 4000, // 4 seconds animation
            keepAtCenter: false
          });
        }
      }

      // Store current position for next comparison
      previousVolunteerPosRef.current = {
        lat: newVolunteerLat,
        lng: newVolunteerLng
      };

      const newLocationData = {
        volunteerName: data.volunteerName,
        volunteerPhoto: data.volunteerPhoto || '',
        volunteerLat: newVolunteerLat,
        volunteerLng: newVolunteerLng,
        requestLat: data.requestLocation.latitude,
        requestLng: data.requestLocation.longitude,
        requestAddress: data.requestLocation.address
      };

      setLocationData(newLocationData);

      // Optional live requester location (where the user currently is).
      // We prefer routing to this live point instead of the original
      // fixed request location so volunteers can navigate to wherever
      // you actually are right now.
      let targetLat = data.requestLocation.latitude;
      let targetLng = data.requestLocation.longitude;

      if (
        data.userLiveLocation &&
        typeof data.userLiveLocation.latitude === 'number' &&
        typeof data.userLiveLocation.longitude === 'number'
      ) {
        setUserLiveLocation({
          lat: data.userLiveLocation.latitude,
          lng: data.userLiveLocation.longitude
        });
        targetLat = data.userLiveLocation.latitude;
        targetLng = data.userLiveLocation.longitude;
      }

      // Fetch route after location is set: always from volunteer to
      // the best-known user position (live location when available,
      // otherwise the original request coordinates).
      await fetchRoute(
        data.longitude,
        data.latitude,
        targetLng,
        targetLat
      );

      setLoading(false);
      setRouteLoading(false);

    } catch (err) {
      console.error('Error fetching volunteer location:', err);
      setError(err.response?.data?.error || 'Failed to load volunteer location');
      setLoading(false);
      setRouteLoading(false);
    }
  };

  // Fetch route from OSRM
  const fetchRoute = async (volLng, volLat, reqLng, reqLat) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${volLng},${volLat};${reqLng},${reqLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coordinates);

        // Set distance in km
        const distanceKm = (route.distance / 1000).toFixed(2);
        setDistance(distanceKm);

        // Set ETA in minutes
        const etaMinutes = Math.round(route.duration / 60);
        setEta(etaMinutes);
      }
    } catch (err) {
      console.warn('Failed to fetch route:', err);
      // Don't show error - route is optional enhancement
    }
  };

  // Initial fetch
  useEffect(() => {
    if (requestId) {
      fetchVolunteerLocation();
    }
  }, [requestId]);

  // Live tracking - refresh every 5 seconds
  useEffect(() => {
    if (!requestId) return;

    const interval = setInterval(() => {
      fetchVolunteerLocation();
    }, 5000);

    return () => clearInterval(interval);
  }, [requestId]);

  // Live tracking for the requester (user): while this map is
  // visible and geolocation is allowed, keep sending the current
  // device position to the backend so volunteers see the red icon
  // move in real time.
  useEffect(() => {
    if (!requestId || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          await api.patch(`/api/requests/${requestId}/live-location`, {
            latitude,
            longitude
          });
          setUserLiveLocation({ lat: latitude, lng: longitude });
        } catch (err) {
          console.warn('Failed to update request live location:', err?.message || err);
        }
      },
      (error) => {
        console.warn('User live-location watch error:', error?.message || error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000
      }
    );

    liveLocationWatchIdRef.current = watchId;

    return () => {
      if (
        liveLocationWatchIdRef.current != null &&
        navigator.geolocation &&
        typeof navigator.geolocation.clearWatch === 'function'
      ) {
        navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      }
    };
  }, [requestId]);

  // Auto-open volunteer popup only once when markers are ready.
  // The request popup stays closed until the user clicks so it
  // doesn't keep dragging the map view toward the request marker.
  useEffect(() => {
    if (
      !hasOpenedPopupsRef.current &&
      locationData &&
      volunteerMarkerRef.current &&
      requestMarkerRef.current
    ) {
      // Small delay to ensure markers are rendered
      setTimeout(() => {
        if (volunteerMarkerRef.current) {
          volunteerMarkerRef.current.openPopup();
        }
      }, 300);
      hasOpenedPopupsRef.current = true;
    }
  }, [locationData]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" onClose={onClose}>
        {error}
      </Alert>
    );
  }

  if (!locationData) {
    return null;
  }

  // Origin/destination used for "Navigate in Google Maps". For the
  // user, we treat their live GPS position as the origin when
  // available, falling back to the original request location.
  const navigationOriginLat = userLiveLocation?.lat ?? locationData.requestLat;
  const navigationOriginLng = userLiveLocation?.lng ?? locationData.requestLng;
  const navigationDestLat = locationData.volunteerLat;
  const navigationDestLng = locationData.volunteerLng;

  // Fix the map center so it doesn't keep re-centering every time
  // new location data arrives. We capture an initial center once
  // (based on the request location) and reuse it for the lifetime
  // of this component. Further location updates move markers but do
  // not move the base map, avoiding the "flicking" while zoomed.
  if (!initialCenterRef.current) {
    initialCenterRef.current = [
      locationData.requestLat,
      locationData.requestLng
    ];
  }

  // When the requester is standing exactly at the original request
  // location, their live marker and the fixed request marker would
  // overlap. To keep both visible, we render the live marker with a
  // tiny visual offset when they are extremely close.
  let userLiveMarkerPosition = null;
  if (userLiveLocation) {
    const { lat, lng } = userLiveLocation;
    const reqLat = locationData.requestLat;
    const reqLng = locationData.requestLng;

    let displayLat = lat;
    let displayLng = lng;

    if (
      Math.abs(lat - reqLat) < 0.0003 &&
      Math.abs(lng - reqLng) < 0.0003
    ) {
      displayLat = lat + 0.0004;
      displayLng = lng + 0.0004;
    }

    userLiveMarkerPosition = [displayLat, displayLng];
  }

  // If the volunteer reaches the exact request point, the two markers
  // would overlap. Nudge the request marker slightly in that case so
  // both icons are visible.
  let requestMarkerPosition = [locationData.requestLat, locationData.requestLng];
  if (
    Math.abs(locationData.volunteerLat - locationData.requestLat) < 0.0003 &&
    Math.abs(locationData.volunteerLng - locationData.requestLng) < 0.0003
  ) {
    requestMarkerPosition = [
      locationData.requestLat - 0.0004,
      locationData.requestLng - 0.0004
    ];
  }

  const volunteerMarkerIcon = getVolunteerMarkerIcon(locationData.volunteerPhoto);

  return (
    <Paper 
      elevation={3} 
      sx={{ 
        mt: 3, 
        p: 2, 
        borderRadius: 3,
        position: 'relative'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <LocationOnIcon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Track Volunteer {routeLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Info Panel - Distance, ETA, and external navigation */}
      {(distance !== null || eta !== null) && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
            gap: 1.5,
            mb: 2
          }}
        >
          {(distance !== null || eta !== null) && (
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {distance !== null && (
                <Chip
                  icon={<DirectionsIcon />}
                  label={
                    parseFloat(distance) < 0.05
                      ? 'Distance: very close'
                      : `Distance: ${distance} km`
                  }
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              )}
              {eta !== null && (
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`ETA: ${eta} min`}
                  color="success"
                  variant="outlined"
                  size="small"
                />
              )}
            </Stack>
          )}

          {/* Navigate to volunteer in Google Maps */}
          {navigationOriginLat && navigationOriginLng && navigationDestLat && navigationDestLng && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<NavigationIcon />}
              href={`https://www.google.com/maps/dir/?api=1&origin=${navigationOriginLat},${navigationOriginLng}&destination=${navigationDestLat},${navigationDestLng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                width: { xs: '100%', sm: 'auto' },
                justifyContent: 'center'
              }}
            >
              Navigate in Google Maps
            </Button>
          )}
        </Box>
      )}

      {/* Volunteer Status Banner */}
      {locationData.volunteerName && eta !== null && (
        <Paper
          elevation={1}
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            border: '1px solid #90caf9',
            textAlign: 'center'
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mb={1}>
            <AmbulanceIcon sx={{ fontSize: 32, color: 'error.main' }} />
            <Typography variant="body1" fontWeight={700} color="primary.main">
              Volunteer {locationData.volunteerName} is on the way
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Arriving in ~{eta} minutes
          </Typography>
        </Paper>
      )}

      <Box sx={{ height: 400, borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
        {/* Recenter Map Button */}
        <Button
          variant="contained"
          size="small"
          startIcon={<MyLocationIcon />}
          onClick={handleRecenterMap}
          sx={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1000,
            backgroundColor: 'white',
            color: 'primary.main',
            boxShadow: 2,
            '&:hover': {
              backgroundColor: '#f5f5f5',
            },
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        >
          Center Map
        </Button>

        <MapContainer 
          center={initialCenterRef.current} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto-center map to show both markers */}
          <MapController
            volunteerLat={locationData.volunteerLat}
            volunteerLng={locationData.volunteerLng}
            requestLat={locationData.requestLat}
            requestLng={locationData.requestLng}
            userLat={userLiveLocation?.lat}
            userLng={userLiveLocation?.lng}
            mapRef={mapRef}
          />

          {/* Route Polyline with Directional Arrows */}
          {routeCoordinates.length > 0 && (
            <>
              <Polyline
                positions={routeCoordinates}
                color="#2196f3"
                weight={4}
                opacity={0.7}
              />
              <PolylineDecorator positions={routeCoordinates} />
            </>
          )}

          {/* Volunteer Marker with ref for auto-popup */}
          <Marker 
            position={[locationData.volunteerLat, locationData.volunteerLng]} 
            icon={volunteerMarkerIcon}
            ref={volunteerMarkerRef}
          >
            <Popup autoClose={false} closeOnClick={false} autoPan={false}>
              <Stack direction="row" spacing={1.2} alignItems="center" sx={{ minWidth: 180 }}>
                <Avatar
                  src={locationData.volunteerPhoto || undefined}
                  sx={{ width: 44, height: 44 }}
                >
                  {(locationData.volunteerName || 'V').charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Volunteer: {locationData.volunteerName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Current Location
                  </Typography>
                </Box>
              </Stack>
              {distance !== null && (
                <>
                  <br />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <DistanceIcon sx={{ fontSize: 16 }} />
                    <small><strong>Distance:</strong> {distance} km</small>
                  </Stack>
                </>
              )}
              {eta !== null && (
                <>
                  <br />
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AccessTimeIcon sx={{ fontSize: 16 }} />
                    <small><strong>ETA:</strong> {eta} minutes</small>
                  </Stack>
                </>
              )}
            </Popup>
          </Marker>

          {/* Request Location Marker with ref for auto-popup */}
          <Marker 
            position={requestMarkerPosition} 
            icon={requestIcon}
            ref={requestMarkerRef}
          >
            <Popup autoClose={false} closeOnClick={false} autoPan={false}>
              <Stack spacing={1} sx={{ minWidth: 200 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocationOnIcon sx={{ fontSize: 18, color: 'error.main' }} />
                  <Typography variant="subtitle2" fontWeight={700}>
                    Request Location
                  </Typography>
                </Stack>
                {locationData.requestAddress && (
                  <Typography variant="caption" color="text.secondary">
                    {locationData.requestAddress}
                  </Typography>
                )}
              </Stack>
            </Popup>
          </Marker>

          {/* Live User Location Marker (optional) */}
          {userLiveLocation && userLiveMarkerPosition && (
            <Marker
              position={userLiveMarkerPosition}
              icon={userLiveIcon}
            >
              <Popup>
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonPinIcon sx={{ fontSize: 18, color: 'info.main' }} />
                    <Typography variant="subtitle2" fontWeight={700}>
                      Your Live Location
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Shown only while tracking is open
                  </Typography>
                </Stack>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </Box>

      <Paper sx={{ p: 2, borderRadius: 2, bgcolor: '#fafafa' }}>
        <Stack spacing={1.5}>
          {/* Legend Title */}
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <InfoIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle2" fontWeight={600}>
              Map Legend
            </Typography>
          </Stack>
          
          <Divider />
          
          {/* Legend Items */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <AmbulanceIcon sx={{ fontSize: 20, color: 'error.main' }} />
              <Typography variant="body2">Volunteer Location</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <LocationOnIcon sx={{ fontSize: 20, color: 'error.main' }} />
              <Typography variant="body2">Your Request Location</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <PersonPinIcon sx={{ fontSize: 20, color: 'info.main' }} />
              <Typography variant="body2">Your Live Location</Typography>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Route sx={{ fontSize: 20, color: 'primary.main' }} />
              <Typography variant="body2">Route with Navigation</Typography>
            </Stack>
          </Stack>
          
          <Divider sx={{ my: 1 }} />
          
          {/* Update Info */}
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <SignalCellularAltIcon sx={{ fontSize: 18, color: 'success.main', mt: 0.5 }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                Live Tracking Active
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Updates every 5 seconds • Smooth marker animation • Automatic popup display
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </Paper>
  );
};

export default VolunteerLocationMap;
