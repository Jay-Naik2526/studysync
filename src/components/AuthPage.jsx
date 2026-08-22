import React, { useState } from 'react';
import { Compass, Mail, Lock, User, ArrowRight, AlertCircle, Shield, Building2, BadgeCheck } from 'lucide-react';
import { authAPI } from '../api';
import ContourBackdrop from './ContourBackdrop';

export default function AuthPage({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isMentor, setIsMentor] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mentorSignupCode, setMentorSignupCode] = useState('');
  const [department, setDepartment] = useState('');
  const [employeeId, setEmployeeId] = useState('');
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
        const payload = { name, email, password };
        if (isMentor) {
          payload.role = 'mentor';
          payload.mentorSignupCode = mentorSignupCode;
          if (department.trim()) payload.department = department.trim();
          if (employeeId.trim()) payload.employeeId = employeeId.trim();
        }
        await authAPI.register(payload);
        setMessage('Account created — sign in below.');
        setIsLogin(true);
        setName(''); setPassword(''); setMentorSignupCode(''); setDepartment(''); setEmployeeId('');
        setIsMentor(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-ember transition-all";

  return (
    <div className="min-h-screen bg-paper font-sans flex items-center justify-center p-4 relative overflow-hidden">
      <ContourBackdrop />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-ember flex items-center justify-center shadow-md shadow-ember/30 mb-4">
            <Compass size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-bold text-ink tracking-tight">StudySync</h1>
          <p className="text-sm text-ink-muted mt-1">Your semester, mapped.</p>
        </div>

        {/* Card */}
        <div className="bg-parchment border border-sand rounded-2xl p-7 shadow-sm">
          <h2 className="text-base font-display font-bold text-ink mb-5">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {!isLogin && (
              <>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                  <input
                    type="text" placeholder="Full name" value={name}
                    onChange={e => setName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                {/* Mentor toggle */}
                <button
                  type="button"
                  onClick={() => setIsMentor(v => !v)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    isMentor
                      ? 'bg-trail-pale border-trail text-trail-dark'
                      : 'bg-white border-sand text-ink-muted hover:border-sand-dark'
                  }`}
                >
                  <Shield size={13} />
                  {isMentor ? 'Registering as Mentor' : 'Register as Mentor instead?'}
                </button>

                {/* Mentor-specific fields */}
                {isMentor && (
                  <div className="space-y-3 bg-map rounded-xl p-3 border border-sand">
                    <div className="relative">
                      <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="text" placeholder="Mentor signup code" value={mentorSignupCode}
                        onChange={e => setMentorSignupCode(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="text" placeholder="Department (optional)" value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="relative">
                      <BadgeCheck size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="text" placeholder="Employee ID (optional)" value={employeeId}
                        onChange={e => setEmployeeId(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
            <div className="relative">
              <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="relative">
              <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-danger text-xs bg-danger-pale border border-danger/25 rounded-xl px-3 py-2.5">
                <AlertCircle size={13} className="flex-shrink-0" />{error}
              </div>
            )}
            {message && (
              <p className="text-xs text-sage-dark bg-sage-pale border border-sage/30 rounded-xl px-3 py-2.5">{message}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm mt-1"
            >
              {loading ? 'Please wait…' : (isLogin ? 'Sign in' : 'Create account')}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
          <button onClick={() => { setIsLogin(v => !v); setError(''); setMessage(''); setIsMentor(false); }} className="text-ember-dark hover:text-ember font-bold transition-colors">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}
