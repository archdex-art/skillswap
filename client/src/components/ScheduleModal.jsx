/**
 * ScheduleModal.jsx
 * Modal for scheduling a skill swap session after a request is accepted.
 */
import { useState } from 'react';
import axios from 'axios';
import { Calendar, Clock, Globe, MapPin, X, CheckCircle2, Loader2 } from 'lucide-react';

export default function ScheduleModal({ matchId, partnerName, onClose, onScheduled }) {
  const [form, setForm]     = useState({ date: '', time: '', mode: 'online' });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) { setError('Date and time are required.'); return; }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const { data } = await axios.put(`/api/matches/${matchId}/schedule`, form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onScheduled?.(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule session');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar size={18} className="text-brand-500" /> Schedule Session
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">with {partnerName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          {/* Date */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Calendar size={14} className="text-brand-500" /> Date
            </label>
            <input
              type="date"
              min={today}
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Time */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Clock size={14} className="text-brand-500" /> Time
            </label>
            <input
              type="time"
              value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 block">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { val: 'online',  icon: <Globe size={16} />,  label: 'Online' },
                { val: 'offline', icon: <MapPin size={16} />, label: 'In-Person' },
              ].map(({ val, icon, label }) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, mode: val }))}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition ${
                    form.mode === val
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-brand-300'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-60 transition"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {loading ? 'Scheduling...' : 'Confirm Session'}
          </button>
        </form>
      </div>
    </div>
  );
}
