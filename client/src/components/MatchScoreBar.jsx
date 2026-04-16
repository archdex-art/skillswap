/**
 * MatchScoreBar.jsx
 * Visual match score progress bar with tag and color coding.
 */

export default function MatchScoreBar({ score = 0, tag = 'Nearby', matchedSkills }) {
  const color =
    score >= 85 ? 'from-emerald-400 to-green-500' :
    score >= 70 ? 'from-sky-400 to-blue-500' :
    score >= 50 ? 'from-amber-400 to-orange-400' :
                  'from-slate-300 to-slate-400';

  const tagColors = {
    'Perfect Match': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    'Great Match':   'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    'Good Match':    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    'Average Match': 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
    'Nearby':        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Match Score</span>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tagColors[tag] || tagColors['Nearby']}`}>
            {tag}
          </span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{score}%</span>
        </div>
      </div>
      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      {matchedSkills?.youGet?.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {matchedSkills.youGet.slice(0, 3).map(s => (
            <span key={s} className="text-[10px] bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-medium">
              ✓ {s}
            </span>
          ))}
          {matchedSkills.youGet.length > 3 && (
            <span className="text-[10px] text-slate-400">+{matchedSkills.youGet.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
}
