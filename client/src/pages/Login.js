import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from "react-router-dom";
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import '../styles/auth.css';



export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pendingAuth, setPendingAuth] = useState(null);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [locationPromptLoading, setLocationPromptLoading] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();
const token = localStorage.getItem("token");

  const requiresLocationPermission = (role) => role === 'user' || role === 'volunteer';

  const requestBrowserLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => resolve(position),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });

  const finalizeLogin = (authData) => {
    auth.login(authData);

    if (authData.user.role === "admin") {
      navigate("/admin");
    } else {
      navigate(`/dashboard/${authData.user.role}`);
    }
  };

  const handleContinueWithoutLocation = () => {
    if (!pendingAuth) return;
    setLocationConsentOpen(false);
    setInfo('You can enable location later from your browser if needed.');
    finalizeLogin(pendingAuth);
    setPendingAuth(null);
  };

  const handleAllowLocation = async () => {
    if (!pendingAuth) return;

    setLocationPromptLoading(true);
    setError('');
    try {
      const position = await requestBrowserLocation();
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date().toISOString()
      };

      sessionStorage.setItem('lchcLastKnownLocation', JSON.stringify(location));
      setInfo(`Location access enabled. Accuracy about ${Math.round(location.accuracy || 0)}m.`);
    } catch (err) {
      if (err?.code === 1) {
        setInfo('Location permission was denied. You can continue and enable it later if needed.');
      } else if (err?.code === 3) {
        setInfo('Location request timed out. You can continue and retry from the dashboard.');
      } else {
        setInfo('Location could not be detected right now. You can continue without it.');
      }
    } finally {
      setLocationConsentOpen(false);
      finalizeLogin(pendingAuth);
      setPendingAuth(null);
      setLocationPromptLoading(false);
    }
  };

if (auth.user && token) {
  if (auth.user.role === "admin") {
    return <Navigate to="/admin" replace />;
  }
  return <Navigate to={`/dashboard/${auth.user.role}`} replace />;
}
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const res = await api.post('/api/auth/login', form);
      const { token, user } = res.data;
      const authData = { token, user };

      if (requiresLocationPermission(user.role)) {
        setPendingAuth(authData);
        setLocationConsentOpen(true);
        return;
      }

      finalizeLogin(authData);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-copy">
          <div className="brand">
            <div className="brand-badge">
              <img src="/lchc-logo.svg" alt="Local Crisis Help Chain logo" className="brand-logo" />
            </div>
            <div className="brand-title">Local Crisis Help Chain</div>
          </div>
          <div className="hero-title">Welcome back</div>
          <div className="hero-sub">Coordinate help faster with secure access for users, NGOs and volunteers.</div>
        </div>
      </div>

      <div className="auth-pane">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-badge">
              <img src="/lchc-logo.svg" alt="LCHC logo" className="brand-logo" />
            </div>
            <div className="brand-title">LCHC</div>
          </div>
          <div className="auth-title">Sign in</div>
          <div className="auth-sub">Access your dashboard and requests.</div>

          <form className="form" onSubmit={handleSubmit}>
            <div>
              <div className="label">Email</div>
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@gmail.com"
                required
              />
            </div>

            <div>
              <div className="label">Password</div>
              <PasswordInput
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="error">{error}</p>}
            {info && <p className="success">{info}</p>}

            <button type="submit" className="button">Sign in</button>
            <div style={{ marginTop: "10px" }}>
  <Link to="/forgot-password">Forgot Password?</Link>
</div>
          </form>

          <div className="helper">
            Don’t have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>

      {locationConsentOpen && (
        <div className="auth-modal-backdrop" role="presentation">
          <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="location-permission-title">
            <div className="auth-modal-header">
              <div>
                <div className="auth-modal-eyebrow">Location access</div>
                <div className="auth-modal-title" id="location-permission-title">Allow location for live tracking?</div>
              </div>
            </div>

            <p className="auth-modal-copy">
              Enabling location helps the app show more accurate request tracking and nearby support updates.
              You can continue without it and turn it on later if needed.
            </p>

            <div className="auth-modal-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={handleContinueWithoutLocation}
                disabled={locationPromptLoading}
              >
                Continue without location
              </button>
              <button
                type="button"
                className="button"
                onClick={handleAllowLocation}
                disabled={locationPromptLoading}
              >
                {locationPromptLoading ? 'Requesting...' : 'Allow location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
