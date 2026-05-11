import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Alert, Chip } from '@mui/material';
import api from '../api/axios';
import { getSkillConfig } from '../utils/skillsConfig';

export default function AssignVolunteerDialog({ open, requestId, requestLocation, onClose, onAssigned })
 {
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [error, setError] = useState('');
  const [volunteers, setVolunteers] = useState([]);
  const [volunteerId, setVolunteerId] = useState('');

  useEffect(() => {
    if (!open) return;
    setListLoading(true);
    setError('');
    let url = '/api/volunteers?verified=true&available=true';

    if (requestLocation?.coordinates?.length === 2) {
      const [lng, lat] = requestLocation.coordinates;
      url += `&lng=${lng}&lat=${lat}`;
    }

    api.get(url)

      .then(res => {
        const arr = Array.isArray(res.data) ? res.data : [];
        setVolunteers(arr);
      })
      .catch(() => {
        setError('Failed to load volunteers');
        setVolunteers([]);
      })
      .finally(() => setListLoading(false));
  },[open, requestLocation]);

  const handleAssign = async () => {
    if (!volunteerId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.put(`/api/requests/${requestId}/assign`, { volunteerId });
      if (onAssigned) onAssigned(data);
      if (onClose) onClose();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) setError('You are not authorized to assign this request.');
      else if (status === 400) setError(err.response?.data?.error || 'Invalid request.');
      else if (status === 404) setError(err.response?.data?.error || 'Request or volunteer not found.');
      else setError('Failed to assign request.');
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || listLoading || !volunteerId;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, textAlign: 'center' }}>Assign Verified Volunteer</DialogTitle>
      <DialogContent>
        {listLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : volunteers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
            No verified volunteers available
          </Typography>
        ) : (
          <Box sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel id="assign-volunteer-label">Volunteer</InputLabel>
              <Select
                labelId="assign-volunteer-label"
                value={volunteerId}
                label="Volunteer"
                onChange={(e) => setVolunteerId(e.target.value)}
              >
                {volunteers.map(v => (
                  <MenuItem key={v._id} value={v._id} sx={{ display: 'block', py: 1.5 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 0.75 }}>
                      {v.name}
                      {v.distance !== undefined
                        ? ` — ${v.distance.toFixed(1)} km`
                        : ''}
                    </Typography>
                    {v.skills && v.skills.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                        {v.skills.map(skill => {
                          const config = getSkillConfig(skill);
                          return (
                            <Chip
                              key={skill}
                              label={config.label}
                              size="small"
                              sx={{
                                height: '22px',
                                fontSize: '11px',
                                bgcolor: config.bgColor,
                                color: config.color,
                                fontWeight: 700
                              }}
                            />
                          );
                        })}
                      </Box>
                    )}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, pt: 0 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button onClick={handleAssign} variant="contained" disabled={disabled}>
          {loading ? 'Assigning…' : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
