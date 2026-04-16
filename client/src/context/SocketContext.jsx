/**
 * SocketContext.jsx
 *
 * Provides a global socket.io-client connection + real-time notification state.
 * Wraps the entire authenticated app so any component can access:
 *   { socket, notifications, unreadCount, clearNotification, clearAll }
 */

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5050';

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);

  // ── Connect / disconnect based on auth ─────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const socket = io(SOCKET_URL, { transports: ['websocket'], reconnectionAttempts: 5 });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('register_user', user._id);
    });

    // ── Incoming notifications ────────────────────────────────────────────
    socket.on('notification', (payload) => {
      setNotifications(prev => [
        { ...payload, id: Date.now(), read: false, timestamp: new Date().toISOString() },
        ...prev,
      ]);
    });

    // ── Auto navigate to chat when request accepted ───────────────────────
    socket.on('open_chat', ({ matchId }) => {
      navigate(`/chat/${matchId}`);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, navigate]);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        notifications,
        unreadCount,
        clearNotification,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
