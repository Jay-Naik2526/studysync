import React, { useState } from 'react';
import { GraduationCap, Mail, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { authAPI } from '../api';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      if (isLogin) {
        const res = await authAPI.login({ email, password });
        onLogin(res.data);
      } else {
        await authAPI.register({ name, email, password });
        setMessage('Account created — sign in below.');
        setIsLogin(true);
        setName(''); setPassword('');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-700/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-fuchsia-700/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/40 mb-4">
            <GraduationCap size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">StudySync</h1>
          <p className="text-sm text-zinc-500 mt-1">Your academic command center</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.09] rounded-2xl p-7 shadow-2xl">
          <h2 className="text-base font-bold text-white mb-5">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text" placeholder="Full name" value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition-all"
                  required
                />
              </div>
            )}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white/[0.05] border border-white/[0.08] text-white placeholder-zinc-600 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-violet-500/60 focus:bg-white/[0.07] transition-all"
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="flex-shrink-0" />{error}
              </div>
            )}
            {message && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">{message}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 mt-1"
            >
              {loading ? 'Please wait…' : (isLogin ? 'Sign In' : 'Create Account')}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-zinc-600 mt-5">
          {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
          <button onClick={() => { setIsLogin(v => !v); setError(''); setMessage(''); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
