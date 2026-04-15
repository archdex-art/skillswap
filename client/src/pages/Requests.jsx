import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { ArrowRightLeft, Check, X, Clock, User, Star, Inbox, Send } from 'lucide-react';

// Relative time helper (e.g. "2 hours ago")
function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Status badge component
function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };
  const icons = {
    pending: <Clock size={12} />,
    accepted: <Check size={12} />,
    rejected: <X size={12} />,
  };
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Skill overlap display
function SkillOverlap({ userA, userB }) {
  const overlap = userA.skillsOffered?.filter(s => userB.skillsWanted?.includes(s)) || [];
  if (overlap.length === 0) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <ArrowRightLeft size={12} className="text-brand-400 shrink-0" />
      {overlap.map(s => (
        <span key={s} className="text-xs bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded">{s}</span>
      ))}
    </div>
  );
}

// Request card for incoming requests
function IncomingCard({ match, onRespond, responding }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold">
            {match.requester.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">{match.requester.name}</p>
            <p className="text-xs text-slate-400">{timeAgo(match.createdAt)}</p>
          </div>
        </div>
        <StatusBadge status={match.status} />
      </div>

      {/* Message */}
      {match.message && (
        <blockquote className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border-l-4 border-brand-300 mb-3 italic">
          "{match.message}"
        </blockquote>
      )}

      {/* Skill overlap */}
      <div className="mb-4">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">They Offer You</p>
        <div className="flex flex-wrap gap-1">
          {match.requester.skillsOffered?.slice(0, 4).map(s => (
            <span key={s} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{s}</span>
          ))}
        </div>
        <SkillOverlap userA={match.requester} userB={match.recipient} />
      </div>

      {/* Actions */}
      {match.status === 'pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => onRespond(match._id, 'accepted')}
            disabled={responding === match._id}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition disabled:opacity-60"
          >
            <Check size={16} /> Accept
          </button>
          <button
            onClick={() => onRespond(match._id, 'rejected')}
            disabled={responding === match._id}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-slate-100 hover:bg-red-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-red-600 text-sm font-semibold transition border border-slate-200 dark:border-slate-600 disabled:opacity-60"
          >
            <X size={16} /> Decline
          </button>
        </div>
      )}
    </div>
  );
}

// Request card for outgoing requests
function OutgoingCard({ match }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold">
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
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">You are asking for</p>
        <div className="flex flex-wrap gap-1">
          {match.recipient.skillsOffered?.slice(0, 4).map(s => (
            <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received'); // 'received' | 'sent'
  const [responding, setResponding] = useState(null); // match._id being responded to

  const fetchRequests = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.get('/api/matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleRespond = async (matchId, status) => {
    setResponding(matchId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/matches/${matchId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Refresh all requests
      await fetchRequests();
    } catch (err) {
      console.error(err);
    } finally {
      setResponding(null);
    }
  };

  const received = requests.filter(m => m.recipient._id === user?._id);
  const sent = requests.filter(m => m.requester._id === user?._id);
  const pendingReceived = received.filter(m => m.status === 'pending').length;

  const tabs = [
    { key: 'received', label: 'Received Requests', icon: <Inbox size={16} />, count: received.length, badge: pendingReceived },
    { key: 'sent', label: 'Sent Requests', icon: <Send size={16} />, count: sent.length },
  ];

  const activeList = activeTab === 'received' ? received : sent;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My Requests</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your received and sent skill exchange requests</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-xs rounded-full px-2 py-0.5 font-bold ${
              activeTab === tab.key ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400'
            }`}>
              {tab.count}
            </span>
            {tab.badge > 0 && activeTab !== tab.key && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-32 rounded-2xl"></div>
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-5xl mb-4">{activeTab === 'received' ? '📬' : '📤'}</div>
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">
            {activeTab === 'received' ? 'No received requests yet' : 'No sent requests yet'}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            {activeTab === 'received'
              ? 'When someone requests a skill swap with you, it will appear here.'
              : 'Go to Discover to find skill matches and send your first request!'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeList.map((match) =>
            activeTab === 'received' ? (
              <IncomingCard key={match._id} match={match} onRespond={handleRespond} responding={responding} />
            ) : (
              <OutgoingCard key={match._id} match={match} />
            )
          )}
        </div>
      )}
    </div>
  );
}
