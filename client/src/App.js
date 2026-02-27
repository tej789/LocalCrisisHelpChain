import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VerifyOtp from "./pages/VerifyOtp";
import VolunteerProfile from "./pages/VolunteerProfile";

import SubmitRequest from './pages/SubmitRequest';
import RequestsList from './pages/RequestsList';
import VolunteerDashboard from './pages/VolunteerDashboard';
import NGODashboard from './pages/NGODashboard';
import UserDashboard from './pages/UserDashboard';
import Register from './pages/Register';
import Login from './pages/Login';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from "./pages/AdminDashboard";


function App() {
  return (
    <Router>
      <Routes>

        {/* PUBLIC ROUTES */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
<Route path="/volunteer/profile" element={<VolunteerProfile />} />
<Route
  path="/admin"
  element={
    <RoleProtectedRoute roles={['admin']}>
      <AdminDashboard />
    </RoleProtectedRoute>
  }
/>

        {/* PROTECTED ROUTES */}

        <Route
          path="/submit-request"
          element={
            <RoleProtectedRoute roles={['user','ngo','volunteer']}>
              <SubmitRequest />
            </RoleProtectedRoute>
          }
        />
<Route path="/forgot-password" element={<ForgotPassword />} />

        <Route
          path="/requests"
          element={
            <RoleProtectedRoute roles={['user','ngo','volunteer']}>
              <RequestsList />
            </RoleProtectedRoute>
          }
        />


        {/* DASHBOARDS */}

        <Route
          path="/dashboard/user"
          element={
            <RoleProtectedRoute roles={['user']}>
              <UserDashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/dashboard/ngo"
          element={
            <RoleProtectedRoute roles={['ngo']}>
              <NGODashboard />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/dashboard/volunteer"
          element={
            <RoleProtectedRoute roles={['volunteer']}>
              <VolunteerDashboard />
            </RoleProtectedRoute>
          }
        />


        {/* SAFE REDIRECTS */}
 
        <Route path="/ngo-dashboard" element={<Navigate to="/dashboard/ngo" replace />} />
        <Route path="/volunteer-dashboard" element={<Navigate to="/dashboard/volunteer" replace />} />


        {/* DEFAULT */}
        <Route path="/" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
}

export default App;
