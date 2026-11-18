import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, AlertCircle, Shield, Building2, BadgeCheck } from 'lucide-react';
import { authAPI } from '../api';
import ContourBackdrop from './ContourBackdrop';
import ContourMark from './ContourMark';
import { ThemeToggle, useTheme } from '../theme.jsx';
import { ContourGauge } from './ContourGauge';

// Ledger sign-in: a quiet product preview beside the form (sample figures)
function AuthPreview() {
  const rows = [['Days present', '335'], ['Absences', '70'], ['Classes you can still skip', '4']];
  return (
    <aside className="hidden lg:flex relative z-10 flex-col justify-between bg-map border-r border-sand p-12 xl:p-16">
      <div className="flex items-center gap-2 text-ink">
        <ContourMark size={28} className="text-ember" />
        <span className="font-display text-lg font-semibold">StudySync</span>
      </div>

      <div className="max-w-md">
        <h2 className="text-4xl xl:text-5xl font-display font-semibold text-ink leading-[1.1] tracking-tight">
          Your semester, kept like a <span className="hl">register</span>
        </h2>
        <p className="text-base text-ink-muted mt-4">Attendance synced from your SAP portal, marks, notes and a study planner in one place</p>
      </div>

      <div className="bg-parchment border border-sand rounded-2xl p-5 max-w-md">
        <div className="flex items-center gap-5">
          <ContourGauge pct={83} size={132}>
            <p className="text-2xl font-display font-semibold text-ink tabular-nums leading-none">83%</p>
          </ContourGauge>
          <dl className="flex-1">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 py-2 border-t border-sand first:border-t-0">
                <dt className="text-xs text-ink-muted">{k}</dt>
                <dd className="text-base font-display font-semibold text-ink tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="text-[11px] text-ink-faint mt-3">Sample data</p>
      </div>
    </aside>
  );
}

export default function AuthPage({ onLogin }) {
  const { isLedger } = useTheme();
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

  // Show why the user landed back here when the API rejected a stale token,
  // instead of bouncing them to a blank login form with no explanation.
  useEffect(() => {
    const msg = sessionStorage.getItem('authMessage');
    if (msg) {
      setError(msg);
      sessionStorage.removeItem('authMessage');
    }
  }, []);

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

  const inputClass = "w-full bg-white border border-sand text-ink placeholder-ink-faint rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-ember transition-colors";

  return (
    <div className={`min-h-screen min-h-dvh bg-paper font-sans relative overflow-hidden ${isLedger ? 'lg:grid lg:grid-cols-[1.15fr_1fr]' : 'flex items-center justify-center p-4'}`}>
      <ContourBackdrop />
      <ThemeToggle showLabel className="absolute top-4 right-4 z-20 px-3 py-2 rounded-xl border border-sand bg-parchment" />

      {isLedger && <AuthPreview />}
      <div className={isLedger ? 'relative z-10 flex items-center justify-center p-4 min-h-screen min-h-dvh' : 'contents'}>
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <ContourMark size={40} className="text-ember mb-3" />
          <h1 className="text-2xl font-display font-semibold text-ink tracking-tight">StudySync</h1>
          <p className="text-sm text-ink-muted mt-1">Your semester, mapped</p>
        </div>

        {/* Card */}
        <div className="bg-parchment border border-sand rounded-2xl p-7 shadow-sm">
          <h2 className="text-base font-display font-semibold text-ink mb-5">
            {isLogin ? 'Sign in' : 'Create account'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
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
                  className={`w-full flex items-center gap-2 px-3 py-3 rounded-xl border text-xs font-medium transition-colors ${
                    isMentor
                      ? 'bg-trail-pale border-trail text-trail-dark'
                      : 'bg-white border-sand text-ink-muted hover:border-sand-dark'
                  }`}
                >
                  <Shield size={16} />
                  {isMentor ? 'Registering as Mentor' : 'Register as Mentor instead?'}
                </button>

                {/* Mentor-specific fields */}
                {isMentor && (
                  <div className="space-y-3 bg-map rounded-xl p-3 border border-sand">
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="text" placeholder="Mentor signup code" value={mentorSignupCode}
                        onChange={e => setMentorSignupCode(e.target.value)}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                      <input
                        type="text" placeholder="Department (optional)" value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="relative">
                      <BadgeCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
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
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="email" placeholder="Email" value={email}
                onChange={e => setEmail(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="password" placeholder="Password" value={password}
                onChange={e => setPassword(e.target.value)}
                className={inputClass}
                required
              />
            </div>

            {error && (
              <div className="anim-rise flex items-center gap-2 text-danger text-xs bg-danger-pale border border-danger/25 rounded-xl px-3 py-3">
                <AlertCircle size={16} className="flex-shrink-0" />{error}
              </div>
            )}
            {message && (
              <p className="anim-rise text-xs text-sage-dark bg-sage-pale border border-sage/30 rounded-xl px-3 py-3">{message}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-ember hover:bg-ember-dark disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors shadow-sm mt-1"
            >
              {loading ? 'Please wait…' : (isLogin ? 'Sign in' : 'Create account')}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted mt-5">
          {isLogin ? "Don't have an account?" : 'Already registered?'}{' '}
          <button onClick={() => { setIsLogin(v => !v); setError(''); setMessage(''); setIsMentor(false); }} className="text-ember-dark hover:text-ember font-medium transition-colors">
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
}
