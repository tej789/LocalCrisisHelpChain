import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email] = useState(location.state?.email || "");
  const [otp, setOtp] = useState("");

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
  });

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    setTimeout(() => {
      setSnackbar({ open: false, message: "" });
    }, 2000);
  };

  const verifyOtp = async () => {
    console.log("Sending OTP request:", email, otp);

    if (!email || !otp) {
      showSnackbar("Please enter OTP");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/verify-otp",
        { email, otp }
      );

      console.log("Verify success:", res.data);
      showSnackbar(res.data.message);

      setTimeout(() => navigate("/login"), 1500);

    } catch (err) {
      console.log("Verify error:", err.response?.data || err.message);
      showSnackbar("Invalid OTP");
    }
  };

  const resendOtp = async () => {
    if (!email) {
      showSnackbar("Email missing");
      return;
    }

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/resend-otp",
        { email }
      );

      showSnackbar(res.data.message);
    } catch (err) {
      showSnackbar("Error sending OTP");
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: 'var(--bg)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '28rem',
        padding: '2rem',
        boxSizing: 'border-box'
      }}>
        <div className="auth-card">

          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-title">LCHC</div>
          </div>

          <div className="auth-title">Verify OTP</div>
          <div className="auth-sub">
            Enter the OTP sent to your email
          </div>

          <div className="form">

            <div>
              <div className="label">Email</div>
              <input
                className="input"
                type="email"
                value={email}
                readOnly
              />
            </div>

            <div>
              <div className="label">OTP</div>
              <input
                className="input"
                type="text"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <button
              className="button"
              onClick={verifyOtp}
            >
              Verify OTP
            </button>
            <div className="helper">
              Didn’t receive OTP?{" "}
              <span
                style={{ cursor: "pointer", color: "#2563eb" }}
                onClick={resendOtp}
              >
                Resend OTP
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  snackbar: {
    position: "fixed",
    bottom: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#323232",
    color: "white",
    padding: "12px 24px",
    borderRadius: "6px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
  },
};

export default VerifyOtp;
