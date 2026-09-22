import React, { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Eye, EyeOff, AlertCircle, Route as RouteIcon, CalendarClock, Share2, FlaskConical } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { errorMessage } from '../lib/api';
import { DEMO_ACCOUNT, SHOW_DEMO } from '../constants/demo';
import Logo from '../components/Logo';
import './Auth.css';

const FEATURES = [
  { icon: RouteIcon, text: 'Auto-optimized stop order' },
  { icon: CalendarClock, text: 'Day-by-day itinerary, built for you' },
  { icon: Share2, text: 'One link, shared instantly' },
];

// A tangled route resolving into a clean, numbered path — the product's whole pitch in one image.
const AuthArt = () => (
  <svg viewBox="0 0 440 300" className="auth-art" aria-hidden="true">
    <defs>
      <linearGradient id="routeGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--accent-hover)" />
        <stop offset="100%" stopColor="var(--accent)" />
      </linearGradient>
      <filter id="routeGlow" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* the tangle: an unoptimized, backtracking route */}
    <path
      className="auth-art-tangle"
      d="M40 150 C 10 110, 55 60, 95 90 C 130 118, 70 140, 95 175
         C 118 205, 165 175, 150 135 C 138 105, 100 100, 110 70"
      fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="3"
      strokeLinecap="round" strokeDasharray="1 7"
    />

    {/* the clean, optimized path the tangle resolves into */}
    <path
      className="auth-art-route"
      d="M110 70 C 170 40, 230 55, 260 100 S 330 190, 300 220 S 220 250, 360 190"
      fill="none" stroke="url(#routeGrad)" strokeWidth="3"
      strokeLinecap="round" strokeDasharray="2 10" filter="url(#routeGlow)"
    />

    {[[150, 62, '1'], [268, 96, '2'], [300, 220, '3']].map(([x, y, n]) => (
      <g key={n}>
        <circle cx={x} cy={y} r="17" fill="rgba(245,158,11,0.2)" />
        <circle cx={x} cy={y} r="11" fill="var(--accent)" />
        <text x={x} y={y + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a1204">{n}</text>
      </g>
    ))}

    {/* stop 4 — destination, arrived */}
    <g transform="translate(360 190)">
      <circle r="23" fill="rgba(245,158,11,0.2)" />
      <circle r="15" fill="var(--accent)" />
      <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1a1204">4</text>
    </g>
  </svg>
);

const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const { user, login, register } = useAuth();
  const { state } = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Once signed in, go back where the user came from (restoring that page's state).
  if (user) return <Navigate to={state?.from || '/plan'} replace state={state?.resumeState} />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isRegister) await register(name, email, password);
      else await login(email, password);
      toast.success(isRegister ? 'Account created' : 'Welcome back');
    } catch (err) {
      setError(errorMessage(err, 'Could not reach the server. Check that the backend is running.'));
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setShowPassword(true);
    setError('');
  };

  return (
    <div className="auth">
      <aside className="auth-brand">
        <div className="auth-brand-inner">
          <Logo />
          <AuthArt />
          <h1>Every stop, one smart route.<br />No backtracking, no wasted miles.</h1>
          <p className="auth-lede">Drop your stops in any order — Loopless finds the shortest path through all of them and turns it into a day you can actually follow.</p>
          <ul className="auth-features">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={15} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-logo"><Logo /></div>

          <div className="auth-tabs" role="tablist">
            <Link to="/" state={state} role="tab" aria-selected={!isRegister} className={!isRegister ? 'is-active' : ''}>Log in</Link>
            <Link to="/register" state={state} role="tab" aria-selected={isRegister} className={isRegister ? 'is-active' : ''}>Sign up</Link>
          </div>

          <h2>{isRegister ? 'Create your account' : 'Welcome back'}</h2>
          <p className="auth-sub">{isRegister ? 'Save trips and share them with a link.' : 'Sign in to continue planning your next route.'}</p>

          <form onSubmit={onSubmit} className="auth-form" noValidate={false}>
            {isRegister && (
              <label className="field">
                <span className="field-label">Name</span>
                <span className="input-wrap">
                  <User size={17} className="input-icon" />
                  <input className="input" value={name} maxLength={80} required autoComplete="name" placeholder="Your name" onChange={(e) => setName(e.target.value)} />
                </span>
              </label>
            )}

            <label className="field">
              <span className="field-label">Email</span>
              <span className="input-wrap">
                <Mail size={17} className="input-icon" />
                <input className="input" type="email" value={email} required autoComplete="email" placeholder="you@example.com" onChange={(e) => setEmail(e.target.value)} />
              </span>
            </label>

            <label className="field">
              <span className="field-label">Password</span>
              <span className="input-wrap">
                <Lock size={17} className="input-icon" />
                <input
                  className="input" type={showPassword ? 'text' : 'password'} value={password} required
                  minLength={isRegister ? 8 : undefined} maxLength={72}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'At least 8 characters' : 'Your password'}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" className="icon-btn input-action" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {error && (
              <div role="alert" className="alert alert-danger">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} /> {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
              {busy && <span className="spinner" />}
              {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
            </button>
          </form>

          {!isRegister && SHOW_DEMO && (
            <div className="auth-demo">
              <div className="auth-demo-divider"><span>or</span></div>
              <div className="auth-demo-card">
                <div className="auth-demo-icon"><FlaskConical size={16} /></div>
                <div className="auth-demo-text">
                  <strong>Try it instantly</strong>
                  <span>Explore Loopless with a pre-filled demo account.</span>
                </div>
                <button type="button" className="btn btn-secondary btn-sm btn-block" onClick={fillDemo}>
                  Continue with demo
                </button>
                <details className="auth-demo-creds">
                  <summary>Demo account credentials</summary>
                  <dl>
                    <div><dt>Email</dt><dd>{DEMO_ACCOUNT.email}</dd></div>
                    <div><dt>Password</dt><dd>{DEMO_ACCOUNT.password}</dd></div>
                  </dl>
                </details>
              </div>
            </div>
          )}

          <p className="auth-switch">
            {isRegister ? 'Already have an account? ' : 'New to Loopless? '}
            <Link to={isRegister ? '/' : '/register'} state={state}>{isRegister ? 'Log in' : 'Create an account'}</Link>
          </p>
        </div>

        <p className="auth-credit">Made by George Joseph · IIIT Lucknow</p>
      </main>
    </div>
  );
};

export default AuthPage;
