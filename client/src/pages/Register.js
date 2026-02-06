import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import PasswordInput from '../components/PasswordInput';
import '../styles/auth.css';


export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
  });

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault(); // IMPORTANT: stop default GET submit
    
  if (loading) return;
    if (!form.name || !form.email || !form.password) {
      setError('Name, email and password are required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/api/auth/register', form);
      setMessage(res.data?.message || 'Registered. Please login.');
      if (form.role === "user") {
        setTimeout(() =>
          navigate('/verify-otp', { state: { email: form.email } }),
        800);
        
      } else {
        setTimeout(() => navigate('/login'), 800);
      }
      

    } catch (err) {
      console.error('Register error:', err.response?.status, err.response?.data || err.message);
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
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
          <div className="hero-title">Create your account</div>
          <div className="hero-sub">Join as a user, NGO, or volunteer to coordinate and receive help efficiently.</div>
        </div>
      </div>

      <div className="auth-pane">
        <div className="auth-card">
          <div className="brand">
            <div className="brand-badge" />
            <div className="brand-title">LCHC</div>
          </div>
          <div className="auth-title">Sign up</div>
          <div className="auth-sub">It only takes a minute.</div>

          <form className="form" onSubmit={handleSubmit}>
            <div>
              <div className="label">Full name</div>
              <input
                className="input"
                name="name"
                placeholder="Enter Name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <div className="label">Email</div>
              <input
                className="input"
                name="email"
                type="email"
                placeholder="you@gmail.com"
                value={form.email}
                onChange={handleChange}
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
              <div className="caption">Use at least 8 characters.</div>
            </div>

            <div>
              <div className="label">Role</div>
              <select className="input select" name="role" value={form.role} onChange={handleChange}>
                <option value="user">User</option>
                <option value="ngo">NGO</option>
                <option value="volunteer">Volunteer</option>
              </select>
            </div>

            {message && <p className="success">{message}</p>}
            {error && <p className="error">{error}</p>}

            <button type="submit" className="button" disabled={loading}>
              {loading ? 'Submitting…' : 'Create account'}
            </button>
          </form>

          <div className="helper">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
