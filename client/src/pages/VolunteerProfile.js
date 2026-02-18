import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Snackbar,
  Alert
} from "@mui/material";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function VolunteerProfile() {
  const auth = useAuth();

  const [availability, setAvailability] = useState(
    auth.user?.isAvailable || false
  );

  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success"
  });

  const showMessage = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  /* =========================
     Toggle Availability
  ========================= */
  const handleToggleAvailability = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch(
        "/api/volunteers/me/availability",
        { isAvailable: !availability }
      );

      setAvailability(data.isAvailable);

      // update auth context
      auth.login({
        token: auth.token,
        user: { ...auth.user, isAvailable: data.isAvailable }
      });

      showMessage(
        data.isAvailable
          ? "You are now Available"
          : "You are now Offline"
      );
    } catch {
      showMessage("Failed to update availability", "error");
    }
    setLoading(false);
  };

  /* =========================
     Use My Location
  ========================= */
  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      showMessage("Geolocation not supported", "error");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          await api.patch("/api/volunteers/me/location", {
            latitude,
            longitude
          });

          showMessage("Location updated successfully");
        } catch {
          showMessage("Location update failed", "error");
        }

        setLoading(false);
      },
      () => {
        showMessage("Permission denied", "error");
        setLoading(false);
      }
    );
  };

  return (
    <Box p={4} display="flex" justifyContent="center">
      <Paper sx={{ p: 4, width: 400, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h5" mb={2} fontWeight={600}>
          Volunteer Profile
        </Typography>

        <Typography mb={2}>
          Status: <b>{availability ? "Available" : "Offline"}</b>
        </Typography>

        <Button
          fullWidth
          variant="contained"
          sx={{ mb: 2 }}
          onClick={handleToggleAvailability}
          disabled={loading}
        >
          {availability ? "Go Offline" : "Go Available"}
        </Button>

        <Button
          fullWidth
          variant="outlined"
          sx={{ mb: 2 }}
          onClick={handleUseLocation}
          disabled={loading}
        >
          Use My Location
        </Button>

        <Button
          fullWidth
          color="error"
          variant="contained"
          onClick={auth.logout}
        >
          Logout
        </Button>
      </Paper>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default VolunteerProfile;
