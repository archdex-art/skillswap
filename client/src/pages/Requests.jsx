import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import ScheduleModal from '../components/ScheduleModal';
import {
  ArrowRightLeft, Check, X, Clock, Star, Inbox, Send,
  MessageCircle, Calendar, Globe, MapPin, Zap, BookOpen, Users, CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(dateString) {
  const s = Math.floor((Date.now() - new Date(dateString)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function expiryLabel(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `Expires in ${h}h`;
  return `Expires in ${Math.floor(h / 24)}d`;
}

function StatusBadge({ status }) {
  const map = {
    pending:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    completed: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  const icons = { pending: <Clock size={11} />, accepted: <Check size={11} />, rejected: <X size={11} />, completed: <CheckCircle2 size={11} /> };
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${map[status] || ''}`}>
      {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function IntentBadge({ intentData }) {
  if (!intentData) return null;
  if (intentData.urgency === 'high') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
      <Zap size={9} /> URGENT
    </span>
  );
  if (intentData.intentType === 'learning') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
      <BookOpen size={9} /> Learning
    </span>
  );
  if (intentData.intentType === 'collaboration') return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
      <Users size={9} /> Collab
    </span>
  );
  return null;
}

// ── Cards ─────────────────────────────────────────────────────────────────────
function IncomingCard({ match, onRespond, responding, showToast }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold shrink-0">
            {match.requester.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{match.requester.name}</p>
            <p className="text-xs text-slate-400">{timeAgo(match.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <IntentBadge intentData={match.intentData} />
          <StatusBadge status={match.status} />
        </div>
      </div>

      {match.message && (
        <blockquote className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border-l-4 border-brand-300 mb-3 italic">
          "{match.message}"
        </blockquote>
      )}

      <div className="mb-3">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">They Offer</p>
        <div className="flex flex-wrap gap-1">
          {match.requester.skillsOffered?.slice(0, 4).map(s => (
            <span key={s} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{s}</span>
          ))}
        </div>
      </div>

      {match.status === 'pending' && match.expiresAt && (
        <p className="text-[10px] text-slate-400 mb-3 flex items-center gap-1">
          <Clock size={10} /> {expiryLabel(match.expiresAt)}
        </p>
      )}

      {match.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(match._id, 'accepted')}
            disabled={responding === match._id}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            <Check size={15} /> Accept
          </button>
          <button
            onClick={() => onRespond(match._id, 'rejected')}
            disabled={responding === match._id}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-red-600 text-sm font-semibold transition border border-slate-200 dark:border-slate-600 disabled:opacity-60"
          >
            <X size={15} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

function OutgoingCard({ match }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
            {match.recipient.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{match.recipient.name}</p>
            <p className="text-xs text-slate-400">{timeAgo(match.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {match.message && (
        <blockquote className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border-l-4 border-indigo-300 mb-3 italic">
          "{match.message}"
        </blockquote>
      )}

      <div>
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">They Offer</p>
        <div className="flex flex-wrap gap-1">
          {match.recipient.skillsOffered?.slice(0, 4).map(s => (
            <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{s}</span>
          ))}
        </div>
      </div>

      {match.status === 'pending' && match.expiresAt && (
        <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
          <Clock size={10} /> {expiryLabel(match.expiresAt)}
        </p>
      )}
    </div>
  );
}

function ActiveCard({ match, currentUserId, showToast }) {
  const navigate  = useNavigate();
  const [showSchedule, setShowSchedule] = useState(false);
  const partner = match.requester._id === currentUserId ? match.recipient : match.requester;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-green-200 dark:border-green-800/40 p-5 shadow-sm hover:shadow-md transition-shadow">
      {showSchedule && (
        <ScheduleModal
          matchId={match._id}
          partnerName={partner.name}
          onClose={() => setShowSchedule(false)}
          onScheduled={() => showToast('Session scheduled! 📅', 'success')}
        />
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold shrink-0">
            {partner.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{partner.name}</p>
            <p className="text-xs text-slate-400">Connected {timeAgo(match.createdAt)}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-2.5 py-1 rounded-full">
          <CheckCircle2 size={11} /> Accepted
        </span>
      </div>

      {/* Session info (if scheduled) */}
      {match.schedule?.date && (
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 bg-brand-50 dark:bg-brand-900/10 border border-brand-100 dark:border-brand-900/20 rounded-xl px-3 py-2 mb-3">
          <Calendar size={13} className="text-brand-500 shrink-0" />
          <span>{match.schedule.date} at {match.schedule.time}</span>
          {match.schedule.mode === 'online' ?
            <Globe size={13} className="text-blue-400 ml-auto" /> :
            <MapPin size={13} className="text-orange-400 ml-auto" />
          }
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => navigate(`/chat/${match._id}`)}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition"
        >
          <MessageCircle size={15} /> Open Chat
        </button>
        {!match.schedule?.date && (
          <button
            onClick={() => setShowSchedule(true)}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-semibold hover:border-brand-300 transition"
          >
            <Calendar size={15} /> Schedule
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Requests() {
  const { user } = useAuth();
  const { notifications } = useSocket() || {};
  const { toasts, showToast, removeToast } = useToast();
  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('received');
  const [responding, setResponding] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRequests(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Auto-refresh on incoming notification
  useEffect(() => {
    if (notifications?.length) fetchRequests();
  }, [notifications, fetchRequests]);

  const handleRespond = async (matchId, status) => {
    setResponding(matchId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/matches/${matchId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast(status === 'accepted' ? 'Request accepted! 🎉' : 'Request declined.', status === 'accepted' ? 'success' : 'info');
      await fetchRequests();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to respond', 'error');
    } finally {
      setResponding(null);
    }
  };

  const received = requests.filter(m => m.recipient._id === user?._id && m.status !== 'accepted' && m.status !== 'completed');
  const sent     = requests.filter(m => m.requester._id === user?._id && m.status !== 'accepted' && m.status !== 'completed');
  const active   = requests.filter(m => m.status === 'accepted' || m.status === 'completed');
  const pendingReceived = received.filter(m => m.status === 'pending').length;

  const tabs = [
    { key: 'received', label: 'Received', icon: <Inbox size={15} />,        count: received.length, alert: pendingReceived },
    { key: 'sent',     label: 'Sent',     icon: <Send size={15} />,          count: sent.length },
    { key: 'active',   label: 'Active',   icon: <CheckCircle2 size={15} />,  count: active.length,  green: true },
  ];

  const list = { received, sent, active }[activeTab] || [];

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My Requests</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your skill exchange requests and active connections</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-[10px] rounded-full px-1.5 py-0.5 font-bold ${
              activeTab === tab.key
                ? tab.green ? 'bg-green-500 text-white' : 'bg-brand-500 text-white'
                : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
            }`}>
              {tab.count}
            </span>
            {tab.alert > 0 && activeTab !== tab.key && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-2xl" />)}
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">
            {activeTab === 'received' ? '📬' : activeTab === 'sent' ? '📤' : '🤝'}
          </div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {activeTab === 'received' ? 'No requests received yet' :
             activeTab === 'sent' ? 'No requests sent yet' :
             'No active connections yet'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'received' ? 'When someone requests a skill swap, it appears here.' :
             activeTab === 'sent' ? 'Head to Discover to send your first request!' :
             'Accept a request to start a skill exchange!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map(match =>
            activeTab === 'received' ? (
              <IncomingCard key={match._id} match={match} onRespond={handleRespond} responding={responding} showToast={showToast} />
            ) : activeTab === 'sent' ? (
              <OutgoingCard key={match._id} match={match} />
            ) : (
              <ActiveCard key={match._id} match={match} currentUserId={user?._id} showToast={showToast} />
            )
          )}
        </div>
      )}
    </div>
  );
}
