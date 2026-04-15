import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Save, MapPin } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    skillsOffered: user?.skillsOffered?.join(', ') || '',
    skillsWanted: user?.skillsWanted?.join(', ') || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [gettingLoc, setGettingLoc] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const dataToSubmit = {
        ...formData,
        skillsOffered: formData.skillsOffered.split(',').map(s => s.trim()).filter(Boolean),
        skillsWanted: formData.skillsWanted.split(',').map(s => s.trim()).filter(Boolean),
      };

      const { data } = await axios.put('/api/users/profile', dataToSubmit, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(data);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to update profile');
    }
    setLoading(false);
  };

  const getLocation = () => {
    setGettingLoc(true);
    setError('');
    setSuccess('');
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
           const token = localStorage.getItem('token');
           const { data } = await axios.put('/api/users/profile', {
             location: { coordinates: [longitude, latitude] }
           }, { headers: { Authorization: `Bearer ${token}` }});
           setUser(data);
           setSuccess('Location updated successfully!');
        } catch(e) {
           console.error(e);
           setError(e.response?.data?.message || 'Failed to save location to server');
        }
        setGettingLoc(false);
      }, (err) => {
        setError(`Geolocation failed: ${err.message}. Please allow location access in your browser preferences.`);
        setGettingLoc(false);
      }, { timeout: 10000 });
    } else {
      setError('Geolocation is not supported by your browser.');
      setGettingLoc(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h2 className="text-3xl font-bold mb-8">Your Profile</h2>
      
      {success && <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-6">{success}</div>}
      {error && <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6">{error}</div>}

      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden">
        
        {/* Location Banner */}
        <div className="bg-brand-50 dark:bg-slate-800 p-6 border-b border-brand-100 dark:border-slate-700 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-brand-900 dark:text-brand-300 flex items-center gap-2"><MapPin size={18}/> Location Services</h3>
              <p className="text-sm text-slate-500 mt-1">
                {user?.location?.coordinates?.length > 1 ? (
                  <>
                    <span className="font-medium text-slate-700 dark:text-slate-300">Active Coordinates:</span> {user.location.coordinates[1].toFixed(4)}° N, {user.location.coordinates[0].toFixed(4)}° E
                    <span className="block text-xs mt-1 text-slate-400">Your browser's precise physical GPS / Wi-Fi geolocation.</span>
                  </>
                ) : (
                  "Set your location to find nearby skills."
                )}
              </p>
            </div>
            <button type="button" onClick={getLocation} disabled={gettingLoc} className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm hover:bg-slate-50 disabled:opacity-50 transition">
              {gettingLoc ? "Updating..." : "Update Location"}
            </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} rows="3"
              className="w-full px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-brand-500 outline-none"
              placeholder="Tell others about yourself..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium mb-2 text-brand-600 dark:text-brand-400">Skills You Offer</label>
              <textarea value={formData.skillsOffered} onChange={e => setFormData({...formData, skillsOffered: e.target.value})} rows="3"
                className="w-full px-4 py-2 rounded-xl border border-brand-200 dark:border-brand-900 bg-brand-50 dark:bg-brand-900/10 focus:ring-2 focus:ring-brand-500 outline-none"
                placeholder="React, CSS, Piano, Cooking..." />
              <p className="text-xs text-slate-500 mt-2">Comma separated values</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-indigo-600 dark:text-indigo-400">Skills You Want</label>
              <textarea value={formData.skillsWanted} onChange={e => setFormData({...formData, skillsWanted: e.target.value})} rows="3"
                className="w-full px-4 py-2 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-900/10 focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Guitar, Spanish, Marketing..." />
              <p className="text-xs text-slate-500 mt-2">Comma separated values</p>
            </div>
          </div>

          <div className="pt-6">
            <button type="submit" disabled={loading} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition flex justify-center items-center gap-2">
              <Save size={20} /> {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
