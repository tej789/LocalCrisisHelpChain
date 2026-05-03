import React, { useState } from 'react';
import { Fab, Box, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack } from '@mui/material';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import api from '../api/axios';
import axios from 'axios';

export default function SosButton() {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [successState, setSuccessState] = useState(false);
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'info' });

  // Handle countdown logic
  React.useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // Auto-send when countdown reaches 0
  React.useEffect(() => {
    if (countdown === 0 && confirmOpen) {
      const timer = setTimeout(() => {
        sendSOS();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [countdown, confirmOpen]);

  // Success state cooldown: lock button for 3 seconds after successful send
  React.useEffect(() => {
    if (!successState) return;
    const timer = setTimeout(() => {
      setSuccessState(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successState]);

  const handleClick = () => {
    // Prevent click if already in process or locked in success state
    if (loading || successState || confirmOpen) return;
    setCountdown(3);
    setConfirmOpen(true);
  };

  const handleCancel = () => {
    setCountdown(0);
    setConfirmOpen(false);
  };

  const sendSOS = async () => {
    if (!navigator.geolocation) {
      setSnack({ open: true, message: 'Geolocation not supported in this browser.', severity: 'error' });
      setConfirmOpen(false);
      return;
    }

    setLoading(true);
    setConfirmOpen(false);

    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;

        // Prefer configured API base, but fall back to local backend during development
        const base = (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL !== '') ? process.env.REACT_APP_API_URL : (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');
        const url = `${base}/api/requests/sos`;
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.post(url, { latitude, longitude, message: 'SOS: immediate assistance required' }, { headers });
        
        // Success state locks button for 3 seconds
        setSuccessState(true);
        setSnack({ open: true, message: `SOS sent — alerted ${res.data.alerted} volunteer(s)`, severity: 'success' });
      } catch (err) {
        console.error('SOS error:', err);
        setSnack({ open: true, message: err?.response?.data?.error || 'Failed to send SOS', severity: 'error' });
      } finally {
        setLoading(false);
      }
    }, (err) => {
      setLoading(false);
      setSnack({ open: true, message: 'Failed to get location. Please allow location access.', severity: 'error' });
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Fab
          color={successState ? 'success' : 'error'}
          aria-label="sos"
          onClick={handleClick}
          disabled={loading || confirmOpen || successState}
          sx={{ width: 56, height: 56, transition: 'all 0.3s ease' }}
        >
          {loading ? (
            <CircularProgress color="inherit" size={22} />
          ) : successState ? (
            <Typography sx={{ fontSize: '1.5rem' }}>✓</Typography>
          ) : (
            <LocalHospitalIcon />
          )}
        </Fab>
      </Box>

      <Dialog open={confirmOpen} onClose={handleCancel} maxWidth="xs" fullWidth disableEscapeKeyDown>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>
          Confirm Emergency SOS
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="body1" color="text.primary">
              You are about to send an SOS. Nearby volunteers will be alerted immediately.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Alert will be sent in:
            </Typography>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '3rem',
                fontWeight: 700,
                color: countdown === 0 ? 'success.main' : 'error.main',
                minHeight: '80px',
                borderRadius: 2,
                bgcolor: 'action.hover',
              }}
            >
              {countdown > 0 ? countdown : '✓'}
            </Box>
            <Typography variant="caption" color="text.secondary" align="center">
              {countdown > 0
                ? 'Cancel if triggered by mistake'
                : 'Sending your location...'}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} disabled={countdown === 0} variant="outlined">
            Cancel
          </Button>
          {countdown === 0 && (
            <CircularProgress size={24} />
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={6000}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
      >
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))} sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
