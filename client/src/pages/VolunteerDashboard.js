import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useLocationTracking } from '../hooks/useLocationTracking';
import { Card, CardContent, Typography, Select, MenuItem, InputLabel, FormControl, Button, Chip, Box, Paper, Divider, Snackbar, Alert, Stack, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText, Drawer, IconButton, AppBar, Toolbar, Container, TextField, Avatar, List, ListItemButton, ListItemIcon, ListItemText, Tooltip, useMediaQuery, useTheme } from '@mui/material';
import Grid from '@mui/material/Grid';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import HomeIcon from '@mui/icons-material/Home';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from "socket.io-client";
import { getTimePendingInfo } from '../utils/timeUtils';
import { SKILL_OPTIONS } from '../utils/skillsConfig';
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
import VolunteerRatingCard from '../components/VolunteerRatingCard';
import NotificationBell from '../components/NotificationBell';
import NotificationCenterDialog from '../components/NotificationCenterDialog';
import LogoutIcon from '@mui/icons-material/Logout';
import RequestStatusTimeline from '../components/RequestStatusTimeline';

// Initialize socket with auth token for server to validate connection
const socketOptions = {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  auth: {
    token: localStorage.getItem('token') || ''
  }
};

const socket = io(process.env.REACT_APP_API_URL, socketOptions);

// Log socket connection events for debugging
socket.on('connect', () => {
  console.log('[Socket] Connected with ID:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('[Socket] Disconnected. Reason:', reason);
});

socket.on('connect_error', (error) => {
  console.error('[Socket] Connection error:', error);
});

const notifyBrowser = (title, body) => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (window.Notification.permission === 'granted') {
    new window.Notification(title, { body });
  }
};

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

const MapZoomTracker = ({ onZoomChange }) => {
  const map = useMap();

  useEffect(() => {
    onZoomChange(map.getZoom());
  }, [map, onZoomChange]);

  useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
  });

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

const LIVE_LOCATION_MAX_AGE_MS = 120000;

const getFreshLiveLocation = (request) => {
  const liveLocation = request?.liveLocation;

  if (
    !liveLocation ||
    !Array.isArray(liveLocation.coordinates) ||
    liveLocation.coordinates.length !== 2 ||
    !liveLocation.updatedAt
  ) {
    return null;
  }

  const updatedAt = Date.parse(liveLocation.updatedAt);
  if (!Number.isFinite(updatedAt)) {
    return null;
  }

  const age = Date.now() - updatedAt;
  if (age < 0 || age > LIVE_LOCATION_MAX_AGE_MS) {
    return null;
  }

  return {
    lat: liveLocation.coordinates[1],
    lng: liveLocation.coordinates[0],
    updatedAt
  };
};

const getAnyLiveLocation = (request) => {
  const liveLocation = request?.liveLocation;
  if (
    !liveLocation ||
    !Array.isArray(liveLocation.coordinates) ||
    liveLocation.coordinates.length !== 2
  ) return null;

  return {
    lat: liveLocation.coordinates[1],
    lng: liveLocation.coordinates[0],
    updatedAt: liveLocation.updatedAt ? Date.parse(liveLocation.updatedAt) : null
  };
};


function VolunteerDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [publicReviewsOpen, setPublicReviewsOpen] = useState(false);
  const [sosHandlerOpen, setSosHandlerOpen] = useState(false);
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
  const [mapZoom, setMapZoom] = useState(6);
