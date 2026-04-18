import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const getNotificationsBasePath = () => {
    const role = user?.role?.toLowerCase();

    if (role === 'user') return '/api/users/notifications';
    if (role === 'volunteer') return '/api/volunteers/notifications';

    return null;
  };

  const fetchNotifications = async () => {
    if (!token) return;

    const basePath = getNotificationsBasePath();
    if (!basePath) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.get(basePath, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setNotifications(data);
    } catch (err) {
      console.error("Notification fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    const basePath = getNotificationsBasePath();
    if (!basePath) return;

    try {
      await api.put(
        `${basePath}/${id}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotifications((prev) =>
        prev.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        )
      );
    } catch (err) {
      console.error("Mark as read error:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
  }, [token, user?.role]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        loading
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);