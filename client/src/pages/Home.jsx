import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPin, ArrowRightLeft, Star, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import RequestModal from '../components/RequestModal';

// Toast Notification Component
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${colors[type] || 'bg-slate-700'} text-white px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-bounce-in`}>
      {type === 'success' && <CheckCircle2 size={18} />}
      {type === 'error' && <XCircle size={18} />}
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
}

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [existingRequests, setExistingRequests] = useState(new Map()); // Map<recipientId, status>
  const [modalTarget, setModalTarget] = useState(null); // user object for the open modal
  const [sendingRequest, setSendingRequest] = useState(false);
  const [toast, setToast] = useState(null);
  const { user } = useAuth();

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // Fetch nearby matched users
  useEffect(() => {
    const fetchMatches = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/users/discover?distance=50', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMatches(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.location?.coordinates?.length) {
      fetchMatches();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Fetch existing requests so we can update button states
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        const { data } = await axios.get('/api/matches', {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Build a map of other user ID -> status for outgoing requests
        const map = new Map();
        data.forEach((m) => {
          if (m.requester._id === user?._id) {
            map.set(m.recipient._id, m.status);
          }
        });
        setExistingRequests(map);
      } catch (err) {
        console.error(err);
      }
    };
    if (user) fetchRequests();
  }, [user]);

  const handleSendRequest = async (recipientId, message) => {
    setSendingRequest(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/matches', { recipientId, message }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to reflect sent request immediately
      setExistingRequests(prev => new Map(prev).set(recipientId, 'pending'));
      setModalTarget(null);
      showToast('Request sent successfully! 🎉', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send request', 'error');
    } finally {
      setSendingRequest(false);
    }
  };

  // Returns button label/state based on existing request status
  const getButtonState = (userId) => {
    const status = existingRequests.get(userId);
    if (status === 'pending') return { label: 'Pending...', disabled: true, className: 'text-yellow-600 border-yellow-300 bg-yellow-50 cursor-not-allowed' };
    if (status === 'accepted') return { label: '✓ Connected', disabled: true, className: 'text-green-600 border-green-300 bg-green-50 cursor-not-allowed' };
    if (status === 'rejected') return { label: 'Request Again', disabled: false, className: 'text-brand-500 border-slate-200 hover:border-brand-300 bg-white' };
    return { label: 'Request Exchange', disabled: false, className: 'text-brand-500 border-slate-200 hover:border-brand-300 bg-white' };
  };

  if (!user?.location?.coordinates?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border p-8 text-center">
        <MapPin size={48} className="text-brand-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Location Not Set</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">We need your location to find skill swaps near you.</p>
        <Link to="/profile" className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-xl transition font-medium">Update Profile</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Modal */}
      {modalTarget && (
        <RequestModal
          targetUser={modalTarget}
          onClose={() => setModalTarget(null)}
          onSubmit={handleSendRequest}
          loading={sendingRequest}
        />
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Discover Matches</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Based on your skills and location (within 50km)</p>
        </div>
        <Link to="/requests" className="text-sm text-brand-500 hover:text-brand-600 font-medium border border-brand-200 hover:bg-brand-50 px-4 py-2 rounded-xl transition">
          My Requests →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-64 rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">No matches found nearby. Keep your skills updated!</div>
          ) : (
            matches.map((match) => {
              const btn = getButtonState(match._id);
              return (
                <div key={match._id} className="bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-slate-100 dark:border-dark-border group">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
                          {match.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">{match.name}</h3>
                          <div className="flex items-center text-sm text-slate-500 gap-1">
                            <MapPin size={14} />
                            <span>{(match.dist.calculated / 1000).toFixed(1)} km away</span>
                          </div>
                        </div>
                      </div>
                      {match.reciprocalMatch && (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                          <ArrowRightLeft size={12} /> Perfect Match
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-sm mb-4 line-clamp-2">
                      {match.bio || "No bio provided."}
                    </p>

                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Offers</span>
                        <div className="flex flex-wrap gap-1">
                          {match.skillsOffered.slice(0, 3).map(skill => (
                            <span key={skill} className="bg-blue-50 dark:bg-blue-900/20 text-brand-600 dark:text-brand-300 text-xs px-2 py-1 rounded border border-blue-100 dark:border-blue-800/50">{skill}</span>
                          ))}
                          {match.skillsOffered.length > 3 && <span className="text-xs text-slate-400 flex items-center">+{match.skillsOffered.length - 3}</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Wants</span>
                        <div className="flex flex-wrap gap-1">
                          {match.skillsWanted.slice(0, 3).map(skill => (
                            <span key={skill} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800/50">{skill}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-dark-border flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm text-yellow-500 font-medium">
                      <Star size={16} fill="currentColor" /> {match.trustScore}
                    </div>
                    <button
                      onClick={() => !btn.disabled && setModalTarget(match)}
                      disabled={btn.disabled}
                      className={`text-sm font-semibold transition px-4 py-2 rounded-lg border dark:bg-dark-card ${btn.className}`}
                    >
                      {btn.label}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
