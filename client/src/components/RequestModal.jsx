import { useState, useEffect } from 'react';
import { X, Send, ArrowRightLeft, Zap, BookOpen, Users } from 'lucide-react';
import MatchScoreBar from './MatchScoreBar';

// Client-side intent preview — mirrors server analyzeIntent (negation-aware)
const NEGATIONS = ['not', 'no', "don't", 'dont', 'nothing', 'never', "isn't", 'isnt'];

function matchesWithoutNegation(text, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`\\b${escaped}\\b`, 'gi');
  let m;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 20), m.index).trim().split(/\s+/);
    const lastFew = before.slice(-3).join(' ');
    const negated = NEGATIONS.some(neg => new RegExp(`\\b${neg}\\b`).test(lastFew));
    if (!negated) return true;
  }
  return false;
}

function previewIntent(message) {
  const lower = (message || '').toLowerCase();
  const highUrgencyWords   = ['urgent', 'urgently', 'asap', 'emergency', 'immediately', 'help!'];
  const mediumUrgencyWords = ['soon', 'this week', 'next few days', 'quickly', 'fast', 'tomorrow'];
  const learningWords = ['need help', 'stuck', 'struggling', 'learn from', 'teach me', 'guide me', 'explain'];
  const collabWords   = ['collaborate', 'project', 'work together', 'team', 'startup', 'build together'];

  const urgency    = highUrgencyWords.some(k => matchesWithoutNegation(lower, k))   ? 'high'
                   : mediumUrgencyWords.some(k => matchesWithoutNegation(lower, k)) ? 'medium'
                   : 'normal';
  const intentType = collabWords.some(k => matchesWithoutNegation(lower, k))   ? 'collaboration'
                   : learningWords.some(k => matchesWithoutNegation(lower, k)) ? 'learning'
                   : null;
  return { urgency, intentType };
}

const INTENT_META = {
  learning:      { icon: <BookOpen size={12} />,  label: 'Learning intent',      cls: 'text-blue-600 bg-blue-50 border-blue-200' },
  collaboration: { icon: <Users size={12} />,     label: 'Collaboration intent', cls: 'text-purple-600 bg-purple-50 border-purple-200' },
};

export default function RequestModal({ targetUser, onClose, onSubmit, loading }) {
  const [message, setMessage] = useState('');
  const intent = previewIntent(message);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(targetUser._id, message);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
              {targetUser.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white">{targetUser.name}</h3>
              <p className="text-xs text-slate-500">Request Skill Exchange</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Match Score */}
        {targetUser.matchScore !== undefined && (
          <div className="px-6 pt-4">
            <MatchScoreBar
              score={targetUser.matchScore}
              tag={targetUser.matchTag}
              matchedSkills={targetUser.matchedSkills}
            />
          </div>
        )}

        {/* Skills preview */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 flex gap-4">
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">They Offer</p>
            <div className="flex flex-wrap gap-1">
              {targetUser.skillsOffered.slice(0, 4).map(s => (
                <span key={s} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-brand-600 dark:text-brand-300 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800">{s}</span>
              ))}
            </div>
          </div>
          <div className="text-slate-300 dark:text-slate-600 flex items-center"><ArrowRightLeft size={16} /></div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">They Want</p>
            <div className="flex flex-wrap gap-1">
              {targetUser.skillsWanted.slice(0, 4).map(s => (
                <span key={s} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-800">{s}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Message form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Add a message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={`Hey ${targetUser.name.split(' ')[0]}, I'd love to do a skill exchange...`}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-brand-500 outline-none resize-none text-sm"
            />
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                {intent.urgency === 'high' && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                    <Zap size={11} /> Urgent
                  </span>
                )}
                {intent.intentType && INTENT_META[intent.intentType] && (
                  <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${INTENT_META[intent.intentType].cls}`}>
                    {INTENT_META[intent.intentType].icon} {INTENT_META[intent.intentType].label}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Max 5 requests / 30 mins</p>
              <p className="text-xs text-slate-400">{message.length}/500</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-500 hover:opacity-90 text-white font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm"
            >
              <Send size={16} />
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
