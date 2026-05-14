import React, { useMemo } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import { formatRequestTimestamp, getLatestRequestActivity, getRequestStatusMeta } from '../utils/requestProgress';

function RequestActivityFeed({
  requests = [],
  title = 'Recent activity',
  subtitle = 'Latest request state changes across the dashboard.',
  limit = 5,
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

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 3,
        borderColor: 'divider',
        background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)'
      }}
    >
      <Stack spacing={1.5}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventNoteOutlinedIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        </Box>

        <Stack spacing={1.25}>
          {entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {emptyText}
            </Typography>
          ) : (
            entries.map(({ id, request, activity }) => {
              const meta = getRequestStatusMeta(activity.status);
              const assignedName = request?.assignedTo?.name || request?.claimedBy?.name || '';
              const detail = activity.status === 'assigned'
                ? assignedName
                  ? `Assigned to ${assignedName}`
                  : 'Volunteer assigned'
                : activity.status === 'resolved'
                  ? 'Marked resolved'
                  : activity.note || meta.description;

              return (
                <Box
                  key={id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'rgba(248, 250, 252, 0.8)'
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {request?.title || request?.type || 'Request'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                        {detail}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.15 }}>
                        {formatRequestTimestamp(activity.timestamp)}
                      </Typography>
                    </Box>
                    <Chip label={meta.label} size="small" color={meta.color === 'default' ? 'default' : meta.color} sx={{ fontWeight: 700 }} />
                  </Stack>
                </Box>
              );
            })
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default RequestActivityFeed;
