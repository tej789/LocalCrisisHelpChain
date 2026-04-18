import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, Typography, Select, MenuItem, InputLabel, FormControl, Button, Chip, Box, Paper, Divider, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Drawer, IconButton, AppBar, Toolbar, Container, TextField, Avatar } from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import DirectionsIcon from '@mui/icons-material/Directions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import NavigationIcon from '@mui/icons-material/Navigation';
// removed useNavigate; volunteers don't file requests from this dashboard
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Footer from '../components/Footer';
import LoadingScreen from '../components/LoadingScreen';
import NotificationBell from '../components/NotificationBell';
import NotificationCenterDialog from '../components/NotificationCenterDialog';

const socket = io(process.env.REACT_APP_API_URL);

// Custom Leaflet Icons
const volunteerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Static request icons (same size for normal and selected)
const requestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Green icon for resolved requests
const resolvedRequestIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Purple icon for the live position of the requester (user)
const userLiveIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(2); // Return distance in km with 2 decimal places
};

// MapController component to handle one-off "fit route" behavior
// without constantly re-centering while the volunteer or user moves
// the map. We intentionally do NOT react to `center` changes here so
// that GPS detection and marker clicks don't suddenly snap the view.
const MapController = ({ center, zoom, shouldFitBounds, bounds }) => {
  const map = useMap();

  useEffect(() => {
    if (shouldFitBounds && bounds) {
      // Auto-zoom only when explicitly requested (e.g. "Show Route")
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, shouldFitBounds, bounds]);

  return null;
};

const typeIcons = {
  food: <RestaurantIcon color="primary" />,
  medicine: <LocalHospitalIcon color="error" />,
  shelter: <HomeIcon color="success" />,
  rescue: <DirectionsRunIcon color="warning" />,
  other: <HelpOutlineIcon color="info" />,
};

const urgencyColors = {
  high: 'error',
  medium: 'warning',
  low: 'success',
};

const urgencyIcons = {
  high: <PriorityHighIcon fontSize="small" color="error" sx={{ mr: 0.5 }} />,
  medium: <ReportProblemIcon fontSize="small" color="warning" sx={{ mr: 0.5 }} />,
  low: <CheckCircleIcon fontSize="small" color="success" sx={{ mr: 0.5 }} />,
};
const urgencyPriority = {
  high: 3,
  medium: 2,
  low: 1,
};


function VolunteerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [volunteerLocation, setVolunteerLocation] = useState(null); // { lat, lng }
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeDistance, setRouteDistance] = useState(null);
  const [routeEta, setRouteEta] = useState(null);
  const [routeTargetLabel, setRouteTargetLabel] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDestination, setRouteDestination] = useState(null); // { lat, lng } current routing target
  const [mapBounds, setMapBounds] = useState(null); // For auto-zoom
  const [shouldFitBounds, setShouldFitBounds] = useState(false);
  const [mapCenterOverride, setMapCenterOverride] = useState(null);
