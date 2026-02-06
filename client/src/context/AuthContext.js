import React, { createContext, useContext, useState, useEffect } from 'react';


const AuthContext = createContext();

export function AuthProvider({ children }) {

const [loading, setLoading] = useState(true);
useEffect(() => {
  // hydration finished immediately because
  // you already read from localStorage in useState
  setLoading(false);
}, []);
  
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  function login({ token: t, user: u }) {
    setToken(t);
    setUser(u);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // keep it simple and force redirect
    window.location.href = '/login';
  }

  
  return (
    <AuthContext.Provider value={{
      token,
      user,
      login,
      logout,
      loading
    }}>
    
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}