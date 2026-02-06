import React, { useState } from 'react';
import { useNavigate, Navigate, Link } from "react-router-dom";
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import PasswordInput from '../components/PasswordInput';
import '../styles/auth.css';



export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const auth = useAuth();
  if(auth.user){
    return <Navigate to={`/dashboard/${auth.user.role}`} replace />
 }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', form);
      const { token, user } = res.data;
      auth.login({ token, user });

      navigate(`/dashboard/${user.role}`);

    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-hero">
        <div className="hero-copy">
          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-title">Local Crisis Help Chain</div>
          </div>
          <div className="hero-title">Welcome back</div>
          <div className="hero-sub">Coordinate help faster with secure access for users, NGOs and volunteers.</div>
        </div>
      </div>

      <div className="auth-pane">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-badge" />
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
    </div>
  );
}
