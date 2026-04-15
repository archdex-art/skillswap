import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(name, email, password);
      // Wait for auth context to update and redirect naturally or force navigate
      navigate('/profile'); // Redirect to profile to fill skills
    } catch (err) {
      setError(err?.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden">
      <div className="absolute top-[10%] right-[-10%] w-96 h-96 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 w-full max-w-md p-8 glassmorphism-dark border border-slate-700 mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gradient mb-2">Join SkillSwap</h1>
          <p className="text-slate-400">Exchange skills locally without money.</p>
        </div>

        {error && <div className="bg-red-500 bg-opacity-20 text-red-300 p-3 rounded-lg mb-6 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required 
              className="w-full px-4 py-3 rounded-xl bg-slate-800 bg-opacity-50 border border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 outline-none transition text-white" 
              placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
              className="w-full px-4 py-3 rounded-xl bg-slate-800 bg-opacity-50 border border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 outline-none transition text-white" 
              placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
              className="w-full px-4 py-3 rounded-xl bg-slate-800 bg-opacity-50 border border-slate-600 focus:border-brand-500 focus:ring-2 focus:ring-brand-500 outline-none transition text-white" 
              placeholder="••••••••" />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-brand-500 to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg transform transition hover:scale-105 flex items-center justify-center gap-2">
            <UserPlus size={20} /> Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium ml-1">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
