import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { MapPin, Star, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import RequestModal from '../components/RequestModal';
import DiscoverFilters from '../components/DiscoverFilters';
import MatchScoreBar from '../components/MatchScoreBar';
import ToastContainer from '../components/ToastContainer';
import { useToast } from '../hooks/useToast';

const DEFAULT_FILTERS = { maxDistance: 50, skills: [], availability: '', tag: '' };

export default function Home() {
  const [allMatches,    setAllMatches]    = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [existingReqs,  setExistingReqs]  = useState(new Map());
  const [modalTarget,   setModalTarget]   = useState(null);
  const [sendingReq,    setSendingReq]    = useState(false);
  const [filters,       setFilters]       = useState(DEFAULT_FILTERS);
  const { user }    = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchMatches = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `/api/users/discover?distance=${filters.maxDistance}`,
        { headers }
      );
      setAllMatches(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters.maxDistance]);

  const fetchExistingRequests = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/matches', { headers });
      const map = new Map();
      data.forEach(m => {
        if (m.requester._id === user?._id) map.set(m.recipient._id, m.status);
      });
      setExistingReqs(map);
    } catch (err) { console.error(err); }
  }, [user?._id]);

  useEffect(() => {
    if (user?.location?.coordinates?.length) { fetchMatches(); fetchExistingRequests(); }
    else setLoading(false);
  }, [user, fetchMatches, fetchExistingRequests]);

  // Client-side filtering
  const filtered = allMatches.filter(m => {
    if (filters.tag && m.matchTag !== filters.tag) return false;
    if (filters.availability && m.availability && m.availability !== filters.availability) return false;
    return true;
  });

  const handleSendRequest = async (recipientId, message) => {
    setSendingReq(true);
    try {
      await axios.post('/api/matches', { recipientId, message }, { headers });
      setExistingReqs(prev => new Map(prev).set(recipientId, 'pending'));
      setModalTarget(null);
      showToast('Request sent! 🎉', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send request';
      showToast(msg, err.response?.status === 429 ? 'warning' : 'error');
    } finally {
      setSendingReq(false);
    }
  };

  const getButtonState = (userId) => {
    const status = existingReqs.get(userId);
    if (status === 'pending')  return { label: 'Pending…',      disabled: true,  cls: 'text-yellow-600 border-yellow-300 bg-yellow-50 cursor-not-allowed' };
    if (status === 'accepted') return { label: '✓ Connected',   disabled: true,  cls: 'text-green-600 border-green-300 bg-green-50 cursor-not-allowed' };
    if (status === 'rejected') return { label: 'Request Again', disabled: false, cls: 'text-brand-500 border-slate-200 hover:border-brand-300 bg-white' };
    return { label: 'Request Exchange', disabled: false, cls: 'text-brand-500 border-slate-200 hover:border-brand-300 bg-white' };
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
    <div className="space-y-5">
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {modalTarget && (
        <RequestModal
          targetUser={modalTarget}
          onClose={() => setModalTarget(null)}
          onSubmit={handleSendRequest}
          loading={sendingReq}
        />
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Discover Matches</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">AI-powered skill matching within {filters.maxDistance}km</p>
        </div>
        <Link to="/requests" className="text-sm text-brand-500 hover:text-brand-600 font-medium border border-brand-200 hover:bg-brand-50 px-4 py-2 rounded-xl transition">
          My Requests →
        </Link>
      </div>

      {/* Filters */}
      <DiscoverFilters filters={filters} setFilters={setFilters} resultCount={filtered.length} />

      {/* Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-slate-200 dark:bg-slate-700 h-72 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              No matches found. Try adjusting your filters or updating your skills.
            </div>
          ) : (
            filtered.map(match => {
              const btn = getButtonState(match._id);
              return (
                <div key={match._id} className="bg-white dark:bg-dark-card rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-slate-100 dark:border-dark-border group flex flex-col">
                  <div className="p-6 flex-1 space-y-4">
                    {/* User header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-inner shrink-0">
                          {match.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors leading-snug">
                            {match.name}
                          </h3>
                          <div className="flex items-center text-sm text-slate-500 gap-1">
                            <MapPin size={13} />
                            <span>{(match.dist.calculated / 1000).toFixed(1)} km</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2">{match.bio || 'No bio provided.'}</p>

                    {/* Skills offered / wanted */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Offers</span>
                        <div className="flex flex-wrap gap-1">
                          {match.skillsOffered.slice(0, 3).map(skill => (
                            <span key={skill} className="bg-blue-50 dark:bg-blue-900/20 text-brand-600 dark:text-brand-300 text-xs px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{skill}</span>
                          ))}
                          {match.skillsOffered.length > 3 && <span className="text-xs text-slate-400">+{match.skillsOffered.length - 3}</span>}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Wants</span>
                        <div className="flex flex-wrap gap-1">
                          {match.skillsWanted.slice(0, 3).map(skill => (
                            <span key={skill} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300 text-xs px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{skill}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* NLP Match Score */}
                    <MatchScoreBar
                      score={match.matchScore}
                      tag={match.matchTag}
                      matchedSkills={match.matchedSkills}
                    />
                  </div>

                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-dark-border flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm text-yellow-500 font-medium">
                      <Star size={15} fill="currentColor" /> {match.trustScore}
                    </div>
                    <button
                      onClick={() => !btn.disabled && setModalTarget(match)}
                      disabled={btn.disabled}
                      className={`text-sm font-semibold transition px-4 py-2 rounded-lg border dark:bg-dark-card ${btn.cls}`}
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