const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

      .leaflet-tooltip.request-map-label,
      .leaflet-tooltip.request-map-live-label {
        border-radius: 10px;
        border-width: 1px;
        border-style: solid;
        box-shadow: 0 6px 16px rgba(15, 23, 42, 0.14);
        padding: 6px 8px;
        backdrop-filter: blur(4px);
      }

      .leaflet-tooltip.request-map-label {
        background: rgba(255, 255, 255, 0.96);
        border-color: #93c5fd;
      }

      .leaflet-tooltip.request-map-live-label {
        background: rgba(248, 245, 255, 0.96);
        border-color: #c4b5fd;
      }

      .leaflet-tooltip.request-map-label:before {
        border-top-color: #93c5fd !important;
      }

      .leaflet-tooltip.request-map-live-label:before {
        border-top-color: #c4b5fd !important;
      }

      .map-label-title {
        color: #0f172a;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.2;
        margin-bottom: 3px;
        max-width: 150px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .map-label-meta {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        line-height: 1.2;
        border-radius: 999px;
        padding: 2px 7px;
      }

      .map-label-meta.request {
        color: #0b5394;
        background: #e8f2fe;
      }

      .map-label-meta.live {
        color: #5b21b6;
        background: #f1e8ff;
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
  const [profileSkills, setProfileSkills] = useState(auth.user?.skills || []);
  const fileInputRef = useRef(null);
  const [profileLoading, setProfileLoading] = useState(false);
  // Backward-compatible verified check derived directly from auth.user
  const computedVerified = (auth?.user?.isVerified === true) || (auth?.user?.isVerified === undefined && auth?.user?.verified === true);
  const volunteerId = auth?.user?._id || auth?.user?.id;
  
  // State for routing visualization
  const [selectedMapRequest, setSelectedMapRequest] = useState(null);
  const [selectedRequestId, setSelectedRequestId] = useState(null); // For marker highlighting
  const mapSectionRef = useRef(null);
  const resolvedSectionRef = useRef(null);
  const requestsSectionRef = useRef(null);
  // Throttle backend updates for live GPS sync
  const liveLocationSyncRef = useRef(0);
  const sidebarWidth = sidebarCollapsed ? 92 : 286;

  const closeMobileSidebar = () => setSidebarOpen(false);

  const openDialogAndClose = (setter) => {
    setter(true);
    if (isMobile) closeMobileSidebar();
  };

  const handleViewAndScrollWithSidebar = (newView) => {
    handleViewAndScroll(newView);
    if (isMobile) closeMobileSidebar();
  };

  const sidebarItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <PersonOutlineIcon fontSize="small" />,
      active: profileOpen,
      onClick: () => openDialogAndClose(setProfileOpen),
    },
    {
      key: 'my-activity',
      label: 'My Activity',
      icon: <EventNoteOutlinedIcon fontSize="small" />,
      onClick: () => {
        navigate('/dashboard/volunteer/activity');
        if (isMobile) closeMobileSidebar();
      }
    },
    {
      key: 'notifications',
      label: 'Notifications',
      icon: <NotificationsNoneIcon fontSize="small" />,
      active: notificationsOpen,
      onClick: () => openDialogAndClose(setNotificationsOpen),
    },
    {
      key: 'reviews',
      label: 'Public Reviews',
      icon: <RateReviewOutlinedIcon fontSize="small" />,
      active: publicReviewsOpen,
      onClick: () => openDialogAndClose(setPublicReviewsOpen),
    },
    {
      key: 'sos',
      label: 'Handle SOS',
      icon: <DirectionsRunIcon fontSize="small" />,
      active: sosHandlerOpen,
      onClick: () => openDialogAndClose(setSosHandlerOpen),
    },
    {
      key: 'active',
      label: 'My Active',
      icon: <DashboardOutlinedIcon fontSize="small" />,
      active: view === 'assigned',
      onClick: () => handleViewAndScrollWithSidebar('assigned'),
    },
    {
      key: 'resolved',
      label: 'My Resolved',
      icon: <CheckCircleIcon fontSize="small" />,
      active: view === 'resolved',
      onClick: () => handleViewAndScrollWithSidebar('resolved'),
    },
  ];

  const renderSidebarContent = (collapsed = false) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      <Box
        sx={{
          px: collapsed ? 1.25 : 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 1,
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar
            src={profilePhoto || undefined}
            sx={{ width: 44, height: 44, bgcolor: 'primary.main', fontWeight: 700 }}
          >
            {(profileName || auth?.user?.name || 'V').charAt(0).toUpperCase()}
          </Avatar>

          {!collapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>
                {profileName || auth?.user?.name || 'Volunteer'}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {profileEmail || auth?.user?.email || 'No email available'}
              </Typography>
            </Box>
          )}
        </Stack>

        {!collapsed && !isMobile && (
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(true)}
            aria-label="collapse navigation"
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ChevronLeftIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {collapsed && !isMobile && (
        <Box sx={{ display: 'flex', justifyContent: 'center', pb: 1.5 }}>
          <IconButton
            size="small"
            onClick={() => setSidebarCollapsed(false)}
            aria-label="expand navigation"
            sx={{ border: '1px solid', borderColor: 'divider' }}
          >
            <ChevronRightIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Divider />

      <List sx={{ px: collapsed ? 1 : 1.5, py: 1.5, flex: 1 }}>
        {sidebarItems.map((item) => {
          const active = Boolean(item.active);

          return (
            <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right" arrow disableHoverListener={!collapsed}>
              <ListItemButton
                onClick={item.onClick}
                sx={{
                  mb: 0.75,
                  borderRadius: 2,
                  minHeight: 48,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  px: collapsed ? 1.5 : 2,
                  backgroundColor: active ? 'rgba(59, 130, 246, 0.14)' : 'transparent',
                  color: active ? 'primary.main' : 'text.primary',
                  '&:hover': {
                    backgroundColor: active ? 'rgba(59, 130, 246, 0.18)' : 'rgba(15, 23, 42, 0.04)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, color: active ? 'primary.main' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                {!collapsed && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: 14 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Box
        sx={{
          p: collapsed ? 1.25 : 1.75,
          mt: 'auto',
          borderTop: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.03) 0%, rgba(239, 68, 68, 0.08) 100%)',
        }}
      >
        {!collapsed && (
          <Stack spacing={0.25} sx={{ mb: 1.25 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              Account
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sign out when you finish your shift.
            </Typography>
          </Stack>
        )}

        {collapsed ? (
          <Tooltip title="Logout" placement="right" arrow>
            <IconButton
              onClick={() => {
                setSidebarOpen(false);
                setLogoutOpen(true);
              }}
              aria-label="logout"
              sx={{
                width: 44,
                height: 44,
                mx: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                bgcolor: 'error.main',
                boxShadow: '0 10px 20px rgba(239, 68, 68, 0.28)',
                '&:hover': {
                  bgcolor: 'error.dark',
                },
              }}
            >
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : (
          <Button
            fullWidth
            variant="contained"
            startIcon={<LogoutIcon />}
            onClick={() => {
              setSidebarOpen(false);
              setLogoutOpen(true);
            }}
            sx={{
              minHeight: 48,
              fontWeight: 800,
              textTransform: 'none',
              borderRadius: 2.5,
              bgcolor: 'error.main',
              color: '#fff',
              boxShadow: '0 12px 24px rgba(239, 68, 68, 0.22)',
              '&:hover': {
                bgcolor: 'error.dark',
                boxShadow: '0 14px 28px rgba(239, 68, 68, 0.28)',
              },
            }}
          >
            Logout
          </Button>
        )}
      </Box>
    </Box>
  );

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

  // Use the centralized location tracking hook for live volunteer location
  // This reduces duplication and applies thresholding/throttling.
  const { location: trackedVolunteerLocation, lastUpdateTime: trackedLastUpdateTime } = useLocationTracking({
    enabled: true,
    endpoint: '/api/volunteers/me/location',
    minUpdateInterval: 5000,
    distanceThreshold: 5,
    adaptiveAccuracy: true
  });

  // Update local UI position when tracker reports a new location
  useEffect(() => {
    if (!trackedVolunteerLocation) return;
    setVolunteerLocation(prev => {
      if (!prev || prev.lat !== trackedVolunteerLocation.lat || prev.lng !== trackedVolunteerLocation.lng) {
        console.log('📡 Live GPS update (from hook):', trackedVolunteerLocation);
        return { lat: trackedVolunteerLocation.lat, lng: trackedVolunteerLocation.lng };
      }
      return prev;
    });
  }, [trackedVolunteerLocation]);

  // When the hook successfully syncs to backend, broadcast via socket
  useEffect(() => {
    if (!trackedLastUpdateTime || !volunteerId || !trackedVolunteerLocation) return;
    try {
      socket.emit('volunteerLocationUpdate', {
        volunteerId,
        latitude: trackedVolunteerLocation.lat,
        longitude: trackedVolunteerLocation.lng,
        timestamp: trackedLastUpdateTime
      });
      console.log('✅ Location broadcasted via socket (from hook)');
    } catch (e) {
      console.warn('⚠️ Failed to emit volunteerLocationUpdate', e);
    }
  }, [trackedLastUpdateTime, volunteerId, trackedVolunteerLocation]);

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
    const matchIds = (a, b) => String(a || '') === String(b || '');

    const replaceOrAddRequest = (prev, updated) => {
      if (!updated) return prev;
      const updatedId = updated._id || updated.id;
      let found = false;
      const mapped = prev.map(r => {
        const rid = r._id || r.id;
        if (matchIds(rid, updatedId)) {
          found = true;
          return updated;
        }
        return r;
      });
      if (!found) return [updated, ...prev];
      return mapped;
    };

    socket.on('newRequest', (newRequest) => {
      setRequests(prev => {
        const newId = newRequest?._id || newRequest?.id;
        if (!newId) return [newRequest, ...prev];
        if (prev.some(r => matchIds(r._id || r.id, newId))) {
          return prev.map(r => matchIds(r._id || r.id, newId) ? newRequest : r);
        }
        return [newRequest, ...prev];
      });
    });

    socket.on('requestClaimed', (updatedRequest) => {
      setRequests(prev => replaceOrAddRequest(prev, updatedRequest));
    });
    socket.on('requestAssigned', (updatedRequest) => {
      setRequests(prev => replaceOrAddRequest(prev, updatedRequest));
    });
    socket.on('requestResolved', (updatedRequest) => {
      setRequests(prev => replaceOrAddRequest(prev, updatedRequest));
    });
    socket.on('requestStatusChanged', (payload) => {
      const updatedRequest = payload?.request;
      if (!updatedRequest) return;

      setRequests(prev => replaceOrAddRequest(prev, updatedRequest));

      const statusLabel = payload?.label || updatedRequest.status;
      setSnackbar({
        open: true,
        message: `${updatedRequest.title || 'Request'} updated to ${statusLabel}`,
        severity: updatedRequest.status === 'resolved' ? 'success' : 'info'
      });

      notifyBrowser(
        `${updatedRequest.title || 'Request'} ${statusLabel}`,
        payload?.request?.claimedBy?.name
          ? `Assigned to ${payload.request.claimedBy.name}`
          : 'Request status has changed.'
      );
    });
    // SOS alerts targeted to individual volunteers
    socket.on('sosAlert', (payload) => {
      try {
        console.log('[Socket] Received sosAlert:', payload);
        console.log('[Socket] Payload request details:', { 
          id: payload.request?._id || payload.request?.id,
          type: payload.request?.type,
          status: payload.request?.status,
          sosTargetVolunteer: payload.request?.sosTargetVolunteer,
          createdAt: payload.request?.createdAt
        });
        
        const currentId = auth?.user?._id || auth?.user?.id || null;
        console.log('[Socket] Current volunteer ID:', currentId, 'Payload volunteerId:', payload?.volunteerId);
        
        if (!currentId) {
          console.warn('[Socket] No current volunteer ID');
          return;
        }
        
        if (!payload || !payload.request) {
          console.warn('[Socket] No payload or request in sosAlert');
          return;
        }

        // Only accept if targeted to THIS volunteer
        if (payload.volunteerId && payload.volunteerId.toString() === currentId.toString()) {
          console.log('[Socket] SOS Alert matched for this volunteer!');
          setSnackbar({ 
            open: true, 
            message: `Emergency nearby${payload.distance ? ` — ${payload.distance}m away` : ''} — open Handle SOS to respond.`, 
            severity: 'warning' 
          });
          // Add request to local state so it appears immediately in Handle SOS dialog
          if (payload.request) {
            console.log('[Socket] Adding SOS request to state:', payload.request._id || payload.request.id);
            setRequests(prev => {
              console.log('[Socket] Before adding - requests count:', prev.length);
              const updated = replaceOrAddRequest(prev, payload.request);
              console.log('[Socket] After adding - requests count:', updated.length);
              console.log('[Socket] Updated requests:', updated.map(r => ({ id: r._id || r.id, type: r.type, status: r.status })));
              return updated;
            });
          }
        } else {
          console.log('[Socket] SOS Alert not targeted to this volunteer');
        }
      } catch (e) {
        console.error('[Socket] sosAlert handler error:', e);
      }
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
    // Register volunteer's socket room so server can target alerts to this volunteer
    try {
      const volunteerId = auth?.user?._id || auth?.user?.id;
      if (volunteerId) {
        socket.emit('registerVolunteer', volunteerId);
        console.log('Registered volunteer socket room for', volunteerId);
      }
    } catch (e) {}
    return () => {
      socket.off('newRequest');
      socket.off('requestClaimed');
      socket.off('requestAssigned');
      socket.off('requestResolved');
      socket.off('requestStatusChanged');
      socket.off('requestLocationUpdated');
      socket.off('sosAlert');
    };

  }, []);

  // Socket registration: register volunteer as soon as socket connects and auth is ready
  useEffect(() => {
    const volunteerId = auth?.user?._id || auth?.user?.id;
    if (!volunteerId) return;

    const registerVol = () => {
      try {
        socket.emit('registerVolunteer', volunteerId);
        console.log('[Socket] Registered volunteer with ID:', volunteerId, 'socket connected:', socket.connected);
      } catch (e) {
        console.error('[Socket] registerVolunteer error', e);
      }
    };

    // If socket is already connected, register immediately
    if (socket.connected) {
      registerVol();
    }

    // Also register on connect event (handles reconnects)
    socket.on('connect', registerVol);

    return () => {
      socket.off('connect', registerVol);
    };
  }, [auth?.user?._id, auth?.user?.id]);

  useEffect(() => {
    if (!sosHandlerOpen) return;

    const refreshRequests = async () => {
      try {
        const response = await api.get('/api/requests');
        if (Array.isArray(response.data.data)) {
          setRequests(response.data.data);
        }
      } catch (err) {
        console.error('Failed to refresh requests for SOS handler:', err);
      }
    };

    refreshRequests();

    const refreshInterval = setInterval(refreshRequests, 10000);

    return () => clearInterval(refreshInterval);
  }, [sosHandlerOpen]);

  const pendingSosRequests = useMemo(() => {
    console.log('[Filter] Total requests:', requests.length);
    console.log('[Filter] Current volunteerId:', volunteerId);
    console.log('[Filter] All requests:', requests.map(r => ({ id: r._id || r.id, type: r.type, status: r.status, sosTarget: r.sosTargetVolunteer })));
    
    const filtered = requests
      .filter((req) => {
        const typeMatch = req.type?.toLowerCase() === 'rescue';
        const statusMatch = (req.status || 'open') === 'open';
        console.log(`[Filter] Request ${req._id || req.id}: type=${req.type} (match=${typeMatch}), status=${req.status} (match=${statusMatch})`);
        return typeMatch && statusMatch;
      })
      .filter((req) => {
          const sv = req.sosTargetVolunteer;
          const targetVolunteerId = sv && (sv._id || sv.id || sv) || null;

          // If assigned to current volunteer, show it
          const assignedTo = req.assignedTo;
          const assignedId = assignedTo && (assignedTo._id || assignedTo.id || assignedTo) || null;
          
          const shouldShow = assignedId ? String(assignedId) === String(volunteerId || '') : (!targetVolunteerId || String(targetVolunteerId) === String(volunteerId || ''));
          console.log(`[Filter] Request ${req._id || req.id}: sosTarget=${targetVolunteerId}, assignedTo=${assignedId}, volunteerId=${volunteerId}, show=${shouldShow}`);
          
          return shouldShow;
        })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    console.log('[Filter] Final pendingSosRequests count:', filtered.length);
    return filtered;
  }, [requests, volunteerId]);

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
        profilePhoto,
        skills: profileSkills
      });

      auth.login({
        token: auth.token,
        user: {
          ...auth.user,
          name: data.name,
          profilePhoto: data.profilePhoto || '',
          skills: data.skills || []
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
    const assignedTo = r.assignedTo;
    if (!assignedTo) return false;
    if (typeof assignedTo === 'string') return String(assignedTo) === String(myId);
    if (typeof assignedTo === 'object') {
      return String(assignedTo._id || assignedTo.id || assignedTo) === String(myId);
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

const mapRequests = selectedMapRequest
  ? displayedRequests.filter((req) => req._id === selectedMapRequest._id)
  : [];

  const isSosRequest = (req) => req.isSos === true || (req.type?.toLowerCase() === 'rescue' && Boolean(req.sosTargetVolunteer));

const sosRequests = displayedRequests.filter((req) => isSosRequest(req));
const normalRequests = displayedRequests.filter((req) => !isSosRequest(req));

  const renderRequestCard = (req) => {
    const isSos = isSosRequest(req);

    return (
      <Grid item xs={12} sm={6} md={4} key={req._id || req.id}>
        <Card
          variant="outlined"
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow:
              req.urgency?.toLowerCase() === 'high' &&
              (req.status || 'open') === 'open'
                ? 10
                : 4,
            borderRadius: 4,
            border: isSos
              ? '2px solid #d32f2f'
              : req.urgency?.toLowerCase() === 'high' &&
                (req.status || 'open') === 'open'
              ? '2px solid #d32f2f'
              : '1px solid rgba(0,0,0,0.12)',
            background: isSos
              ? 'linear-gradient(180deg, rgba(211,47,47,0.10) 0%, rgba(255,255,255,1) 45%)'
              : req.urgency?.toLowerCase() === 'high' && (req.status || 'open') === 'open'
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
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                  <Typography variant="h6" color="primary" fontWeight={700} sx={{ letterSpacing: 0.5 }}>
                    {req.type}
                  </Typography>
                  {isSos && (
                    <Chip
                      label="SOS"
                      color="error"
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                  )}
                </Stack>
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
            
            {/* Time Pending Indicator - Only for open/assigned requests */}
            {req.createdAt && req.status !== 'resolved' && (
              <Box sx={{
                p: 1,
                bgcolor: getTimePendingInfo(req.createdAt).color === 'success' ? '#e8f5e9' : 
                         getTimePendingInfo(req.createdAt).color === 'warning' ? '#fff3e0' : '#ffebee',
                borderRadius: 1.5,
                borderLeft: `3px solid ${
                  getTimePendingInfo(req.createdAt).color === 'success' ? '#2e7d32' :
                  getTimePendingInfo(req.createdAt).color === 'warning' ? '#f57c00' : '#d32f2f'
                }`,
                mb: 1
              }}>
                <Typography variant="caption" sx={{ 
                  fontWeight: 700,
                  color: getTimePendingInfo(req.createdAt).color === 'success' ? '#1b5e20' : 
                         getTimePendingInfo(req.createdAt).color === 'warning' ? '#e65100' : '#b71c1c'
                }}>
                  {getTimePendingInfo(req.createdAt).icon} {getTimePendingInfo(req.createdAt).text}
                </Typography>
              </Box>
            )}
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
            {((req.status || 'open') === 'open') &&
              isSos &&
              auth.user?.role === 'volunteer' &&
              (function() {
                const sv = req.sosTargetVolunteer;
                const targetId = sv && (sv._id || sv.id || sv) || '';
                return String(targetId) === String(auth.user?.id || auth.user?._id || '');
              })() && (
              <Button
                variant="contained"
                size="small"
                onClick={() => handleClaimSelf(req._id)}
                disabled={actionLoading}
                sx={{ fontWeight: 600 }}
              >
                Handle SOS
              </Button>
            )}
            {((req.status || 'open') === 'assigned') &&
              auth.user?.role === 'volunteer' &&
              auth.user?.id &&
              (req.assignedTo === auth.user.id || req.assignedTo?._id === auth.user.id) && (
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
    );
  };

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
      const assignedPayload = { _id: auth.user?.id || auth.user?._id || auth.user?.id, id: auth.user?.id || auth.user?._id || auth.user?.id, name: auth.user?.name };
      setRequests(prev => prev.map(r => (r._id === requestId || r.id === requestId) ? { ...r, status: 'assigned', assignedTo: assignedPayload } : r));
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

  const handleConfirmLogout = () => {
    setLogoutOpen(false);
    auth.logout();
  };

const labelZoomThreshold = 14;
const showPersistentLabels = mapZoom >= labelZoomThreshold;

  return (
    <>
      <Dialog open={logoutOpen} onClose={() => setLogoutOpen(false)}>
        <DialogTitle>Confirm Logout</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You will be signed out of your account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutOpen(false)}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleConfirmLogout}
          >
            Logout
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          p: { xs: 1, md: 4 },
          pl: { md: `${sidebarWidth + 32}px` },
          minHeight: '100vh',
          backgroundColor: 'background.default',
          display: 'flex',
          flexDirection: 'column',
          transition: 'padding-left 0.25s ease',
        }}
    >
      {!isMobile && (
        <Paper
          elevation={4}
          sx={{
            position: 'fixed',
            top: 16,
            left: 16,
            bottom: 16,
            width: sidebarWidth,
            borderRadius: 4,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {renderSidebarContent(sidebarCollapsed)}
        </Paper>
      )}

      {/* Top Navigation Bar with Hamburger Menu */}
      <AppBar
        position="static"
        color="default"
        elevation={0}
        sx={{
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={() => {
              if (isMobile) {
                setSidebarOpen(true);
              } else {
                setSidebarCollapsed((current) => !current);
              }
            }}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Volunteer Dashboard
          </Typography>

          <NotificationBell onViewAll={() => setNotificationsOpen(true)} />

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

      <Drawer
        anchor="left"
        open={sidebarOpen && isMobile}
        onClose={closeMobileSidebar}
        PaperProps={{
          sx: {
            width: 320,
            borderRadius: '0 24px 24px 0',
            bgcolor: 'background.paper',
            color: 'text.primary',
            overflow: 'hidden',
          },
        }}
      >
        {renderSidebarContent(false)}
      </Drawer>

  <Container sx={{ px: { xs: 1.5, sm: 2.5, md: 3.5 }, width: '100%' }}>
  <NotificationCenterDialog
    open={notificationsOpen}
    onClose={() => setNotificationsOpen(false)}
    title="Your Notifications"
  />
  <Dialog open={sosHandlerOpen} onClose={() => setSosHandlerOpen(false)} maxWidth="md" fullWidth>
    <DialogTitle sx={{ pb: 1 }}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <DirectionsRunIcon color="error" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Handle Emergency SOS Requests
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Accept and manage SOS alerts sent to you
          </Typography>
        </Box>
      </Stack>
    </DialogTitle>

    <DialogContent dividers sx={{ minHeight: 350 }}>
      <Stack spacing={2}>
        {pendingSosRequests.length === 0 ? (
          <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f7fa', borderRadius: 2 }}>
            <DirectionsRunIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography color="text.secondary" variant="body1" fontWeight={500}>
              No pending SOS requests
            </Typography>
            <Typography color="text.secondary" variant="body2">
              You'll receive notifications for new emergency alerts.
            </Typography>
          </Paper>
        ) : (
          pendingSosRequests.map((req) => (
                <Card
                  key={req._id}
                  variant="outlined"
                  sx={{
                    border: '2px solid #d32f2f',
                    bgcolor: 'rgba(211,47,47,0.06)',
                    borderRadius: 3
                  }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="flex-start" mb={2}>
                      <Box sx={{ fontSize: 40 }}>
                        <DirectionsRunIcon sx={{ fontSize: 40, color: 'error.main' }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" spacing={1} alignItems="center" mb={0.75} flexWrap="wrap">
                          <Typography variant="h6" color="error" fontWeight={700}>
                            EMERGENCY SOS
                          </Typography>
                          <Chip label="HIGH" color="error" size="small" sx={{ fontWeight: 700 }} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          <strong>Description:</strong> {req.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          <strong>Location:</strong> {req.location?.address || 'Check map for location'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                          Reported at: {new Date(req.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </Stack>

                    <Divider sx={{ my: 1.5 }} />

                    <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setSelectedRequest(req);
                          setDetailsDialogOpen(true);
                          setSosHandlerOpen(false);
                        }}
                      >
                        View Details
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        disabled={actionLoading}
                        onClick={async () => {
                          await handleClaimSelf(req._id);
                          setSosHandlerOpen(false);
                        }}
                        sx={{ fontWeight: 700 }}
                      >
                        {actionLoading ? 'Claiming...' : 'Accept & Claim'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
          ))
        )}
      </Stack>
    </DialogContent>

    <DialogActions sx={{ p: 2 }}>
      <Button onClick={() => setSosHandlerOpen(false)} variant="outlined">
        Close
      </Button>
    </DialogActions>
  </Dialog>
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
<Box ref={requestsSectionRef} sx={{ mb: 4, width: '100%', display: 'flex', flexDirection: 'column' }}>

<Paper
  elevation={1}
  sx={{
    p: 2.5,
    mb: 3,
    display: 'flex',
    gap: 2,
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.02)',
    borderRadius: 3
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

        {displayedRequests.length === 0 ? (
          <Paper elevation={1} sx={{ p: 5, textAlign: 'center', background: '#f5f7fa', borderRadius: 3, mt: 2 }}>
            <SentimentSatisfiedAltIcon sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No {view === 'assigned' ? 'active requests' : 'resolved requests'} found.
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ width: '100%' }}>
            {sosRequests.length > 0 && (
              <Box sx={{ width: '100%', mb: 4 }}>
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 3,
                    border: '2px solid rgba(211,47,47,0.3)',
                    background: 'linear-gradient(90deg, rgba(211,47,47,0.1) 0%, rgba(255,255,255,1) 100%)'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'error.main', fontSize: '1.1rem' }}>
                    🚨 SOS Requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Emergency requests targeted to you and prioritized for immediate handling.
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  {sosRequests.map((req) => renderRequestCard(req, 'sos'))}
                </Grid>
              </Box>
            )}

            {normalRequests.length > 0 && (
              <Box sx={{ width: '100%', mb: 4 }}>
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    borderRadius: 3,
                    border: '2px solid rgba(25,118,210,0.2)',
                    background: 'linear-gradient(90deg, rgba(25,118,210,0.08) 0%, rgba(255,255,255,1) 100%)'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main', fontSize: '1.1rem' }}>
                    📋 Normal Requests
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Standard active or resolved requests with the usual workflow.
                  </Typography>
                </Box>
                <Grid container spacing={3}>
                  {normalRequests.map((req) => renderRequestCard(req, 'normal'))}
                </Grid>
              </Box>
            )}
          </Box>
        )}
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

            <MapZoomTracker onZoomChange={setMapZoom} />
            
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
            {mapRequests
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
                  const requesterName =
                    req.name ||
                    req.requesterName ||
                    req.user?.name ||
                    req.requestedBy?.name ||
                    `Request ${String(req._id || req.id || '').slice(-4)}`;
                  const needTypeRaw = req.type || req.needType || 'other';
                  const needType =
                    typeof needTypeRaw === 'string' && needTypeRaw.length > 0
                      ? `${needTypeRaw.charAt(0).toUpperCase()}${needTypeRaw.slice(1)}`
                      : 'Other';

                  const freshLiveLocation = getFreshLiveLocation(req);
                  const anyLiveLocation = getAnyLiveLocation(req);
                  const liveSource = freshLiveLocation || anyLiveLocation;
                  const liveCoords = liveSource ? [liveSource.lng, liveSource.lat] : null;

                  // Straight-line distance from volunteer to the requester's
                  // current live position (if both are available), plus a
                  // small visual offset when the two markers would otherwise
                  // overlap so both remain visible.
                  let liveDistance = null;
                  let liveLatDisplay = null;
                  let liveLngDisplay = null;

                  if (liveCoords) {
                    const liveLat = liveSource.lat;
                    const liveLng = liveSource.lng;

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

                    // Prefer liveDistance when available (fresh moving user position),
                    // otherwise fall back to the fixed request location distance.
                    const displayDistance = (liveDistance != null && liveDistance !== undefined) ? liveDistance : distance;

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
                      const routeTarget = freshLiveLocation || anyLiveLocation || { lat: reqLat, lng: reqLng };
                      fetchRoute(routeTarget.lat, routeTarget.lng, req._id, { fitToRoute: false });
                      setRouteTargetLabel(freshLiveLocation ? 'requester current location' : anyLiveLocation ? 'requester last known' : 'request location');
                      setMapCenterOverride([routeTarget.lat, routeTarget.lng]);
                    } else {
                      // Even without volunteer location, still center on request
                      setMapCenterOverride([reqLat, reqLng]);
                    }
                  }
                }}
              >
                <LeafletTooltip
                  permanent={showPersistentLabels}
                  direction="top"
                  offset={[0, -30]}
                  className="request-map-label"
                >
                  <Box>
                    <Box className="map-label-title">{requesterName}</Box>
                    <Box className="map-label-meta request">Need: {needType} • Request</Box>
                  </Box>
                </LeafletTooltip>
                <Popup>
                  <Box sx={{ minWidth: 150, maxWidth: 200 }}>
                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                      🚨 {req.type || 'Request'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      ⚠ {req.urgency || 'N/A'}
                    </Typography>
                    {/* For active requests show straight-line distance; for resolved show status */}
                    {!isResolved && displayDistance && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {parseFloat(displayDistance) < 0.05
                          ? '📏 Very close to you (straight-line)'
                          : `📏 ~${displayDistance} km (straight-line)`}
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

                      // Use freshest available live source (fresh or any)
                      const liveSrc = freshLiveLocation || anyLiveLocation;

                      if (volunteerLocation && liveSrc) {
                        const liveLat = liveSrc.lat;
                        const liveLng = liveSrc.lng;
                        fetchRoute(liveLat, liveLng, req._id, { fitToRoute: false });
                        setRouteTargetLabel(freshLiveLocation ? 'requester current location' : 'requester last known');
                        setMapCenterOverride([liveLat, liveLng]);
                      } else if (liveSrc) {
                        // No volunteer location available but we have a live user position
                        setMapCenterOverride([liveSrc.lat, liveSrc.lng]);
                      } else {
                        // Fallback: center on the static request coordinates
                        setMapCenterOverride([reqLat, reqLng]);
                      }
                    }
                  }}
                >
                  <LeafletTooltip
                    permanent={showPersistentLabels}
                    direction="right"
                    offset={[14, -2]}
                    className="request-map-live-label"
                  >
                    <Box>
                      <Box className="map-label-title">{requesterName}</Box>
                      <Box className="map-label-meta live">Need: {needType} • Live</Box>
                    </Box>
                  </LeafletTooltip>
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
      {/* Activity moved to dedicated page (My Activity in sidebar) */}
      {/* Details Dialog (professional layout) */}
      <Dialog
        open={detailsDialogOpen}
        onClose={handleCloseDetailsDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2, pb: 1.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Request Details</Typography>
            <Typography variant="caption" color="text.secondary">Review request information and take appropriate action</Typography>
          </Box>
          {selectedRequest && (
            <Chip
              label={selectedRequest.urgency ? selectedRequest.urgency.toUpperCase() : 'UNKNOWN'}
              color={selectedRequest.urgency === 'high' ? 'error' : selectedRequest.urgency === 'medium' ? 'warning' : 'default'}
              size="small"
              sx={{ fontWeight: 800, textTransform: 'uppercase' }}
            />
          )}
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 2.5 }}>
          {selectedRequest ? (
            <Stack spacing={2.25}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 3,
                  bgcolor: 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
                  <Avatar sx={{ bgcolor: 'primary.main', width: 60, height: 60, fontWeight: 700 }}>
                    {selectedRequest.name ? selectedRequest.name.charAt(0).toUpperCase() : 'R'}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.15 }}>
                      {selectedRequest.name || 'Unknown'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                      {selectedRequest.description || 'No description provided'}
                    </Typography>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                      <Chip label={`Type: ${selectedRequest.type || '—'}`} size="small" variant="outlined" />
                      <Chip
                        label={`Status: ${selectedRequest.status || '—'}`}
                        size="small"
                        color={selectedRequest.status === 'assigned' ? 'success' : 'default'}
                        variant={selectedRequest.status === 'assigned' ? 'filled' : 'outlined'}
                      />
                      {selectedRequest.location?.address && (
                        <Chip label="Live location available" size="small" variant="outlined" />
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Box>

              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Contact
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {selectedRequest.contact || '—'}
                  </Typography>
                  {selectedRequest.status === 'assigned' && selectedRequest?.contact && auth.user?.id &&
                    (selectedRequest.assignedTo === auth.user.id || selectedRequest.assignedTo?._id === auth.user.id) && (
                      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          component="a"
                          href={`tel:${selectedRequest.contact}`}
                          startIcon={<PhoneIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
                        >
                          Call
                        </Button>

                        <Button
                          variant="outlined"
                          color="success"
                          size="small"
                          component="a"
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`https://wa.me/${selectedRequest.contact}?text=${whatsappMessage}`}
                          startIcon={<WhatsAppIcon />}
                          sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 999 }}
                        >
                          WhatsApp
                        </Button>
                      </Stack>
                    )}
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Location
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                    {selectedRequest.location?.address
                      ? selectedRequest.location.address
                      : (selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2
                          ? `Lat: ${selectedRequest.location.coordinates[1]}, Lng: ${selectedRequest.location.coordinates[0]}`
                          : 'N/A')}
                  </Typography>
                </Box>

                {selectedRequest.claimedBy && selectedRequest.claimedBy.name && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Claimed By
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 700, mt: 0.5 }}>
                      {selectedRequest.claimedBy.name}
                    </Typography>
                  </Box>
                )}

                <RequestStatusTimeline
                  request={selectedRequest}
                  title="Request progress"
                  compact
                />
              </Stack>
            </Stack>
          ) : (
            <Typography color="text.secondary">No request selected</Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          {selectedRequest && selectedRequest.status === 'assigned' && selectedRequest.location && selectedRequest.location.coordinates && selectedRequest.location.coordinates.length === 2 && volunteerLocation && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<DirectionsIcon />}
              onClick={() => {
                const reqLat = selectedRequest.location.coordinates[1];
                const reqLng = selectedRequest.location.coordinates[0];
                const liveTarget = getFreshLiveLocation(selectedRequest);
                setSelectedMapRequest(selectedRequest);
                const anyLive = getAnyLiveLocation(selectedRequest);
                fetchRoute((liveTarget?.lat ?? anyLive?.lat ?? reqLat), (liveTarget?.lng ?? anyLive?.lng ?? reqLng), selectedRequest._id, { fitToRoute: true });
                setRouteTargetLabel(liveTarget ? 'requester current location' : anyLive ? 'requester last known' : 'request location');
                setDetailsDialogOpen(false);
                setTimeout(() => {
                  if (mapSectionRef.current) {
                    mapSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 100);
              }}
              sx={{ mr: 1, textTransform: 'none', fontWeight: 700 }}
            >
              Show Route
            </Button>
          )}
          <Button onClick={handleCloseDetailsDialog} sx={{ textTransform: 'none' }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Public Reviews Dialog */}
      <Dialog
        open={publicReviewsOpen}
        onClose={() => setPublicReviewsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          Public Reviews
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            See the public feedback you have received from completed requests.
          </Typography>
          <VolunteerRatingCard volunteerId={volunteerId} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublicReviewsOpen(false)}>Close</Button>
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

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            Your Skills & Specialties
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
            Select your areas of expertise to help match you with requests
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
            {SKILL_OPTIONS.map((skill) => (
              <Box
                key={skill.id}
                onClick={() => {
                  setProfileSkills((prev) =>
                    prev.includes(skill.id)
                      ? prev.filter((s) => s !== skill.id)
                      : [...prev, skill.id]
                  );
                }}
                sx={{
                  p: 1.25,
                  px: 2,
                  borderRadius: 2,
                  border: `2px solid ${profileSkills.includes(skill.id) ? skill.color : '#ccc'}`,
                  bgcolor: profileSkills.includes(skill.id) ? skill.bgColor : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontWeight: profileSkills.includes(skill.id) ? 700 : 500,
                  color: profileSkills.includes(skill.id) ? skill.color : '#666',
                  fontSize: '13px',
                  '&:hover': {
                    borderColor: skill.color,
                    transform: 'translateY(-2px)',
                    boxShadow: `0 4px 8px rgba(0,0,0,0.1)`
                  }
                }}
              >
                {skill.label}
              </Box>
            ))}
          </Box>
        </Box>

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
<Footer
  text={`© ${new Date().getFullYear()} Local Crisis HelpChain · Volunteer Dashboard`}
  variant="volunteer"
  volunteerStatus={myAvailability ? 'available' : 'offline'}
  activeAssignments={activeAssignedRequests.length}
  resolvedAssignments={resolvedRequests.length}
/>
    </Container>
    </Box>
    </>
  );
}

export default VolunteerDashboard; 