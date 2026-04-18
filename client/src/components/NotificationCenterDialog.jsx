import React, { useMemo, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Paper,
  Stack,
  Chip,
  Pagination,
  CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications } from '../context/NotificationContext';

const PAGE_SIZE = 5;

function NotificationCenterDialog({ open, onClose, title = 'Notifications' }) {
  const { notifications, loading, markAsRead } = useNotifications();
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) {
      setPage(1);
    }
  }, [open]);

  const pageCount = Math.max(1, Math.ceil(notifications.length / PAGE_SIZE));

  const visibleNotifications = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return notifications.slice(start, start + PAGE_SIZE);
  }, [notifications, page]);

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <NotificationsIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            {title}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 280 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Typography color="text.secondary">
            No notifications yet.
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleNotifications.map((notification) => (
              <Paper
                key={notification._id}
                elevation={0}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: notification.isRead ? 'divider' : 'primary.light',
                  backgroundColor: notification.isRead ? 'background.paper' : 'rgba(25, 118, 210, 0.06)',
                  cursor: 'pointer'
                }}
              >
                <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="flex-start">
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700}>
                      {notification.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </Typography>
                  </Box>

                  {!notification.isRead && (
                    <Chip label="New" color="primary" size="small" />
                  )}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {notifications.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, notifications.length)} of {notifications.length}
        </Typography>

        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, nextPage) => setPage(nextPage)}
          color="primary"
          size="small"
          disabled={notifications.length === 0}
        />

        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NotificationCenterDialog;