const navigate = useNavigate();

  // Add CSS for selected marker animation and mobile popup styling
  useEffect(() => {
    const markerStyle = document.createElement('style');
    markerStyle.id = 'volunteer-marker-style';
    markerStyle.textContent = `
      @keyframes pulse {
        0% {
          transform: scale(1);
          opacity: 1;
        }
        50% {
          transform: scale(1.1);
          opacity: 0.8;
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }
      .selected-marker {
        animation: pulse 2s infinite;
        filter: brightness(1.2) saturate(1.3);
      }
      
      /* Mobile popup styling */
      @media (max-width: 768px) {
        .leaflet-popup-content-wrapper {
          max-width: 220px !important;
        }
        .leaflet-popup-content {
          max-width: 200px !important;
          font-size: 13px !important;
          margin: 10px 12px !important;
        }
        .leaflet-popup-tip-container {
          width: 20px !important;
          height: 10px !important;
        }
      }
    `;
    
    // Only add if not already added
    if (!document.getElementById('volunteer-marker-style')) {
      document.head.appendChild(markerStyle);
    }
    
    // Cleanup on unmount
    return () => {
      const existingStyle = document.getElementById('volunteer-marker-style');
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

// Use device location and save to backend
const handleUseLocation = () => {
  if (!navigator.geolocation) {
    setSnackbar({ open: true, message: 'Geolocation not supported', severity: 'error' });
    return;
  }

  setLocLoading(true);

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        const { latitude, longitude } = position.coords;

        await api.patch('/api/volunteers/me/location', {
          latitude,
          longitude
        });

        // Update local state to trigger map re-centering
        setVolunteerLocation({ lat: latitude, lng: longitude });
        console.log('Location updated:', { lat: latitude, lng: longitude });

        setSnackbar({ open: true, message: 'Location updated successfully', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Failed to update location', severity: 'error' });
      } finally {
        setLocLoading(false);
      }
    },
    (error) => {
      setLocLoading(false);
      setSnackbar({ open: true, message: error?.message || 'Permission denied', severity: 'error' });
    },
    {
      enableHighAccuracy: true,
      timeout: 3000,
      maximumAge: 60000
    }
  );
};

  // Fetch route from OSRM
  // options.fitToRoute (default true) controls whether the map auto-zooms
  // to include both volunteer and request, or leaves centering to caller.
  const fetchRoute = async (requestLat, requestLng, requestId, options = {}) => {
    const { fitToRoute = true } = options;
    if (!volunteerLocation) return;
    
    try {
      setRouteLoading(true);
      const url = `https://router.project-osrm.org/route/v1/driving/${volunteerLocation.lng},${volunteerLocation.lat};${requestLng},${requestLat}?overview=full&geometries=geojson`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        
        // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coordinates);

        // Remember the current routing destination so external navigation
        // (e.g. Google Maps) can follow the same target the user selected.
        setRouteDestination({ lat: requestLat, lng: requestLng });

        // Set distance in km
        const distanceKm = (route.distance / 1000).toFixed(2);
        setRouteDistance(distanceKm);

        // Set ETA in minutes
        const etaMinutes = Math.round(route.duration / 60);
        setRouteEta(etaMinutes);

        // Calculate bounds for auto-zoom when requested
        if (fitToRoute) {
          const bounds = L.latLngBounds([
            [volunteerLocation.lat, volunteerLocation.lng],
            [requestLat, requestLng]
          ]);
          setMapBounds(bounds);
          setShouldFitBounds(true);

          // Reset after zoom completes
          setTimeout(() => setShouldFitBounds(false), 500);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch route:', err);
    } finally {
      setRouteLoading(false);
    }
  };

  const auth = useAuth();
  console.log('AUTH USER FROM CONTEXT:', auth?.user);

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [view, setView] = useState('open'); // 'open' | 'assigned' | 'all'
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  // Availability state (frontend only)
  const [myAvailability, setMyAvailability] = useState(false);
  const [myVerified, setMyVerified] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  // Profile state
  const [profileName, setProfileName] = useState(auth.user?.name || "");
  const profileEmail = auth.user?.email || "";
  const [profilePhoto, setProfilePhoto] = useState(auth.user?.profilePhoto || "");
  const fileInputRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Backward-compatible verified check derived directly from auth.user
  const computedVerified = (auth?.user?.isVerified === true) || (auth?.user?.isVerified === undefined && auth?.user?.verified === true);
  
  // State for routing visualization
  const [selectedMapRequest, setSelectedMapRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null); // For marker highlighting
  const mapSectionRef = useRef(null);
  const resolvedSectionRef = useRef(null);
  const requestsSectionRef = useRef(null);
  // Throttle backend updates for live GPS sync
  const liveLocationSyncRef = useRef(0);

useEffect(() => {
  (async () => {
    try {
      const response = await api.get('/api/requests');
      setRequests(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  })();
}, []);

  // Get volunteer's location: prioritize GPS, but fall back FAST to
  // the last saved backend location so the map never feels "stuck".
  useEffect(() => {
    let isGPSLocationSet = false;

    // Helper function to persist location to backend so that
    // matching/active sections immediately see the latest coordinates.
    const persistLocation = async (latitude, longitude) => {
      try {
        await api.patch('/api/volunteers/me/location', {
          latitude,
          longitude
        });
      } catch (err) {
        console.warn('Failed to persist volunteer GPS location:', err?.message || err);
      }
    };

    // Helper function to fetch backend saved location (used both as
    // parallel fallback and when GPS is denied).
    async function fetchBackendLocation() {
      try {
        const response = await api.get('/api/volunteers/me');
        const volunteer = response.data.data || response.data;

        if (volunteer) {
          setProfileName(volunteer.name || auth?.user?.name || '');
          setProfilePhoto(volunteer.profilePhoto || auth?.user?.profilePhoto || '');

          if (auth?.user && (volunteer.profilePhoto !== auth.user.profilePhoto || volunteer.name !== auth.user.name)) {
            try {
              auth.updateUser({
                name: volunteer.name || auth.user.name,
                profilePhoto: volunteer.profilePhoto || ''
              });
            } catch {}
          }
        }
        
        if (volunteer.location && volunteer.location.coordinates && volunteer.location.coordinates.length === 2) {
          const [lng, lat] = volunteer.location.coordinates;
          // Only set backend location if GPS hasn't set it yet
          setVolunteerLocation(prev => {
            if (!prev) {
              console.log('📍 Backend saved location loaded:', { lat, lng });
              return { lat, lng };
            }
            return prev; // Keep GPS location if already set
          });
        }
      } catch (err) {
        console.warn('Could not fetch volunteer location:', err.message);
      }
    }

    // Always kick off backend location fetch immediately so we have
    // something to show even if GPS is slow.
    fetchBackendLocation();

    // Try to get current GPS location (preferred, but with a SHORT timeout)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setVolunteerLocation({ lat: latitude, lng: longitude });
          isGPSLocationSet = true;
          console.log('✅ GPS location detected (current):', { lat: latitude, lng: longitude });

          // Also update backend automatically so the volunteer's
          // active section and assignment logic use this location
          // without requiring an extra "Use My Location" click.
          await persistLocation(latitude, longitude);
        },
        (error) => {
          console.warn('⚠️ GPS permission denied or unavailable:', error.message);
          // On error we already kicked off backend fetch, so nothing else to do.
        },
        {
          enableHighAccuracy: true,
          timeout: 3000, // 3s hard limit for GPS; then rely on backend/cached
          maximumAge: 60000 // allow using a location from last 60s for snappier UX
        }
      );

      // Safety: if GPS still hasn't responded very quickly, make sure
      // backend location has been tried.
      setTimeout(() => {
        if (!isGPSLocationSet) {
          console.log('⏱️ GPS still pending, ensuring saved location is used...');
          fetchBackendLocation();
        }
      }, 1500); // only 1.5s before ensuring fallback
    } else {
      console.warn('Geolocation not supported by this browser');
      fetchBackendLocation();
    }
  }, []);

  // Live GPS tracking: watch the device location and update the
  // volunteer marker (and occasionally the backend) while the
  // dashboard is open. This makes the blue icon move as the
  // volunteer moves.
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Update marker position in the UI
        setVolunteerLocation(prev => {
          if (!prev || prev.lat !== latitude || prev.lng !== longitude) {
            console.log('📡 Live GPS update:', { lat: latitude, lng: longitude });
            return { lat: latitude, lng: longitude };
          }
          return prev;
        });

        // Throttle backend sync to at most once every 15 seconds
        const now = Date.now();
        if (now - liveLocationSyncRef.current > 15000) {
          liveLocationSyncRef.current = now;
          try {
            await api.patch('/api/volunteers/me/location', {
              latitude,
              longitude
            });
          } catch (err) {
            console.warn('Live GPS sync failed:', err?.message || err);
          }
        }
      },
      (error) => {
        console.warn('Live GPS watch error:', error?.message || error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000
      }
    );

    return () => {
      if (watchId != null && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const handleViewAndScroll = (newView) => {
    setView(newView);

    // Whenever we switch views, especially into the resolved tab,
    // clear any existing route/selection so old paths do not linger.
    if (newView === 'resolved') {
      setRouteCoordinates([]);
      setRouteDistance(null);
      setRouteEta(null);
      setSelectedMapRequest(null);
      setMapBounds(null);
      setShouldFitBounds(false);
      setMapCenterOverride(null);
    }

    // Slight delay so layout can update before scrolling
    setTimeout(() => {
      if (requestsSectionRef.current) {
        requestsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Initialize availability and verification from auth user
  useEffect(() => {
    const u = auth?.user || {};
    const isVerified = (u.isVerified === true) || (u.isVerified === undefined && u.verified === true);
    setMyVerified(!!isVerified);
    setMyAvailability(!!u.isAvailable);
    setProfileName(u.name || '');
    setProfilePhoto(u.profilePhoto || '');
  }, [auth?.user]);

  const handleProfilePhotoSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSnackbar({ open: true, message: 'Please select an image file.', severity: 'error' });
      event.target.value = '';
      return;
    }

    if (file.size > 1_500_000) {
      setSnackbar({ open: true, message: 'Image too large. Please use a file under 1.5MB.', severity: 'error' });
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);

    event.target.value = '';
  };

  useEffect(() => {
    socket.on('newRequest', (newRequest) => {
      setRequests(prev => [newRequest, ...prev]);
    });
    socket.on('requestClaimed', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    socket.on('requestAssigned', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    socket.on('requestResolved', (updatedRequest) => {
      setRequests(prev => prev.map(r => r._id === updatedRequest._id ? updatedRequest : r));
    });
    // Live movement of the requester icon
    socket.on('requestLocationUpdated', (payload) => {
      if (!payload || !payload.requestId || !Array.isArray(payload.coordinates)) return;
      setRequests(prev => prev.map(r => {
        if (r._id !== payload.requestId) return r;
        return {
          ...r,
          liveLocation: {
            coordinates: payload.coordinates,
            updatedAt: payload.updatedAt
          }
        };
      }));
    });
    return () => {
      socket.off('newRequest');
      socket.off('requestClaimed');
      socket.off('requestAssigned');
      socket.off('requestResolved');
      socket.off('requestLocationUpdated');
    };

  }, []);

  // Toggle availability for verified volunteers only
  const handleToggleAvailability = async () => {
    if (!computedVerified) {
      setSnackbar({ open: true, message: 'Only verified volunteers can change availability.', severity: 'warning' });
      return;
    }
    setAvailLoading(true);
    try {
      const desired = !myAvailability;
      const { data } = await api.patch('/api/volunteers/me/availability', { isAvailable: desired });
      setMyAvailability(!!data?.isAvailable);
      // Persist into AuthContext so state survives across app
      try {
        auth.login({ token: auth.token, user: { ...(auth.user || {}), isAvailable: !!data?.isAvailable, isVerified: data?.isVerified ?? auth?.user?.isVerified } });
      } catch {}
      setSnackbar({ open: true, message: data?.isAvailable ? 'You are now Available.' : 'You are now Offline.', severity: 'success' });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 403) setSnackbar({ open: true, message: 'Only verified volunteers can change availability.', severity: 'error' });
      else if (status === 400) setSnackbar({ open: true, message: err.response?.data?.error || 'Invalid request.', severity: 'error' });
      else setSnackbar({ open: true, message: 'Failed to update availability.', severity: 'error' });
    } finally {
      setAvailLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    try {
      const { data } = await api.patch("/api/volunteers/me/basic", {
        name: profileName,
        profilePhoto
      });

      auth.login({
        token: auth.token,
        user: {
          ...auth.user,
          name: data.name,
          profilePhoto: data.profilePhoto || ''
        }
      });

      setSnackbar({ open: true, message: "Profile updated successfully", severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || "Update failed", severity: 'error' });
    }
    setProfileLoading(false);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const typeMatch = typeFilter ? req.type === typeFilter : true;
      const urgencyMatch = urgencyFilter ? req.urgency === urgencyFilter : true;

      // IMPORTANT: Do NOT filter out assigned/resolved requests by distance.
      // Volunteers should always see all of their assigned work,
      // even if they are currently far away.
      return typeMatch && urgencyMatch;
    });
  }, [requests, typeFilter, urgencyFilter]);

const sortedRequests = useMemo(() => {
  return [...filteredRequests].sort((a, b) => {
    const ua = urgencyPriority[a.urgency?.toLowerCase()] || 0;
    const ub = urgencyPriority[b.urgency?.toLowerCase()] || 0;
    return ub - ua; // high first
  });
}, [filteredRequests]);


 const openRequests = sortedRequests.filter(r => (r.status || 'open') === 'open');
  // Show requests assigned to the logged-in volunteer (by userId)
  const myAssignedRequests = sortedRequests.filter(r => {
    const status = r.status || 'open';
    if (status !== 'assigned' && status !== 'resolved') return false;
  
    const myId = auth.user?.id || auth.user?._id;
    if (!myId) return false;
  
    // assignedTo can be ObjectId string OR populated object
    if (typeof r.assignedTo === 'string') {
      return r.assignedTo === myId;
    }
  
    if (typeof r.assignedTo === 'object' && r.assignedTo?._id) {
      return r.assignedTo._id === myId;
    }
  
    return false;
  }


);
  // Separate active and resolved
const activeAssignedRequests = myAssignedRequests.filter(
  r => r.status === 'assigned'
);

const resolvedRequests = myAssignedRequests.filter(
  r => r.status === 'resolved'
);

// Final displayed list
const displayedRequests =
  view === 'assigned'
    ? activeAssignedRequests
    : view === 'resolved'
    ? resolvedRequests
    : activeAssignedRequests;

// Debug logging for map rendering
console.log('Map Debug:', {
  view,
  totalRequests: requests.length,
  myAssignedRequests: myAssignedRequests.length,
  activeAssignedRequests: activeAssignedRequests.length,
  displayedRequests: displayedRequests.length,
  displayedRequestsWithLocation: displayedRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).length
});

  // Legacy claim dialog removed; volunteers claim directly

  // Minimal change: volunteer self-claim uses JWT identity; no name/contact needed
  const handleClaimSelf = async (requestId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/requests/${requestId}/claim/self`);
      setSnackbar({ open: true, message: 'Request claimed successfully!', severity: 'success' });
      // Optimistically update local state so it appears in "My Assigned" immediately
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'assigned', assignedTo: auth.user?.id } : r));
      // Ensure server state is synced (in case other fields changed) and switch to 'assigned' view
      try {
      const response = await api.get('/api/requests');

if (Array.isArray(response.data.data)) {
  setRequests(response.data.data);
} else {
  setRequests([]);
}
      } catch {}
      setView('assigned');
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to claim request.', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleResolve = async (requestId) => {
    setActionLoading(true);
    try {
      await api.post(`/api/requests/${requestId}/resolve`);
      setSnackbar({ open: true, message: 'Request marked as resolved!', severity: 'success' });
      // Optimistically update to resolved
      setRequests(prev => prev.map(r => r._id === requestId ? { ...r, status: 'resolved' } : r));
      // Refetch to ensure full sync
      try {
       const response = await api.get('/api/requests');

if (Array.isArray(response.data.data)) {
  setRequests(response.data.data);
} else {
  setRequests([]);
}
      } catch {}
    } catch (err) {
      setSnackbar({ open: true, message: 'Failed to resolve request.', severity: 'error' });
    }
    setActionLoading(false);
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDetailsDialog = (request) => {
    setSelectedRequest(request);
    setDetailsDialogOpen(true);
  };

  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    // Don't clear selectedRequest - keep it for reference
    // This allows the map marker and route to remain visible
  };

  if (loading) {
    return <LoadingScreen message="Loading volunteer dashboard..." />;
  }
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // Get unique types and urgencies for filter dropdowns
  const uniqueTypes = Array.from(new Set(requests.map((req) => req.type))).filter(Boolean);
  const uniqueUrgencies = Array.from(new Set(requests.map((req) => req.urgency))).filter(Boolean);

  // Map center: use override when set; otherwise use sensible defaults
  // based on view and available locations.
  const defaultPosition = [22.3072, 73.1812]; // Vadodara, Gujarat
  let mapCenter = defaultPosition;

  if (mapCenterOverride && mapCenterOverride.length === 2) {
    mapCenter = mapCenterOverride;
  } else if (view === 'resolved') {
    const firstResolvedWithCoords = resolvedRequests.find(
      r => r.location && r.location.coordinates && r.location.coordinates.length === 2
    );
    if (firstResolvedWithCoords) {
      mapCenter = [
        firstResolvedWithCoords.location.coordinates[1],
        firstResolvedWithCoords.location.coordinates[0]
      ];
    }
  } else {
    if (volunteerLocation) {
      mapCenter = [volunteerLocation.lat, volunteerLocation.lng];
    } else {
      const firstWithCoords = filteredRequests.find(
        r => r.location && r.location.coordinates && r.location.coordinates.length === 2
      );
      if (firstWithCoords) {
        mapCenter = [
          firstWithCoords.location.coordinates[1],
          firstWithCoords.location.coordinates[0]
        ];
      }
    }
  }

const whatsappMessage = selectedRequest
  ? encodeURIComponent(
      `Hello ${selectedRequest.name}, 
I am the assigned volunteer from Local Crisis HelpChain regarding your ${selectedRequest.type} request. 
I will reach you shortly.`
    )
  : '';
  return (
    <Box
  sx={{
    p: { xs: 1, md: 4 },
    minHeight: '100vh',
    backgroundColor: 'background.default',
    display: 'flex',
    flexDirection: 'column'
  }}
>
{/* Top Navigation Bar with Hamburger Menu */}
<AppBar position="static" color="default" elevation={1} sx={{ mb: 3 }}>
  <Toolbar>
    <IconButton
      edge="start"
      color="inherit"
      aria-label="menu"
      onClick={() => setSidebarOpen(true)}
      sx={{ mr: 2 }}
    >
      <MenuIcon />
    </IconButton>
    
    <Typography variant="h6" sx={{ flexGrow: 1 }}>
      Volunteer Dashboard
    </Typography>

    <NotificationBell />

    <Button
      onClick={() => setProfileOpen(true)}
      sx={{ minWidth: 0, p: 0, borderRadius: '50%' }}
    >
      <Avatar
        src={profilePhoto || undefined}
        sx={{ width: 38, height: 38, bgcolor: 'grey.400' }}
      >
        {(profileName || auth?.user?.name || 'V').charAt(0).toUpperCase()}
      </Avatar>
    </Button>
  </Toolbar>
</AppBar>

{/* Sidebar Drawer */}
<Drawer
  anchor="left"
  open={sidebarOpen}
  onClose={() => setSidebarOpen(false)}
>
  <Box sx={{ width: 250, p: 2 }}>
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
      <Avatar
        src={profilePhoto || undefined}
        sx={{ width: 44, height: 44, bgcolor: 'grey.400' }}
      >
        {(profileName || auth?.user?.name || 'V').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }} noWrap>
          {profileName || auth?.user?.name || 'Volunteer'}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {profileEmail || auth?.user?.email || ''}
        </Typography>
      </Box>
    </Stack>

    <Typography variant="h6" sx={{ mb: 2 }}>
      Menu
    </Typography>
    
    {/* Profile Button */}
    <Button
      fullWidth
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
      onClick={() => {
        setSidebarOpen(false);
        setProfileOpen(true);
      }}
    >
      Profile
    </Button>

    <Button
      fullWidth
      variant="outlined"
      sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
      onClick={() => {
        setSidebarOpen(false);
        setNotificationsOpen(true);
      }}
    >
      Notifications
    </Button>

    {/* View Filters from Drawer */}
    <Button
      fullWidth
      variant={view === 'assigned' ? 'contained' : 'outlined'}
      sx={{ mb: 1, borderRadius: 2, fontWeight: 600 }}
      onClick={() => {
        setSidebarOpen(false);
        handleViewAndScroll('assigned');
      }}
    >
      My Active
    </Button>

    <Button
      fullWidth
      variant={view === 'resolved' ? 'contained' : 'outlined'}
      sx={{ mb: 2, borderRadius: 2, fontWeight: 600 }}
      onClick={() => {
        setSidebarOpen(false);
        handleViewAndScroll('resolved');
      }}
    >
      My Resolved
    </Button>

    {/* Logout Button */}
    <Button
      fullWidth
      variant="contained"
      color="error"
      sx={{ borderRadius: 2, fontWeight: 600 }}
      onClick={() => {
        setSidebarOpen(false);
        auth.logout();
      }}
    >
      Logout
    </Button>
  </Box>
</Drawer>

  <Container maxWidth="lg">
  <NotificationCenterDialog
    open={notificationsOpen}
    onClose={() => setNotificationsOpen(false)}
    title="Your Notifications"
  />
  {/* Welcome Box - Same as User Dashboard */}
  <Paper
    elevation={2}
    sx={{
      mb: 4,
      p: { xs: 2.5, md: 4 },
      borderRadius: 4,
      textAlign: "center",
      background: "#f5f7fa"
    }}
  >
    {/* Logo / Icon */}
    <VolunteerActivismIcon sx={{ fontSize: 40, mb: 1, color: 'primary.main' }} />

    {/* Title */}
    <Typography variant="h5" fontWeight={700} gutterBottom>
      Welcome to Volunteer Dashboard
    </Typography>

    {/* Subtitle */}
    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
      View assigned requests and help resolve crisis situations in your community
    </Typography>

    {/* View filters */}
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%'
      }}
    >
      <Button
        variant={view === 'assigned' ? 'contained' : 'outlined'}
        size="large"
        onClick={() => handleViewAndScroll('assigned')}
        sx={{ px: 4, fontWeight: 600 }}
      >
        My Active
      </Button>

      <Button
        variant={view === 'resolved' ? 'contained' : 'outlined'}
        size="large"
        onClick={() => handleViewAndScroll('resolved')}
        sx={{ px: 4, fontWeight: 600 }}
      >
        My Resolved
      </Button>
    </Box>
  </Paper>

       <Divider sx={{ my: 2 }} />
<Stack
  direction="row"
  spacing={2}
  justifyContent="center"
  mb={2}
  flexWrap="wrap"
>
  <Chip
  label={`Active: ${activeAssignedRequests.length}`}
  color="primary"
  sx={{ fontWeight: 600, px: 1 }}
/>


  <Chip
    label={`Resolved: ${resolvedRequests.length}`}
    color="success"
  />

  <Chip
    label={`Total: ${myAssignedRequests.length}`}
  />
</Stack>
<Box ref={requestsSectionRef} sx={{ mb: 3, maxWidth: 900, mx: 'auto' }}>

<Paper
  elevation={2}
  sx={{
    p: 2,
    mb: 2,
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.02)'
  }}
>
          <FormControl variant="standard" sx={{ minWidth: 140 }}>
            <InputLabel>Type</InputLabel>
            <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} label="Type">
              <MenuItem value="">All Types</MenuItem>
              {uniqueTypes.map(type => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="standard" sx={{ minWidth: 140 }}>
            <InputLabel>Urgency</InputLabel>
            <Select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} label="Urgency">
              <MenuItem value="">All Urgencies</MenuItem>
              {uniqueUrgencies.map(urgency => (
                <MenuItem key={urgency} value={urgency}>{urgency}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
        <Grid container spacing={3}>
{displayedRequests.length === 0 && (           <Grid item xs={12}>

              <Paper elevation={1} sx={{ p: 5, textAlign: 'center', background: '#f5f7fa' }}>
                <SentimentSatisfiedAltIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No {view === 'assigned'
      ? 'active requests'
      : 'resolved requests'} found.</Typography>
              </Paper>
            </Grid>
          )}
{displayedRequests.map((req) => (            <Grid item xs={12} sm={6} md={4} key={req._id || req.id}>
              <Card
                variant="outlined"
                sx={{
  mb: 2,
  minHeight: { xs: 'auto', md: 340 },
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',

  boxShadow:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? 10
      : 4,

  borderRadius: 4,

  border:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? '2px solid #d32f2f'
      : '1px solid rgba(0,0,0,0.12)',

  background:
    req.urgency?.toLowerCase() === 'high' &&
    (req.status || 'open') === 'open'
      ? 'rgba(211,47,47,0.05)'
      : '#fff',

  transition: 'box-shadow 0.2s, transform 0.2s',

  '&:hover': {
    boxShadow: 12,
    transform: 'translateY(-4px)'
  },

  p: 0,
}}


              >
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <Box sx={{ fontSize: 44 }}>
                      {typeIcons[req.type?.toLowerCase()] || <HelpOutlineIcon color="disabled" sx={{ fontSize: 44 }} />}
                    </Box>
                    <Box>
                      <Typography variant="h6" color="primary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                        {req.type}
                      </Typography>
                      <Chip
                        label={req.urgency?.charAt(0).toUpperCase() + req.urgency?.slice(1)}
                        color={urgencyColors[req.urgency?.toLowerCase()] || 'default'}
                        size="small"
                        icon={urgencyIcons[req.urgency?.toLowerCase()]}
                        sx={{ fontWeight: 600, ml: 1 }}
                      />
                    </Box>
                  </Stack>
                  <Typography
  variant="body1"
  sx={{
    mb: 1,
    fontWeight: 500,
    minHeight: 48,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical'
  }}
>

                    {req.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Location:</strong> {req.location?.address
                      ? req.location.address
                      : (req.location && req.location.coordinates && req.location.coordinates.length === 2
                          ? `Lat: ${req.location.coordinates[1]}, Lng: ${req.location.coordinates[0]}`
                          : 'N/A')}
                  </Typography>
                 <Box sx={{ mb: 1 }}>
  <strong>Status: </strong>
  <Chip
    label={req.status || 'open'}
    color={
      req.status === 'resolved'
        ? 'success'
        : req.status === 'assigned'
        ? 'primary'
        : 'warning'
    }
    size="small"
    sx={{ ml: 1 }}
  />
</Box>

                </CardContent>
                <Box sx={{ px: 3, pb: 2, pt: 0, display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <Button variant="outlined" size="small" onClick={() => handleOpenDetailsDialog(req)}>
                    View Details
                  </Button>
                  {false && ((req.status || 'open') === 'open') && ( // hidden to enforce NGO-controlled assignment
                    <Button variant="contained" size="small" onClick={() => handleClaimSelf(req._id)} disabled={actionLoading} sx={{ fontWeight: 600 }}>
                      Claim
                    </Button>
                  )}
                 {((req.status || 'open') === 'assigned') &&
 auth.user?.role === 'volunteer' &&
 auth.user?.id &&
 (
   req.assignedTo === auth.user.id ||
   req.assignedTo?._id === auth.user.id
 ) && (
   <Button
     variant="contained"
     color="success"
     size="small"
     onClick={() => handleResolve(req._id)}
     disabled={actionLoading}
     sx={{ fontWeight: 600 }}
   >
     Mark as Resolved
   </Button>
)}

                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
      {/* Map at the bottom */}
      <Paper 
        ref={mapSectionRef}
        elevation={1} 
        sx={{ 
          p: { xs: 1.5, sm: 2 }, 
          mt: 4, 
          width: '100%', 
          borderRadius: { xs: 1.5, sm: 2 }, 
          boxShadow: 1 
        }}
      >
        {/* Map Header - Stack on mobile */}
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            justifyContent: { xs: 'flex-start', sm: 'space-between' }, 
            gap: { xs: 1, sm: 0 },
            mb: 2 
          }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Live Request Map {volunteerLocation && view !== 'resolved' && (
              <Chip 
                label="Your Location Detected" 
                color="primary" 
                size="small" 
                sx={{ ml: 1, display: { xs: 'none', sm: 'inline-flex' } }} 
              />
            )}
          </Typography>
          <Chip 
            label={`My Assigned Requests: ${displayedRequests.filter(r => r.location && r.location.coordinates && r.location.coordinates.length === 2).length}`}
            color="secondary"
            variant="outlined"
            size="medium"
            sx={{ 
              fontWeight: 600,
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'center', sm: 'flex-start' }
            }}
          />
        </Box>
        
        {/* Distance/ETA and Navigate button in a single aligned row */}
        {view !== 'resolved' && volunteerLocation && selectedMapRequest && (
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
            {(routeDistance !== null && routeEta !== null) && (
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={1}
              >
                <Chip
                  icon={<DirectionsIcon />}
                  label={
                    parseFloat(routeDistance) < 0.05
                      ? 'Distance: very close'
                      : `Distance: ${routeDistance} km`
                  }
                  color="primary"
                  variant="outlined"
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'flex-start', sm: 'center' }
                  }}
                />
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`ETA: ${routeEta} min`}
                  color="success"
                  variant="outlined"
                  size="small"
                  sx={{
                    width: { xs: '100%', sm: 'auto' },
                    justifyContent: { xs: 'flex-start', sm: 'center' }
                  }}
                />
              </Stack>
            )}

            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<NavigationIcon />}
              href={`https://www.google.com/maps/dir/?api=1&origin=${volunteerLocation.lat},${volunteerLocation.lng}&destination=${(routeDestination?.lat ?? selectedMapRequest.location.coordinates[1])},${(routeDestination?.lng ?? selectedMapRequest.location.coordinates[0])}&travelmode=driving`}
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
          </Box>
        )}
        {view !== 'resolved' &&
          routeDistance !== null &&
          routeEta !== null &&
          !!routeTargetLabel && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: 'block' }}
          >
            Route to: {routeTargetLabel}
          </Typography>
        )}
        
        <Box sx={{ 
          height: { xs: 300, sm: 350, md: 450 }, 
          width: '100%',
          borderRadius: { xs: 1.5, sm: 2 },
          overflow: 'hidden'
        }}>
          <MapContainer center={mapCenter} zoom={volunteerLocation ? 12 : 6} style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Dynamic map controller - smoothly centers map when volunteer location changes or auto-zooms to route */}
            <MapController 
              center={mapCenter} 
              zoom={volunteerLocation ? 12 : 6} 
              shouldFitBounds={shouldFitBounds}
              bounds={mapBounds}
            />
            
            {/* Route Polyline */}
            {view !== 'resolved' && routeCoordinates.length > 0 && (
              <Polyline
                positions={routeCoordinates}
                color="#2196f3"
                weight={4}
                opacity={0.7}
              />
            )}
            
            {/* Volunteer Location Marker (Blue) - hide in resolved view */}
            {view !== 'resolved' && volunteerLocation && (
              <Marker
                position={[volunteerLocation.lat, volunteerLocation.lng]}
                icon={volunteerIcon}
              >
                <Popup>
                  <Typography variant="subtitle1" fontWeight={600} color="primary">
                    📍 Your Location
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lat: {volunteerLocation.lat.toFixed(4)}, Lng: {volunteerLocation.lng.toFixed(4)}
                  </Typography>
                </Popup>
              </Marker>
            )}

            {/* Crisis Request Markers - assigned (red), resolved (green),
                plus optional live user position (purple) */}
            {displayedRequests
              .filter(r => {
                if (!r.location || !Array.isArray(r.location.coordinates)) {
                  console.warn('Request missing location:', r._id);
                  return false;
                }
                if (r.location.coordinates.length !== 2) {
                  console.warn('Request invalid coordinates length:', r._id, r.location.coordinates);
                  return false;
                }
                return true;
              })
              .map((req) => {
                try {
                  const baseCoords = req.location.coordinates;
                  const reqLat = baseCoords[1];
                  const reqLng = baseCoords[0];
                  
                  // Prevent crashes if lat or lng is invalid
                  if (!reqLat || !reqLng || isNaN(reqLat) || isNaN(reqLng)) {
                    console.warn('Invalid lat/lng for request:', req._id, { lat: reqLat, lng: reqLng });
                    return null;
                  }

                  // Display position for the fixed request marker. By default
                  // this is the real request location, but if the volunteer
                  // is standing almost exactly on this point we nudge the
                  // marker slightly so both icons remain visible.
                  let reqLatDisplay = reqLat;
                  let reqLngDisplay = reqLng;

                  if (
                    volunteerLocation &&
                    Math.abs(volunteerLocation.lat - reqLat) < 0.0003 &&
                    Math.abs(volunteerLocation.lng - reqLng) < 0.0003
                  ) {
                    reqLatDisplay = reqLat - 0.0004;
                    reqLngDisplay = reqLng - 0.0004;
                  }

                  // Calculate distance if volunteer location is available
                  let distance = null;
                  if (volunteerLocation) {
                    distance = calculateDistance(
                      volunteerLocation.lat,
                      volunteerLocation.lng,
                      reqLat,
                      reqLng
                    );
                  }

                  console.log('Rendering marker for request:', req._id, { lat: reqLat, lng: reqLng, distance });

                  const isResolved = req.status === 'resolved';
                  const markerIcon = isResolved ? resolvedRequestIcon : requestIcon;

                  const liveCoords =
                    req.liveLocation &&
                    Array.isArray(req.liveLocation.coordinates) &&
                    req.liveLocation.coordinates.length === 2
                      ? req.liveLocation.coordinates
                      : null;

                  // Straight-line distance from volunteer to the requester's
                  // current live position (if both are available), plus a
                  // small visual offset when the two markers would otherwise
                  // overlap so both remain visible.
                  let liveDistance = null;
                  let liveLatDisplay = null;
                  let liveLngDisplay = null;

                  if (liveCoords) {
                    const liveLat = liveCoords[1];
                    const liveLng = liveCoords[0];

                    // Base display position is the real live coordinates
                    liveLatDisplay = liveLat;
                    liveLngDisplay = liveLng;

                    // If the live point is almost exactly on top of the
                    // fixed request location, nudge it slightly so the
                    // two markers don't completely overlap visually.
                    if (
                      Math.abs(liveLat - reqLat) < 0.0003 &&
                      Math.abs(liveLng - reqLng) < 0.0003
                    ) {
                      liveLatDisplay = liveLat + 0.0004;
                      liveLngDisplay = liveLng + 0.0004;
                    }

                    // If the live point is also almost exactly on top of
                    // the volunteer marker, nudge it slightly in a
                    // different direction so the blue volunteer icon and
                    // purple live icon are both visible.
                    if (
                      volunteerLocation &&
                      Math.abs(liveLat - volunteerLocation.lat) < 0.0003 &&
                      Math.abs(liveLng - volunteerLocation.lng) < 0.0003
                    ) {
                      liveLatDisplay = liveLat + 0.0004;
                      liveLngDisplay = liveLng - 0.0004;
                    }

                    if (volunteerLocation) {
                      liveDistance = calculateDistance(
                        volunteerLocation.lat,
                        volunteerLocation.lng,
                        liveLat,
                        liveLng
                      );
                    }
                  }

                  return (
              <>
              <Marker
                key={req._id || req.id}
                position={[reqLatDisplay, reqLngDisplay]}
                icon={markerIcon}
                eventHandlers={{
                  click: () => {
                    // For resolved requests, don't show route; just clear any existing one
                    if (req.status === 'resolved') {
                      setSelectedMapRequest(null);
                      setRouteCoordinates([]);
                      setRouteDistance(null);
                      setRouteEta(null);
                      setRouteDestination(null);
                      setRouteTargetLabel(null);
                      setMapCenterOverride([reqLat, reqLng]);
                      return;
                    }

                    // For active/assigned requests, show driving route and
                    // center the map on the clicked request marker instead
                    // of the volunteer icon for a clearer focus.
                    setSelectedMapRequest(req);
                    if (volunteerLocation) {
                      fetchRoute(reqLat, reqLng, req._id, { fitToRoute: false });
                      setRouteTargetLabel('request location');
                      setMapCenterOverride([reqLat, reqLng]);
                    } else {
                      // Even without volunteer location, still center on request
                      setMapCenterOverride([reqLat, reqLng]);
                    }
                  }
                }}
              >
                <Popup>
                  <Box sx={{ minWidth: 150, maxWidth: 200 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🚨 {req.type || 'Request'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ⚠ {req.urgency || 'N/A'}
                    </Typography>
                    {/* For active requests show straight-line distance; for resolved show status */}
                    {!isResolved && distance && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {parseFloat(distance) < 0.05
                          ? '📏 Very close to you (straight-line)'
                          : `📏 ~${distance} km (straight-line)`}
                      </Typography>
                    )}
                    {isResolved && (
                      <Typography variant="caption" color="success.main" fontWeight={600} display="block">
                        ✅ Status: resolved
                      </Typography>
                    )}
                    {/* Show OSRM distance if this request is selected and route is calculated */}
                    {!isResolved && selectedMapRequest && selectedMapRequest._id === req._id && routeDistance && (
                      <Typography variant="caption" color="primary" fontWeight={600} display="block">
                        🛣 {routeDistance} km (driving route)
                      </Typography>
                    )}
                    {!isResolved && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                        Click marker for route
                      </Typography>
                    )}
                  </Box>
                </Popup>
              </Marker>
              {/* Optional live user marker, separate from the fixed request */}
              {liveCoords && (
                <Marker
                  key={(req._id || req.id) + '-user'}
                  position={[
                    liveLatDisplay != null ? liveLatDisplay : liveCoords[1],
                    liveLngDisplay != null ? liveLngDisplay : liveCoords[0]
                  ]}
                  icon={userLiveIcon}
                  eventHandlers={{
                    click: () => {
                      if (req.status === 'resolved') {
                        return;
                      }

                      // When clicking the live requester marker, compute
                      // route and ETA specifically to the moving user
                      // position instead of the fixed help location.
                      setSelectedMapRequest(req);
                      if (volunteerLocation) {
                        const liveLat = liveCoords[1];
                        const liveLng = liveCoords[0];
                        fetchRoute(liveLat, liveLng, req._id, { fitToRoute: false });
                        setRouteTargetLabel('requester current location');
                        setMapCenterOverride([liveLat, liveLng]);
                      } else {
                        setMapCenterOverride([liveCoords[1], liveCoords[0]]);
                      }
                    }
                  }}
                >
                  <Popup>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🧍 Requester Current Location
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      This is where the user is now.
                    </Typography>
                    {liveDistance && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {parseFloat(liveDistance) < 0.05
                          ? '📏 Very close to you (straight-line)'
                          : `📏 ~${liveDistance} km from you (straight-line)`}
                      </Typography>
                    )}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                      sx={{ mt: 0.5, fontStyle: 'italic' }}
                    >
                      Click marker for route to this point
                    </Typography>
                  </Popup>
                </Marker>
              )}
              </>
                );
                } catch (error) {
                  console.error('Error rendering marker for request:', req._id, error);
                  return null;
                }
              })}
          </MapContainer>
        </Box>
      </Paper>
      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={handleCloseDetailsDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent dividers>
          {selectedRequest && (
            <Box>
              <Typography variant="subtitle1" gutterBottom><strong>Type:</strong> {selectedRequest.type}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Urgency:</strong> {selectedRequest.urgency}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Description:</strong> {selectedRequest.description}</Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Name:</strong> {selectedRequest.name}</Typography>
              {/* <Typography variant="subtitle1" gutterBottom><strong>Contact:</strong> {selectedRequest.contact}</Typography> */}
              {selectedRequest.status === 'assigned'&&
 selectedRequest?.contact &&
 auth.user?.id &&
 (
   selectedRequest.assignedTo === auth.user.id ||
   selectedRequest.assignedTo?._id === auth.user.id
 ) && (
   <Box sx={{ mt: 2 }}>
     <Typography variant="subtitle1" gutterBottom>
       <strong>Contact:</strong> {selectedRequest.contact}
     </Typography>

     <Stack direction="row" spacing={2} mt={1}>
  {/* Call */}
  <Button
    variant="contained"
    color="primary"
    size="small"
    component="a"
    href={`tel:${selectedRequest.contact}`}
    startIcon={<PhoneIcon />}
  >
    Call
  </Button>

  {/* WhatsApp */}
<Button
  variant="contained"
  color="success"
  size="small"
  component="a"
  target="_blank"
  rel="noopener noreferrer"
href={`https://wa.me/${selectedRequest.contact}?text=${whatsappMessage}`}  startIcon={<WhatsAppIcon />}
>
  WhatsApp
</Button>
</Stack>
   </Box>
 )}
              <Typography variant="subtitle1" gutterBottom><strong>Location:</strong> {selectedRequest.location?.address
                ? selectedRequest.location.address
                : (selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2
                    ? `Lat: ${selectedRequest.location.coordinates[1]}, Lng: ${selectedRequest.location.coordinates[0]}`
                    : 'N/A')}
              </Typography>
              <Typography variant="subtitle1" gutterBottom><strong>Status:</strong> {selectedRequest.status}</Typography>
              {selectedRequest.claimedBy && selectedRequest.claimedBy.name && (
                <Typography variant="subtitle1" gutterBottom><strong>Claimed By:</strong> {selectedRequest.claimedBy.name}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedRequest && selectedRequest.status === 'assigned' && selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2 && volunteerLocation && (
            <Button 
              variant="outlined" 
              color="primary"
              startIcon={<DirectionsIcon />}
              onClick={() => {
                const reqLat = selectedRequest.location.coordinates[1];
                const reqLng = selectedRequest.location.coordinates[0];
                setSelectedMapRequest(selectedRequest);
                // Here we still want to show the full route with both
                // volunteer and request visible, so keep auto-zoom on.
                fetchRoute(reqLat, reqLng, selectedRequest._id, { fitToRoute: true });
                setDetailsDialogOpen(false);
                setTimeout(() => {
                  if (mapSectionRef.current) {
                    mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
            >
              Show Route
            </Button>
          )}
          <Button onClick={handleCloseDetailsDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 4
          }
        }}
      >
        <Box textAlign="center" mb={2}>
          <Avatar
            src={profilePhoto || undefined}
            sx={{ width: 84, height: 84, mx: 'auto', mb: 1.5 }}
          >
            {(profileName || 'V').charAt(0).toUpperCase()}
          </Avatar>

          <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1.5 }}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Photo
            </Button>
            <Button
              size="small"
              color="error"
              variant="outlined"
              onClick={() => setProfilePhoto('')}
              disabled={!profilePhoto}
            >
              Remove
            </Button>
          </Stack>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleProfilePhotoSelect}
            style={{ display: 'none' }}
          />

          <Typography variant="h5" fontWeight={700}>
            Volunteer Profile
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your account
          </Typography>
        </Box>

        <TextField
          fullWidth
          size="small"
          label="Name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          size="small"
          label="Email"
          value={profileEmail}
          disabled
          sx={{ mb: 3 }}
        />

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 3, fontWeight: 600 }}
          onClick={handleSaveProfile}
          disabled={profileLoading}
        >
          Save Changes
        </Button>

        <Box textAlign="center" mb={2}>
          <Typography variant="body2">
            Status:{" "}
            <span
              style={{
                color: myAvailability ? "#2e7d32" : "#d32f2f",
                fontWeight: 600
              }}
            >
              {myAvailability ? "Available" : "Offline"}
            </span>
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="contained"
          size="medium"
          sx={{ mb: 2 }}
          onClick={handleToggleAvailability}
          disabled={availLoading}
        >
          {myAvailability ? "Go Offline" : "Go Available"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          size="medium"
          sx={{ mb: 2 }}
          onClick={handleUseLocation}
          disabled={locLoading}
        >
          Use My Location
        </Button>

        <Button
          fullWidth
          variant="outlined"
          sx={{ mb: 0 }}
          onClick={() => setProfileOpen(false)}
        >
          Close
        </Button>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
     {/* Footer */}
<Footer text="© 2026 Local Crisis HelpChain · Volunteer Dashboard" />
    </Container>
    </Box>
  );
}

export default VolunteerDashboard; 