/**
 * SocketContext.jsx
 *
 * Provides a global socket.io-client connection + real-time notification state.
 * Wraps the entire authenticated app so any component can access:
 *   { socket, notifications, unreadCount, clearNotification, markAllRead, clearAll }
 *
 * FIX: socket is stored in state (not just a ref) so consumers re-render
 * when the connection is established, preventing the "socket is null" bug
 * that caused chat messages to never be sent.
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
  // ↓ State-tracked socket instance so consumers re-render when it connects
  const [socket, setSocket] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // ── Connect / disconnect based on auth ─────────────────────────────────────
  useEffect(() => {
    if (!user?._id) return;

    const s = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    });
    socketRef.current = s;

    s.on('connect', () => {
      console.log('[Socket] Connected:', s.id);
      s.emit('register_user', user._id);
      // Expose via state AFTER connection so consumers get a live socket
      setSocket(s);
    });

    s.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // ── Incoming notifications ────────────────────────────────────────────
    s.on('notification', (payload) => {
      setNotifications(prev => [
        { ...payload, id: Date.now(), read: false, timestamp: new Date().toISOString() },
        ...prev,
      ]);
    });

    // ── Auto navigate to chat when request accepted ───────────────────────
    s.on('open_chat', ({ matchId }) => {
      navigate(`/chat/${matchId}`);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
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
        socket,          // live Socket.io instance (null until connected)
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
