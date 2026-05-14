import React, { useMemo } from 'react';
import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import { formatRequestTimestamp, getRequestProgress, getRequestStatusMeta } from '../utils/requestProgress';

const stepIcons = {
  open: <PendingActionsOutlinedIcon fontSize="small" />,
  assigned: <AccessTimeOutlinedIcon fontSize="small" />,
  resolved: <CheckCircleOutlineIcon fontSize="small" />
};

function RequestStatusTimeline({ request, title = 'Request timeline', compact = false }) {
  const { timeline, progressPercent, currentMeta } = useMemo(() => getRequestProgress(request), [request]);

  if (!request) {
    return null;
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        borderRadius: 3,
        borderColor: 'divider',
        background: 'linear-gradient(180deg, rgba(248, 250, 252, 0.96) 0%, rgba(255, 255, 255, 0.98) 100%)'
      }}
    >
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentMeta.description}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={`${progressPercent}% complete`}
            color={currentMeta.color === 'default' ? 'default' : currentMeta.color}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        <Box
          sx={{
            height: 8,
            borderRadius: 999,
            backgroundColor: 'rgba(148, 163, 184, 0.18)',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              width: `${progressPercent}%`,
              height: '100%',
              borderRadius: 999,
              background: 'linear-gradient(90deg, #2563eb 0%, #16a34a 100%)'
            }}
          />
        </Box>

        <Stack spacing={1.25}>
          {timeline.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No timeline entries yet.
            </Typography>
          ) : (
            timeline.map((step, index) => {
              const meta = getRequestStatusMeta(step.status);
              const isLast = index === timeline.length - 1;

              return (
                <Stack key={`${step.status}-${step.timestamp || index}`} direction="row" spacing={1.5} alignItems="flex-start">
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      bgcolor: `${meta.color}.light`,
                      color: `${meta.color}.dark`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.7)'
                    }}
                  >
                    {stepIcons[step.status] || <PendingActionsOutlinedIcon fontSize="small" />}
                  </Box>

                  <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                      <Chip label={meta.label} size="small" color={meta.color === 'default' ? 'default' : meta.color} sx={{ fontWeight: 700 }} />
                      <Typography variant="caption" color="text.secondary">
                        {formatRequestTimestamp(step.timestamp)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {step.note || meta.description}
                    </Typography>
                    {(step.actorName || step.source) && (
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                        {step.actorName ? `${step.actorName}` : 'System'}{step.source ? ` · ${step.source}` : ''}
                      </Typography>
                    )}
                  </Box>
                </Stack>
              );
            })
          )}
        </Stack>
      </Stack>
    </Paper>
  );
}

export default RequestStatusTimeline;
