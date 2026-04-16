@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .glassmorphism {
    @apply bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border border-white border-opacity-20 rounded-2xl shadow-lg;
  }
  .glassmorphism-dark {
    @apply bg-slate-900 bg-opacity-50 backdrop-filter backdrop-blur-lg border border-slate-700 border-opacity-50 rounded-2xl shadow-lg;
  }
  .text-gradient {
    @apply bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-indigo-500;
  }
}

body {
  @apply bg-slate-50 text-slate-900 dark:bg-dark-bg dark:text-slate-100 font-sans antialiased;
}

/* ── Animations ─────────────────────────────────────────────────────────────── */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes shrink-bar {
  from { width: 100%; }
  to   { width: 0%; }
}
@keyframes bounce-in {
  0%   { opacity: 0; transform: scale(0.8); }
  60%  { transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}

.animate-slide-up   { animation: slide-up 0.25s ease-out forwards; }
.animate-fade-in    { animation: fade-in  0.2s ease-out forwards; }
.animate-shrink-bar { animation: shrink-bar 3.5s linear forwards; }
.animate-bounce-in  { animation: bounce-in 0.3s ease-out forwards; }

