import React, { useMemo, useState } from "react";
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Button
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { useNotifications } from "../context/NotificationContext";

function NotificationBell({ onViewAll }) {
  const { notifications, unreadCount, markAsRead, loading } = useNotifications();
  const [anchorEl, setAnchorEl] = useState(null);

  const open = Boolean(anchorEl);

  const recentNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleOpen}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 }
        }}
      >
        <Box px={2} py={1}>
          <Typography variant="subtitle1" fontWeight={600}>
            Notifications
          </Typography>
        </Box>

        <Divider />

        {loading ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={20} />
          </Box>
        ) : notifications.length === 0 ? (
          <MenuItem disabled>No notifications</MenuItem>
        ) : (
          recentNotifications.map((notification) => (
            <MenuItem
              key={notification._id}
              onClick={() => handleNotificationClick(notification)}
              sx={{
                alignItems: "flex-start",
                backgroundColor: notification.isRead ? "inherit" : "#f0f7ff",
                whiteSpace: 'normal'
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {notification.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {notification.message}
                </Typography>
                <Typography
                  variant="caption"
                  display="block"
                  color="text.secondary"
                  mt={0.5}
                >
                  {new Date(notification.createdAt).toLocaleString()}
                </Typography>
              </Box>
            </MenuItem>
          ))
        )}

        {notifications.length > 5 && (
          <>
            <Divider />
            <Box p={1.5} display="flex" justifyContent="center">
              <Button
                size="small"
                onClick={() => {
                  handleClose();
                  onViewAll?.();
                }}
              >
                View all notifications
              </Button>
            </Box>
          </>
        )}
      </Menu>
    </>
  );
}

export default NotificationBell;