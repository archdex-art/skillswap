/**
 * NotificationBell.jsx
 * Animated notification bell with dropdown list for the navbar.
 */
import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, ArrowRight, Zap, CheckCircle2, XCircle, Calendar, MessageCircle } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

function timeAgo(ts) {
  const s = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TYPE_CONFIG = {
  new_request:       { icon: <Bell size={14} />,         color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
  request_accepted:  { icon: <CheckCircle2 size={14} />, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  request_rejected:  { icon: <XCircle size={14} />,      color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20' },
  session_scheduled: { icon: <Calendar size={14} />,     color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useSocket() || {};
  const [open, setOpen] = useState(false);
  const ref  = useRef(null);
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open && markAllRead) markAllRead();
  };

  const handleClick = (n) => {
    setOpen(false);
    if (n.matchId) navigate(`/requests`);
  };

  const list = notifications || [];

  return (
    <div ref={ref} className="relative">
      <button
        id="notification-bell"
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Notifications</h3>
            {list.length > 0 && (
              <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500 transition flex items-center gap-1">
                <CheckCheck size={12} /> Clear all
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto">
            {list.length === 0 ? (
              <div className="py-10 text-center text-slate-400 text-sm">
                <Bell size={28} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              list.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_request;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700/50 last:border-0 ${!n.read ? 'bg-brand-50/30 dark:bg-brand-900/10' : ''}`}
                  >
                    <span className={`mt-0.5 shrink-0 ${cfg.color} ${cfg.bg} p-1.5 rounded-lg`}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug">{n.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.timestamp)}</p>
                    </div>
                    {n.urgency === 'high' && <Zap size={14} className="shrink-0 text-orange-500 mt-1" />}
                  </button>
                );
              })
            )}
          </div>

          {list.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => { navigate('/requests'); setOpen(false); }}
                className="w-full text-xs text-brand-500 hover:text-brand-600 font-semibold flex items-center justify-center gap-1 py-1"
              >
                View all requests <ArrowRight size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
