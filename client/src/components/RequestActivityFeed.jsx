import React, { useMemo } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { getLatestRequestActivity, getRequestStatusMeta } from '../utils/requestProgress';

function RequestActivityFeed({
  requests = [],
  title = 'Live request activity',
  subtitle = 'Recent state changes across the requests currently visible to you.',
  limit = 15,
  emptyText = 'No recent activity.'
}) {
  const entries = useMemo(() => {
    return requests
      .map((request) => {
        const activity = getLatestRequestActivity(request);
        return {
          id: request?._id || request?.id,
          request,
          activity,
          sortTimestamp: activity?.sortTimestamp || 0
        };
      })
      .filter((entry) => entry.id)
      .sort((left, right) => right.sortTimestamp - left.sortTimestamp)
      .slice(0, limit);
  }, [requests, limit]);

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>

        {/* Activity List */}
        <Stack spacing={1.5}>
          {entries.length === 0 ? (
            <Paper
              sx={{
                p: 3,
                textAlign: 'center',
                backgroundColor: '#fafbfc',
                borderRadius: 2,
                border: '1px solid #e8ecf1'
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {emptyText}
              </Typography>
            </Paper>
          ) : (
            entries.map(({ id, request, activity }) => {
              const meta = getRequestStatusMeta(activity.status);
              const assignedName = request?.assignedTo?.name || request?.claimedBy?.name || '';
              const requesterName = request?.name || 'Requester';
              const typeLabel = request?.type?.charAt(0).toUpperCase() + request?.type?.slice(1) || 'Request';
              const description = request?.description ? request.description.substring(0, 100) + (request.description.length > 100 ? '...' : '') : '';
              const location = request?.location?.address || 'Location not specified';

              const statusDetail = activity.status === 'assigned'
                ? assignedName
                  ? `Assigned to ${assignedName}`
                  : 'Volunteer assigned'
                : activity.status === 'resolved'
                  ? 'Marked resolved'
                  : activity.note || meta.description;

              return (
                <Paper
                  key={id}
                  elevation={0}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid #e8ecf1',
                    backgroundColor: '#ffffff',
                    overflow: 'hidden'
                  }}
                >
                  <Stack>
                    {/* Top Row: Title and Chips */}
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2} sx={{ mb: 1.5 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ fontSize: '0.95rem', flex: 1 }}>
                          {request?.title || typeLabel}
                        </Typography>
                      </Stack>

                      {/* Chips Row */}
                      <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                        <Chip
                          label={typeLabel}
                          size="small"
                          variant="outlined"
                          sx={{
                            height: 26,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderColor: '#d0d9e8'
                          }}
                        />
                        {request?.urgency && request.urgency !== 'low' && (
                          <Chip
                            label={request.urgency.toUpperCase()}
                            size="small"
                            color={request?.urgency === 'high' ? 'error' : 'warning'}
                            sx={{
                              height: 26,
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          />
                        )}
                        {request?.isSos && (
                          <Chip
                            label="SOS"
                            size="small"
                            color="error"
                            sx={{
                              height: 26,
                              fontSize: '0.75rem',
                              fontWeight: 700
                            }}
                          />
                        )}
                        <Chip
                          label={meta.label}
                          size="small"
                          color={meta.color === 'default' ? 'default' : meta.color}
                          sx={{
                            height: 26,
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        />
                      </Stack>
                    </Box>

                    {/* Requester and Location */}
                    <Box sx={{ px: 2, py: 1.5, backgroundColor: '#fafbfc', borderTop: '1px solid #f0f2f5' }}>
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#8a92a0', mb: 0.5, letterSpacing: '0.3px' }}>
                            Requester
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {requesterName}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#8a92a0', mb: 0.5, letterSpacing: '0.3px' }}>
                            Location
                          </Typography>
                          <Typography variant="body2" fontWeight={600} noWrap title={location}>
                            {location}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>

                    {/* Description */}
                    {description && (
                      <Box sx={{ px: 2, py: 1.5, borderLeft: '3px solid #e8ecf1', backgroundColor: '#fafbfc' }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          {description}
                        </Typography>
                      </Box>
                    )}

                    {/* Status and Time */}
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f0f2f5', backgroundColor: '#ffffff' }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: meta.color === 'success' ? 'success.main' : meta.color === 'warning' ? 'warning.main' : meta.color === 'info' ? 'info.main' : 'text.primary' }}>
                        {statusDetail}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.75rem' }}>
                        {formatRelativeTime(activity.timestamp)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              );
            })
          )}
        </Stack>
      </Stack>
    </Box>
  );
}

export default RequestActivityFeed;
