import { useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Save, MapPin, Star, TrendingUp } from 'lucide-react';
import SkillInput from '../components/SkillInput';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio:  user?.bio  || '',
    availability: user?.availability || 'Flexible',
  });
  const [skillsOffered, setSkillsOffered] = useState(user?.skillsOffered || []);
  const [skillsWanted,  setSkillsWanted]  = useState(user?.skillsWanted  || []);
  const [rawOffered, setRawOffered]       = useState(user?.rawSkillsOfferedInput || '');
  const [rawWanted,  setRawWanted]        = useState(user?.rawSkillsWantedInput  || '');

  const [loading,    setLoading]    = useState(false);
  const [gettingLoc, setGettingLoc] = useState(false);
  const [success,    setSuccess]    = useState('');
  const [error,      setError]      = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put('/api/users/profile', {
        ...formData,
        skillsOffered,
        skillsWanted,
        rawSkillsOfferedInput: rawOffered,
        rawSkillsWantedInput:  rawWanted,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setUser(data);
      setSkillsOffered(data.skillsOffered || []);
      setSkillsWanted(data.skillsWanted   || []);
      setSuccess('Profile saved successfully! ✅');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getLocation = () => {
    setGettingLoc(true);
    setError('');
    setSuccess('');
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const token = localStorage.getItem('token');
          const { data } = await axios.put('/api/users/profile',
            { location: { coordinates: [longitude, latitude] } },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          setUser(data);
          setSuccess('Location updated! ✅');
        } catch (e) { setError(e.response?.data?.message || 'Failed to save location'); }
        setGettingLoc(false);
      },
      (err) => { setError(`Geolocation error: ${err.message}`); setGettingLoc(false); },
      { timeout: 10000 }
    );
  };

  // Trust score breakdown display
  const ts = user?.trustScore ?? 50;
  const tsColor = ts >= 80 ? 'text-emerald-500' : ts >= 60 ? 'text-amber-500' : 'text-red-400';
  const tsBar   = ts >= 80 ? 'from-emerald-400 to-green-500' : ts >= 60 ? 'from-amber-400 to-orange-400' : 'from-red-400 to-rose-500';

  return (
    <div className="max-w-2xl mx-auto w-full space-y-6">
      <h2 className="text-3xl font-bold">Your Profile</h2>

      {success && <div className="bg-green-100 text-green-700 p-4 rounded-xl text-sm font-medium">{success}</div>}
      {error   && <div className="bg-red-100 text-red-700 p-4 rounded-xl text-sm font-medium">{error}</div>}

      {/* Trust score card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-dark-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star size={18} className="text-yellow-400" fill="currentColor" />
            <span className="font-bold text-slate-700 dark:text-slate-200">Trust Score</span>
          </div>
          <span className={`text-2xl font-black ${tsColor}`}>{ts}</span>
        </div>
        <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full bg-gradient-to-r ${tsBar} transition-all`} style={{ width: `${ts}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3 text-center">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{user?.completedCount || 0}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Completed</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {user?.ratingCount > 0 ? (user.totalRating / user.ratingCount).toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Avg Rating</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {user?.acceptanceRate ? `${Math.round(user.acceptanceRate * 100)}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Accept Rate</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
        {/* Location banner */}
        <div className="bg-brand-50 dark:bg-slate-800 p-5 border-b border-brand-100 dark:border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-brand-900 dark:text-brand-300 flex items-center gap-2">
              <MapPin size={18} /> Location Services
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {user?.location?.coordinates?.length > 1
                ? `${user.location.coordinates[1].toFixed(4)}° N, ${user.location.coordinates[0].toFixed(4)}° E`
                : 'Set your location to find nearby skills.'}
            </p>
          </div>
          <button
            type="button"
            onClick={getLocation}
            disabled={gettingLoc}
            className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
          >
            {gettingLoc ? 'Updating...' : 'Update Location'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
              rows={3}
              placeholder="Tell others about yourself..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
            />
          </div>

          {/* Availability */}
          <div>
            <label className="block text-sm font-medium mb-2">Availability</label>
            <select
              value={formData.availability}
              onChange={e => setFormData({ ...formData, availability: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none text-sm"
            >
              {['Flexible', 'Morning', 'Afternoon', 'Evening', 'Weekends'].map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* NLP-Powered Skill Inputs */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-6">
            <SkillInput
              label="Skills You Offer"
              value={skillsOffered}
              onChange={setSkillsOffered}
              rawText={rawOffered}
              onRawTextChange={setRawOffered}
              placeholder='e.g. "I can teach React, Node.js and basic machine learning..."'
              accentColor="brand"
            />
            <SkillInput
              label="Skills You Want"
              value={skillsWanted}
              onChange={setSkillsWanted}
              rawText={rawWanted}
              onRawTextChange={setRawWanted}
              placeholder='e.g. "I want to learn guitar, Spanish, and photography..."'
              accentColor="indigo"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition flex justify-center items-center gap-2"
          >
            <Save size={18} /> {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
