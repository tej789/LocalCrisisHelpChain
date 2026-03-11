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

  // Proactively check token expiry on mount and logout if expired
  useEffect(() => {
    const checkExpiry = () => {
      try {
        const t = localStorage.getItem('token');
        if (!t) return;
        const payload = JSON.parse(atob(t.split('.')[1]));
        if (payload?.exp && Date.now() >= payload.exp * 1000) {
          // token expired
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // don't forcibly redirect here; let components handle login flow
        }
      } catch (e) {
        // malformed token - clear it
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    };

    checkExpiry();
  }, []);

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

  function updateUser(updatedUserData) {
    setUser(prevUser => {
      const newUser = { ...prevUser, ...updatedUserData };
      return newUser;
    });
  }

  
  return (
    <AuthContext.Provider value={{
      token,
      user,
      login,
      logout,
      updateUser,
      loading
    }}>
    
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}