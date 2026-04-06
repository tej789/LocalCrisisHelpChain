import React, { useState } from "react";
import api from "../api/axios";

import { useNavigate } from "react-router-dom";
import PasswordInput from '../components/PasswordInput';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Send OTP
  const sendOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post(
        "/api/auth/forgot-password",
        { email }
      );
      
      setSuccess(res.data.message || "OTP sent to your email");
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Error sending OTP");
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !password) {
      setError("Please enter OTP and new password");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post(
  "/api/auth/reset-password",
  { email, otp, newPassword: password }
);

      setSuccess(res.data.message || "Password reset successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell" style={{
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
            <div className="brand-badge">
              <img src="/lchc-logo.svg" alt="LCHC logo" className="brand-logo" />
            </div>
            <div className="brand-title">LCHC</div>
          </div>

          <div className="auth-title">Forgot Password</div>
          <div className="auth-sub">
            {otpSent 
              ? "Enter the OTP sent to your email and set a new password"
              : "Enter your email to receive a password reset OTP"}
          </div>

          <form className="form" onSubmit={otpSent ? resetPassword : sendOtp}>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}

            <div className="form-group">
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={otpSent}
                required
              />
            </div>

            {otpSent && (
              <>
                <div className="form-group">
                  <label className="label">OTP</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="label">New Password</label>
                  <PasswordInput
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <div className="caption">Must be at least 6 characters</div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              className="button"
              disabled={loading}
            >
              {loading 
                ? 'Processing...' 
                : otpSent 
                  ? 'Reset Password' 
                  : 'Send OTP'}
            </button>

            <div className="helper">
              Remember your password?{' '}
              <span 
                style={{ 
                  color: 'var(--primary)', 
                  cursor: 'pointer',
                  fontWeight: 500 
                }}
                onClick={() => navigate('/login')}
              >
                Sign in
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
