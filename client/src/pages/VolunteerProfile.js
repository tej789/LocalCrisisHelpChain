import React, { useState } from "react";
import { TextField } from "@mui/material";
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
  const [name, setName] = useState(auth.user?.name || "");
const email = auth.user?.email || "";

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
const handleSaveProfile = async () => {
  setLoading(true);
  try {
    const { data } = await api.patch("/api/volunteers/me/basic", {
      name
    });

    auth.login({
      token: auth.token,
      user: { ...auth.user, name: data.name }
    });

    showMessage("Name updated successfully");
  } catch (err) {
    showMessage(
      err.response?.data?.error || "Update failed",
      "error"
    );
  }
  setLoading(false);
};
 return (
  <Box
    sx={{
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#f4f6f8"
    }}
  >
    <Paper
      elevation={3}
      sx={{
        width: 360,
        p: 4,
        borderRadius: 3
      }}
    >
      {/* Header */}
      <Typography
        variant="h5"
        fontWeight={700}
        mb={0.5}
        textAlign="center"
      >
        Volunteer Profile
      </Typography>

      <Typography
        variant="body2"
        color="text.secondary"
        mb={3}
        textAlign="center"
      >
        Manage your account
      </Typography>

      {/* Name */}
      <TextField
        label="Name"
        fullWidth
        size="small"
        value={name}
        onChange={(e) => setName(e.target.value)}
        sx={{ mb: 2 }}
      />

      {/* Email */}
      <TextField
  label="Email"
  fullWidth
  size="small"
  value={email}
  disabled
  sx={{ mb: 3 }}
/>

      {/* Save Button */}
      <Button
        fullWidth
        variant="contained"
        size="medium"
        sx={{ mb: 3, fontWeight: 600 }}
        onClick={handleSaveProfile}
        disabled={loading}
      >
        Save Changes
      </Button>

      {/* Status */}
      <Box textAlign="center" mb={2}>
        <Typography variant="body2">
          Status:{" "}
          <span
            style={{
              color: availability ? "#2e7d32" : "#d32f2f",
              fontWeight: 600
            }}
          >
            {availability ? "Available" : "Offline"}
          </span>
        </Typography>
      </Box>

      {/* Availability Toggle */}
      <Button
        fullWidth
        variant="contained"
        size="medium"
        sx={{ mb: 2 }}
        onClick={handleToggleAvailability}
        disabled={loading}
      >
        {availability ? "Go Offline" : "Go Available"}
      </Button>

      {/* Location */}
      <Button
        fullWidth
        variant="outlined"
        size="medium"
        sx={{ mb: 2 }}
        onClick={handleUseLocation}
        disabled={loading}
      >
        Use My Location
      </Button>
    </Paper>

 <Snackbar
  open={snackbar.open}
  autoHideDuration={3000}
  onClose={handleSnackbarClose}
  anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
>
  <Alert
    severity={snackbar.severity}
    onClose={handleSnackbarClose}
    variant="filled"
    sx={{ width: "100%" }}
  >
    {snackbar.message}
  </Alert>
</Snackbar>
  </Box>
);
}

export default VolunteerProfile;
