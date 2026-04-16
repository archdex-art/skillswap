/**
 * ToastContainer.jsx
 * Renders stacked toast notifications with slide-up animation.
 * Place once near the root of the app.
 */
import { CheckCircle2, XCircle, Info, AlertTriangle, Zap, X } from 'lucide-react';

const CONFIGS = {
  success: {
    icon: <CheckCircle2 size={18} />,
    cls:  'bg-emerald-500 text-white',
    bar:  'bg-emerald-300',
  },
  error: {
    icon: <XCircle size={18} />,
    cls:  'bg-red-500 text-white',
    bar:  'bg-red-300',
  },
  info: {
    icon: <Info size={18} />,
    cls:  'bg-blue-500 text-white',
    bar:  'bg-blue-300',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    cls:  'bg-amber-500 text-white',
    bar:  'bg-amber-300',
  },
  urgent: {
    icon: <Zap size={18} />,
    cls:  'bg-orange-600 text-white',
    bar:  'bg-orange-400',
  },
};

export default function ToastContainer({ toasts, removeToast }) {
  if (!toasts?.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map(({ id, message, type }) => {
        const cfg = CONFIGS[type] || CONFIGS.info;
        return (
          <div
            key={id}
            className={`
              ${cfg.cls}
              pointer-events-auto
              min-w-[280px] max-w-[360px]
              rounded-2xl shadow-2xl overflow-hidden
              animate-slide-up
            `}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 shrink-0">{cfg.icon}</span>
              <p className="text-sm font-medium leading-snug flex-1">{message}</p>
              <button
                onClick={() => removeToast(id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition"
              >
                <X size={15} />
              </button>
            </div>
            {/* Progress bar */}
            <div className="h-1 w-full">
              <div className={`${cfg.bar} h-full animate-shrink-bar`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
