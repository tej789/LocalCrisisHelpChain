import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import 'leaflet.marker.slideto';
import { Box, CircularProgress, Typography, Alert, Paper, IconButton, Chip, Stack, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import api from '../api/axios';

// Custom Volunteer Icon using divIcon with emoji
const volunteerIcon = L.divIcon({
  html: '<div style="font-size: 30px; text-align: center; line-height: 30px;">🚑</div>',
  className: 'volunteer-marker-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15]
});

const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// MapController component to auto-fit bounds
const MapController = ({ volunteerLat, volunteerLng, requestLat, requestLng, mapRef }) => {
  const map = useMap();

  // Store map instance in ref
  useEffect(() => {
    if (mapRef) {
      mapRef.current = map;
    }
  }, [map, mapRef]);

  useEffect(() => {
    if (volunteerLat && volunteerLng && requestLat && requestLng) {
      const bounds = L.latLngBounds([
        [volunteerLat, volunteerLng],
        [requestLat, requestLng]
      ]);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [volunteerLat, volunteerLng, requestLat, requestLng, map]);

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
  
  // Refs for markers to control popups and animation
  const volunteerMarkerRef = useRef(null);
  const requestMarkerRef = useRef(null);
  const previousVolunteerPosRef = useRef(null);
  const mapRef = useRef(null);

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
        volunteerLat: newVolunteerLat,
        volunteerLng: newVolunteerLng,
        requestLat: data.requestLocation.latitude,
        requestLng: data.requestLocation.longitude,
        requestAddress: data.requestLocation.address
      };

      setLocationData(newLocationData);

      // Fetch route after location is set
      await fetchRoute(
        data.longitude,
        data.latitude,
        data.requestLocation.longitude,
        data.requestLocation.latitude
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

  // Auto-open both popups when markers are ready
  useEffect(() => {
    if (locationData && volunteerMarkerRef.current && requestMarkerRef.current) {
      // Small delay to ensure markers are rendered
      setTimeout(() => {
        if (volunteerMarkerRef.current) {
          volunteerMarkerRef.current.openPopup();
        }
        if (requestMarkerRef.current) {
          requestMarkerRef.current.openPopup();
        }
      }, 300);
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
        <Typography variant="h6" fontWeight={600}>
          📍 Track Volunteer {routeLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Info Panel - Distance and ETA */}
      {(distance || eta) && (
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {distance && (
            <Chip
              icon={<DirectionsIcon />}
              label={`Distance: ${distance} km`}
              color="primary"
              variant="outlined"
              size="small"
            />
          )}
          {eta && (
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

      {/* Volunteer Status Banner */}
      {locationData.volunteerName && eta && (
        <Paper
          elevation={1}
          sx={{
            mb: 2,
            p: 1.5,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
            border: '1px solid #bbdefb',
            textAlign: 'center'
          }}
        >
          <Typography variant="body1" fontWeight={600} color="primary.main">
            🚑 Volunteer {locationData.volunteerName} is on the way
          </Typography>
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
          center={[locationData.volunteerLat, locationData.volunteerLng]} 
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
            icon={volunteerIcon}
            ref={volunteerMarkerRef}
          >
            <Popup autoClose={false} closeOnClick={false}>
              <strong>🙋 Volunteer: {locationData.volunteerName}</strong>
              <br />
              <small>Current Location</small>
              {distance && (
                <>
                  <br />
                  <small>📏 Distance: {distance} km</small>
                </>
              )}
              {eta && (
                <>
                  <br />
                  <small>⏱ ETA: {eta} minutes</small>
                </>
              )}
            </Popup>
          </Marker>

          {/* Request Location Marker with ref for auto-popup */}
          <Marker 
            position={[locationData.requestLat, locationData.requestLng]} 
            icon={requestIcon}
            ref={requestMarkerRef}
          >
            <Popup autoClose={false} closeOnClick={false}>
              <strong>🚨 Your Request Location</strong>
              <br />
              {locationData.requestAddress && (
                <small>{locationData.requestAddress}</small>
              )}
            </Popup>
          </Marker>
        </MapContainer>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        � Volunteer location | 🔴 Your request location | 🛣 Blue line with arrows shows route
        <br />
        <small>📡 Live tracking: Updates every 5 seconds | Smooth marker animation | Both popups visible automatically</small>
      </Typography>
    </Paper>
  );
};

export default VolunteerLocationMap;
