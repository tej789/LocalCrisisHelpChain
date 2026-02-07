import React, { useState } from 'react';
import { TextField, Button, MenuItem, Card, CardContent, Typography, Grid, Alert, Box } from '@mui/material';
import api from '../api/axios';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import HomeIcon from '@mui/icons-material/Home';

// Fix Leaflet default icon URLs for CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});
const requestTypes = [
  'Food',
  'Medicine',
  'Shelter',
  'Rescue',
  'Other',
];
const urgencies = ['high', 'medium', 'low'];

function SubmitRequest() {
  const [form, setForm] = useState({
    name: '',
    contact: '',
    latitude: '',
    longitude: '',
    address: '',
    type: '',
    urgency: '',
    description: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setError('');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocating(false);
      },
      (geoErr) => {
        let msg = 'Unable to retrieve your location.';
        if (geoErr?.code === 1) msg = 'Location permission denied. Please allow access or use the address fallback.';
        if (geoErr?.code === 2) msg = 'Position unavailable. Try again or use the address fallback.';
        if (geoErr?.code === 3) msg = 'Location request timed out. Try again or use the address fallback.';
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleGeocodeAddress = async () => {
    setError('');
    if (!form.address || form.address.trim().length < 3) {
      setError('Please enter an address to geocode.');
      return;
    }
    setGeocoding(true);
    try {
      const q = encodeURIComponent(form.address);
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}`, {
        headers: { 'Accept': 'application/json' }
      });
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        setForm(prev => ({ ...prev, latitude: lat, longitude: lon, address: display_name || prev.address }));
        setError('');
      } else {
        setError('Could not find coordinates for the entered address.');
      }
    } catch (e) {
      setError('Address lookup failed. Please try again.');
    }
    setGeocoding(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    // Simple validation
    if (!form.name || !form.contact || !form.latitude || !form.longitude || !form.type || !form.urgency || !form.description) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
   try {
  const payload = {
    name: form.name,
    contact: form.contact,
    location: {
      type: 'Point',
      coordinates: [
        parseFloat(form.longitude),
        parseFloat(form.latitude)
      ],
      address: form.address,
    },
    type: form.type,
    urgency: form.urgency,
    description: form.description,
  };

  await api.post('/api/requests', payload);

  setSuccess('Request submitted successfully!');

  setForm({
    name: '',
    contact: '',
    latitude: '',
    longitude: '',
    address: '',
    type: '',
    urgency: '',
    description: '',
  });

} catch (err) {
  setError(
    err.response?.data?.error ||
    'Failed to submit request.'
  );
} finally {
  setLoading(false);
}
};
  // Map preview logic
const hasLatLng =
  form.latitude !== '' &&
  form.longitude !== '' &&
  !isNaN(parseFloat(form.latitude)) &&
  !isNaN(parseFloat(form.longitude));

  const mapCenter = hasLatLng ? [parseFloat(form.latitude), parseFloat(form.longitude)] : [20.5937, 78.9629];

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
      <Card sx={{ maxWidth: 500, width: '100%', boxShadow: 6, borderRadius: 3, p: 1 }}>
        <CardContent>
          <Typography variant="h4" color="primary" fontWeight={700} align="center" gutterBottom>
            Request Help
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" align="center" sx={{ mb: 3 }}>
            Fill out the form below to request urgent assistance. Your information will be kept confidential and only shared with authorized volunteers and NGOs.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          <form onSubmit={handleSubmit} autoComplete="off">
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Your Name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <CheckCircleIcon color="primary" />
                      </Box>
                    )
                  }}
                  helperText={!form.name ? 'Name is required' : ' '}
                  error={!form.name}
                />
              </Grid>
              <Grid item xs={12}>
  <TextField
    label="Contact Number"
    name="contact"
    value={form.contact}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, ""); // only numbers
      if (value.length <= 10) {
        setForm({ ...form, contact: value });
      }
    }}
    fullWidth
    required
    inputProps={{ maxLength: 10 }}
    InputProps={{
      startAdornment: (
        <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
          <LocalHospitalIcon color="primary" />
        </Box>
      )
    }}
    helperText={
      !form.contact
        ? "Contact is required"
        : form.contact.length !== 10
        ? "Enter valid 10-digit number"
        : " "
    }
    error={!form.contact || form.contact.length !== 10}
  />
</Grid>

              <Grid item xs={6}>
                <TextField
                  label="Latitude"
                  name="latitude"
                  value={form.latitude}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <DirectionsRunIcon color="primary" />
                      </Box>
                    )
                  }}
                  helperText={!form.latitude ? 'Latitude is required' : ' '}
                  error={!form.latitude}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Longitude"
                  name="longitude"
                  value={form.longitude}
                  onChange={handleChange}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <DirectionsRunIcon color="primary" />
                      </Box>
                    )
                  }}
                  helperText={!form.longitude ? 'Longitude is required' : ' '}
                  error={!form.longitude}
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" color="secondary" onClick={handleGeolocate} sx={{ mb: 1, width: '100%' }} disabled={locating}
                  startIcon={locating ? <span className="MuiCircularProgress-root MuiCircularProgress-indeterminate" style={{ width: 20, height: 20 }}><svg viewBox="22 22 44 44"><circle className="MuiCircularProgress-circle" cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" /></svg></span> : null}
                >
                  {locating ? 'Detecting...' : 'Auto-detect My Location'}
                </Button>
              </Grid>
              {/* Map Preview */}
              <Grid item xs={12}>
                <Box sx={{ height: 180, borderRadius: 2, overflow: 'hidden', mb: 2, boxShadow: 2, border: '1px solid #e0e0e0' }}>
                  <MapContainer center={mapCenter} zoom={hasLatLng ? 14 : 5} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    {hasLatLng && <Marker position={mapCenter} />}
                  </MapContainer>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address (optional)"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ mr: 1, display: 'flex', alignItems: 'center' }}>
                        <HomeIcon color="primary" />
                      </Box>
                    )
                  }}
                />
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleGeocodeAddress} disabled={geocoding}>
                    {geocoding ? 'Locating...' : 'Use Address to Locate'}
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Type of Help"
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  fullWidth
                  required
                  helperText={!form.type ? 'Select a help type' : ' '}
                  error={!form.type}
                >
                  {requestTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  label="Urgency"
                  name="urgency"
                  value={form.urgency}
                  onChange={handleChange}
                  fullWidth
                  required
                  helperText={!form.urgency ? 'Select urgency' : ' '}
                  error={!form.urgency}
                >
                  {urgencies.map((urgency) => (
                    <MenuItem key={urgency} value={urgency}>{urgency}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Describe your need"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={2}
                  required
                  helperText={!form.description ? 'Description is required' : ' '}
                  error={!form.description}
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary" fullWidth disabled={loading}
                  startIcon={loading ? <span className="MuiCircularProgress-root MuiCircularProgress-indeterminate" style={{ width: 20, height: 20, marginRight: 8 }}><svg viewBox="22 22 44 44"><circle className="MuiCircularProgress-circle" cx="44" cy="44" r="20.2" fill="none" strokeWidth="3.6" /></svg></span> : null}
                >
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}

export default SubmitRequest;
